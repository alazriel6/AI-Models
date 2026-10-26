// ============================================================================
// Dual-Layer IndexedDB Storage Architecture
// Store 1: generation_logs (Routine History - Purgeable)
// Store 2: hardware_benchmarks (All-Time Records - Immutable & Protected)
// ============================================================================

import type {
  GenerationLog,
  HardwareBenchmarkRecord,
  FastestMilestone,
  SlowestMilestone,
} from '../types/comfyTelemetry';

const DB_NAME = 'ModelsGuide_ComfyTelemetry_v1';
const DB_VERSION = 1;
const STORE_LOGS = 'generation_logs';
const STORE_BENCHMARKS = 'hardware_benchmarks';

/**
 * Normalizes a raw GPU name into a consistent storage key.
 */
export function sanitizeHardwareKey(rawGpuName?: string): string {
  if (!rawGpuName) return 'generic_gpu';
  return rawGpuName
    .toLowerCase()
    .replace(/cuda:\d+\s*/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'default_device';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Routine generation logs (Purgeable)
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('status', 'status', { unique: false });
        logStore.createIndex('duration', 'duration', { unique: false });
        logStore.createIndex('promptId', 'promptId', { unique: false });
      }

      // 2. Hardware milestone benchmarks (Permanent & Protected)
      if (!db.objectStoreNames.contains(STORE_BENCHMARKS)) {
        db.createObjectStore(STORE_BENCHMARKS, { keyPath: 'hardwareKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a generation attempt into routine history, and automatically updates
 * all-time fastest and slowest benchmark records if milestones are beaten.
 */
export async function saveGenerationLog(
  log: GenerationLog
): Promise<{ isNewFastest: boolean; isNewSlowest: boolean }> {
  const db = await openDB();
  const hardwareKey = sanitizeHardwareKey(log.hardwareSnapshot?.gpuName);

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_LOGS, STORE_BENCHMARKS], 'readwrite');
    const logStore = tx.objectStore(STORE_LOGS);
    const benchStore = tx.objectStore(STORE_BENCHMARKS);

    let isNewFastest = false;
    let isNewSlowest = false;

    // 1. Put into generation_logs
    logStore.put(log);

    // 2. Check and update hardware_benchmarks
    const benchReq = benchStore.get(hardwareKey);

    benchReq.onsuccess = () => {
      const now = Date.now();
      let record: HardwareBenchmarkRecord = benchReq.result;

      if (!record) {
        record = {
          hardwareKey,
          gpuName: log.hardwareSnapshot?.gpuName || 'Unknown GPU',
          firstSeen: now,
          lastUpdated: now,
          totalGenerations: 0,
          totalSuccess: 0,
          totalErrors: 0,
          offloadCount: 0,
          oomCount: 0,
          modelSwapCount: 0,
          heavyPostProcessingCount: 0,
          fastestRecord: null,
          slowestRecord: null,
        };
      }

      record.lastUpdated = now;
      record.totalGenerations += 1;

      if (log.status === 'success') {
        record.totalSuccess += 1;

        // Check milestones for successful completed runs
        if (log.duration > 0) {
          // Fastest check (Lowest duration)
          if (!record.fastestRecord || log.duration < record.fastestRecord.duration) {
            const fastest: FastestMilestone = {
              duration: Number(log.duration.toFixed(2)),
              timestamp: log.timestamp,
              resolution: log.resolution,
              steps: log.totalSteps,
              sampler: log.sampler,
              timePerStep: log.timePerStep,
              hardwareState: {
                gpuName: log.hardwareSnapshot.gpuName,
                vramUsedGb: Number(log.hardwareSnapshot.vramUsedGb.toFixed(2)),
                vramTotalGb: Number(log.hardwareSnapshot.vramTotalGb.toFixed(2)),
              },
              promptId: log.promptId,
            };
            record.fastestRecord = fastest;
            isNewFastest = true;
          }

          // Slowest check (Highest duration)
          if (!record.slowestRecord || log.duration > record.slowestRecord.duration) {
            const rootCause = log.bottleneckDiagnosis
              ? `${log.bottleneckDiagnosis.tag}: ${log.bottleneckDiagnosis.explanation}`
              : 'Waktu proses di atas normal.';
            const slowest: SlowestMilestone = {
              duration: Number(log.duration.toFixed(2)),
              timestamp: log.timestamp,
              resolution: log.resolution,
              steps: log.totalSteps,
              sampler: log.sampler,
              bottleneckReason: rootCause,
              nodeType: log.bottleneckDiagnosis?.detectedNode,
              hardwareState: {
                gpuName: log.hardwareSnapshot.gpuName,
                vramUsedGb: Number(log.hardwareSnapshot.vramUsedGb.toFixed(2)),
                vramTotalGb: Number(log.hardwareSnapshot.vramTotalGb.toFixed(2)),
              },
              promptId: log.promptId,
            };
            record.slowestRecord = slowest;
            isNewSlowest = true;
          }
        }
      } else {
        record.totalErrors += 1;
        if (log.errorTranslation?.category === 'oom') {
          record.oomCount += 1;
        }
      }

      // Check bottleneck tags for cumulative analytics
      if (
        log.bottleneckDiagnosis?.tag === 'VRAM Offload Detected' ||
        log.bottleneckDiagnosis?.tag === 'DynamicVRAM / System RAM Offload' ||
        log.bottleneckDiagnosis?.title.includes('DynamicVRAM')
      ) {
        record.offloadCount += 1;
      } else if (log.bottleneckDiagnosis?.tag === 'Cold Start / Model Swap') {
        record.modelSwapCount += 1;
      }

      if (
        log.bottleneckDiagnosis?.tag === 'Heavy Post-Processing Node' ||
        log.bottleneckDiagnosis?.tag === 'Multi-Stage Heavy Pipeline' ||
        (log.postProcessingNodes && log.postProcessingNodes.length > 0)
      ) {
        record.heavyPostProcessingCount += 1;
      }

      benchStore.put(record);
    };

    tx.oncomplete = () => {
      resolve({ isNewFastest, isNewSlowest });
    };

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all prompt IDs currently logged in generation_logs.
 */
export async function getLoggedPromptIds(): Promise<Set<string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LOGS, 'readonly');
    const store = tx.objectStore(STORE_LOGS);
    const index = store.index('promptId');
    const request = index.getAllKeys();

    request.onsuccess = () => {
      const keys = (request.result || []) as string[];
      resolve(new Set(keys));
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all generation logs, sorted by timestamp descending.
 */
export async function getGenerationLogs(options?: {
  status?: 'all' | 'success' | 'error' | 'offload';
  limit?: number;
}): Promise<GenerationLog[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LOGS, 'readonly');
    const store = tx.objectStore(STORE_LOGS);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    const results: GenerationLog[] = [];

    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item = cursor.value as GenerationLog;
        let match = true;

        if (options?.status && options.status !== 'all') {
          if (options.status === 'success' && item.status !== 'success') match = false;
          if (options.status === 'error' && item.status !== 'error') match = false;
          if (
            options.status === 'offload' &&
            item.bottleneckDiagnosis?.tag !== 'VRAM Offload Detected'
          )
            match = false;
        }

        if (match) {
          results.push(item);
          if (options?.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }
        }

        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a single generation log from routine history.
 * Has ZERO effect on hardware benchmark records.
 */
export async function deleteGenerationLog(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_LOGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears ALL routine generation history.
 * STRICT ENFORCEMENT: Leaves hardware_benchmarks completely untouched!
 */
export async function clearAllGenerationLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_LOGS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves the permanent benchmark record for a specific hardware key.
 */
export async function getHardwareBenchmark(
  hardwareKey: string
): Promise<HardwareBenchmarkRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BENCHMARKS, 'readonly');
    const store = tx.objectStore(STORE_BENCHMARKS);
    const req = store.get(hardwareKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all hardware benchmark records.
 */
export async function getAllHardwareBenchmarks(): Promise<HardwareBenchmarkRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BENCHMARKS, 'readonly');
    const store = tx.objectStore(STORE_BENCHMARKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Calculates current IndexedDB record counts and estimated storage footprint.
 */
export async function getDatabaseStorageStats(): Promise<{
  logCount: number;
  benchmarkCount: number;
  sizeKb: number;
}> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_LOGS, STORE_BENCHMARKS], 'readonly');
    const logStore = tx.objectStore(STORE_LOGS);
    const benchStore = tx.objectStore(STORE_BENCHMARKS);

    const logCountReq = logStore.count();
    const benchCountReq = benchStore.count();
    const allLogsReq = logStore.getAll();

    tx.oncomplete = () => {
      const logs = allLogsReq.result || [];
      // Approximate JSON string byte size
      const stringified = JSON.stringify(logs);
      const sizeKb = Number((stringified.length / 1024).toFixed(1));

      resolve({
        logCount: logCountReq.result || 0,
        benchmarkCount: benchCountReq.result || 0,
        sizeKb: Math.max(1, sizeKb),
      });
    };

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Resets milestones for a specific hardware key (Protected Action).
 */
export async function resetBenchmarkMilestones(hardwareKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BENCHMARKS, 'readwrite');
    const store = tx.objectStore(STORE_BENCHMARKS);
    const req = store.get(hardwareKey);
    req.onsuccess = () => {
      const record: HardwareBenchmarkRecord = req.result;
      if (record) {
        record.fastestRecord = null;
        record.slowestRecord = null;
        record.offloadCount = 0;
        record.oomCount = 0;
        record.lastUpdated = Date.now();
        store.put(record);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
