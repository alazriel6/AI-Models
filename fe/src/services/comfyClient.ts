// ============================================================================
// ComfyUI Client Manager & WebSocket Telemetry Tracker
// Connects to local ComfyUI (127.0.0.1:8188), polls /system_stats,
// tracks real-time execution events, polls /history for cross-tab execution,
// and diagnoses DynamicVRAM (comfy-aimdo) offloading.
// ============================================================================

import type {
  ComfyConnectionStatus,
  ComfySystemResponse,
  HardwareSnapshot,
  LiveExecutionState,
  GenerationLog,
} from '../types/comfyTelemetry';
import { translateComfyError } from '../utils/comfyErrorTranslator';
import { analyzeBottlenecks } from '../utils/comfyBottleneckAnalyzer';
import { saveGenerationLog, getLoggedPromptIds } from './comfyTelemetryDB';

const HOST_STORAGE_KEY = 'mg_comfy_host_port';
const DEFAULT_HOST = '127.0.0.1:8188';

export class ComfyClientManager {
  private static instance: ComfyClientManager;

  private host: string = DEFAULT_HOST;
  private ws: WebSocket | null = null;
  private clientId: string = '';
  private connectionStatus: ComfyConnectionStatus = 'disconnected';
  private hardwareSnapshot: HardwareSnapshot | null = null;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private historyPollIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Cross-tab tracking & queue awareness
  private prevQueueRemaining: number = 0;
  private knownPromptIds: Set<string> = new Set();
  private lastProgressTime: number | null = null;
  private lastProgressDeltaSec: number | null = null;

  // Real-time generation state tracking
  private liveState: LiveExecutionState = {
    isActive: false,
    promptId: null,
    startTime: null,
    elapsedSeconds: 0,
    currentStep: 0,
    totalSteps: 0,
    progressPercent: 0,
    itPerSec: null,
    secPerIt: null,
    currentNodeId: null,
    currentNodeType: null,
    statusMessage: 'Idle',
  };

  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private stepTimestamps: number[] = [];
  private nodeExecutionTimes: Record<string, { nodeType: string; durationMs: number }> = {};
  private activeNodeStart: number | null = null;
  private activeNodeType: string | null = null;
  private peakVramUsedBytes: number = 0;

  // Listeners
  private statusListeners = new Set<(status: ComfyConnectionStatus) => void>();
  private hardwareListeners = new Set<(hardware: HardwareSnapshot) => void>();
  private liveStateListeners = new Set<(state: LiveExecutionState) => void>();
  private logListeners = new Set<(log: GenerationLog, isFastest: boolean, isSlowest: boolean) => void>();

  private constructor() {
    this.clientId = 'mg_telemetry_' + Math.random().toString(36).substring(2, 9);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(HOST_STORAGE_KEY);
      if (stored) this.host = stored.trim();
    }
  }

  public static getInstance(): ComfyClientManager {
    if (!ComfyClientManager.instance) {
      ComfyClientManager.instance = new ComfyClientManager();
    }
    return ComfyClientManager.instance;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  public getHost(): string {
    return this.host;
  }

  public setHost(newHost: string) {
    const cleaned = newHost.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
    if (cleaned && cleaned !== this.host) {
      this.host = cleaned;
      if (typeof window !== 'undefined') {
        localStorage.setItem(HOST_STORAGE_KEY, cleaned);
      }
      this.reconnect();
    }
  }

  public getHttpUrl(path: string = ''): string {
    return `http://${this.host}${path}`;
  }

  public getWsUrl(): string {
    return `ws://${this.host}/ws?clientId=${this.clientId}`;
  }

  // --------------------------------------------------------------------------
  // Connection Management & Polling
  // --------------------------------------------------------------------------

  public connect(): void {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }

    this.updateStatus('connecting');
    this.initKnownPromptIds().catch(() => {});

    this.fetchSystemStats()
      .then(() => {
        this.initWebSocket();
        this.startStatsPolling();
        this.startHistoryPolling();
        // Initial sync of existing ComfyUI history
        this.syncFromHistory(10).catch(() => {});
      })
      .catch((err) => {
        console.warn('[ComfyClient] Direct REST fetch failed:', err);
        this.attemptProxyFallback();
      });
  }

  public disconnect(): void {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    if (this.historyPollIntervalId) clearInterval(this.historyPollIntervalId);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  public reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 300);
  }

  private async initKnownPromptIds(): Promise<void> {
    try {
      const ids = await getLoggedPromptIds();
      ids.forEach((id) => this.knownPromptIds.add(id));
    } catch {
      // IndexedDB initialization fallback
    }
  }

  private startStatsPolling(): void {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    this.pollIntervalId = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.fetchSystemStats().catch(() => {});
      }
    }, 4000);
  }

  private startHistoryPolling(): void {
    if (this.historyPollIntervalId) clearInterval(this.historyPollIntervalId);
    // Poll ComfyUI /history every 3 seconds to capture generations from other browser tabs
    this.historyPollIntervalId = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.syncFromHistory(10).catch(() => {});
      }
    }, 3000);
  }

  private async fetchSystemStats(): Promise<HardwareSnapshot> {
    const url = this.getHttpUrl('/system_stats');
    let response: Response;

    try {
      response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    } catch (directErr) {
      throw directErr;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ComfySystemResponse = await response.json();
    return this.parseSystemStats(data);
  }

  private async attemptProxyFallback(): Promise<void> {
    try {
      const proxyUrl = '/comfy-proxy/system_stats';
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data: ComfySystemResponse = await res.json();
        this.parseSystemStats(data);
        this.initWebSocket();
        this.startStatsPolling();
        this.startHistoryPolling();
        this.syncFromHistory(10).catch(() => {});
        return;
      }
    } catch {
      // proxy failed
    }

    this.updateStatus('cors_error');
  }

  private parseSystemStats(data: ComfySystemResponse): HardwareSnapshot {
    const dev = data.devices?.[0];
    const sys = data.system || {};

    const vramTotalBytes = dev?.vram_total || 0;
    const vramFreeBytes = dev?.vram_free || 0;
    const vramUsedBytes = Math.max(0, vramTotalBytes - vramFreeBytes);

    if (vramUsedBytes > this.peakVramUsedBytes) {
      this.peakVramUsedBytes = vramUsedBytes;
    }

    const ramTotalBytes = sys.ram_total || 0;
    const ramFreeBytes = sys.ram_free || 0;
    const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);

    const BYTES_TO_GB = 1024 * 1024 * 1024;
    const vramTotalGb = Number((vramTotalBytes / BYTES_TO_GB).toFixed(2));
    const vramUsedGb = Number((vramUsedBytes / BYTES_TO_GB).toFixed(2));
    const vramFreeGb = Number((vramFreeBytes / BYTES_TO_GB).toFixed(2));
    const vramPercent = vramTotalBytes > 0 ? Number(((vramUsedBytes / vramTotalBytes) * 100).toFixed(1)) : 0;

    const ramTotalGb = Number((ramTotalBytes / BYTES_TO_GB).toFixed(2));
    const ramUsedGb = Number((ramUsedBytes / BYTES_TO_GB).toFixed(2));
    const ramFreeGb = Number((ramFreeBytes / BYTES_TO_GB).toFixed(2));
    const ramPercent = ramTotalBytes > 0 ? Number(((ramUsedBytes / ramTotalBytes) * 100).toFixed(1)) : 0;

    let gpuName = dev?.name || 'CUDA GPU';
    gpuName = gpuName.replace(/cuda:\d+\s*/i, '').replace(/:\s*cudaMallocAsync/i, '').trim();

    const osLabel = sys.os === 'win32' || sys.os === 'nt' ? 'Windows' : sys.os || 'Linux';
    const pyVer = sys.python_version ? sys.python_version.split(' ')[0] : 'Python 3';
    const torchVer = sys.pytorch_version || 'PyTorch';
    const comfyVer = sys.comfyui_version ? `v${sys.comfyui_version}` : '';

    const snapshot: HardwareSnapshot = {
      gpuName,
      vramTotalGb,
      vramUsedGb,
      vramFreeGb,
      vramPercent,
      ramTotalGb,
      ramUsedGb,
      ramFreeGb,
      ramPercent,
      os: `${osLabel} (${pyVer})`,
      envInfo: `${torchVer} ${comfyVer}`.trim(),
    };

    this.hardwareSnapshot = snapshot;
    this.hardwareListeners.forEach((fn) => fn(snapshot));
    return snapshot;
  }

  // --------------------------------------------------------------------------
  // WebSocket Manager & Hybrid Listener
  // --------------------------------------------------------------------------

  private initWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    try {
      const wsUrl = this.getWsUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.updateStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const parsed = JSON.parse(event.data);
            this.handleWsEvent(parsed);
          }
        } catch (e) {
          console.debug('[ComfyClient] Non-JSON message received:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[ComfyClient] WebSocket error:', err);
      };

      ws.onclose = () => {
        if (this.connectionStatus === 'connected') {
          this.updateStatus('network_error');
          this.reconnectTimeoutId = setTimeout(() => this.connect(), 4000);
        }
      };

      this.ws = ws;
    } catch {
      this.updateStatus('network_error');
    }
  }

  // --------------------------------------------------------------------------
  // Real-Time Event Dispatcher
  // --------------------------------------------------------------------------

  private handleWsEvent(msg: { type: string; data: Record<string, unknown> }): void {
    const { type, data } = msg;

    switch (type) {
      case 'execution_start': {
        const promptId = (data.prompt_id as string) || `prompt_${Date.now()}`;
        this.startExecutionTracking(promptId);
        break;
      }

      case 'executing': {
        const nodeId = data.node as string | null;
        const promptId = data.prompt_id as string;

        if (nodeId === null) {
          // Execution finished (either this client or another tab)!
          if (this.liveState.isActive) {
            this.finishExecutionTracking('success');
          }
          // Immediately sync history to capture cross-tab prompt completion
          this.syncFromHistory(5).catch(() => {});
        } else {
          if (!this.liveState.isActive && promptId) {
            this.startExecutionTracking(promptId);
          }
          this.recordNodeSwitch(nodeId);
        }
        break;
      }

      case 'progress': {
        const value = Number(data.value) || 0;
        const max = Number(data.max) || 1;
        const promptId = (data.prompt_id as string) || this.liveState.promptId;
        const nodeId = data.node as string;

        if (!this.liveState.isActive && promptId) {
          this.startExecutionTracking(promptId);
        }

        this.updateProgress(value, max, nodeId);
        break;
      }

      case 'execution_error': {
        const nodeId = (data.node_id as string) || '';
        const nodeType = (data.node_type as string) || '';
        const exceptionMsg = (data.exception_message as string) || '';
        const exceptionType = (data.exception_type as string) || '';

        const fullRaw = `${exceptionType}: ${exceptionMsg}\n${JSON.stringify(data.traceback || '', null, 2)}`;
        const translated = translateComfyError(fullRaw, exceptionType, nodeType, nodeId);

        this.finishExecutionTracking('error', translated);
        // Also sync history
        this.syncFromHistory(5).catch(() => {});
        break;
      }

      case 'status': {
        // Track queue_remaining transition: if queue was > 0 and now 0, generations finished!
        const execInfo = (data?.status as Record<string, any>)?.exec_info;
        const queueRemaining = Number(execInfo?.queue_remaining ?? 0);

        if (this.prevQueueRemaining > 0 && queueRemaining === 0) {
          this.syncFromHistory(5).catch(() => {});
        }
        this.prevQueueRemaining = queueRemaining;
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Execution Timers & Calculations
  // --------------------------------------------------------------------------

  private startExecutionTracking(promptId: string): void {
    const now = Date.now();
    this.stepTimestamps = [now];
    this.nodeExecutionTimes = {};
    this.activeNodeStart = now;
    this.activeNodeType = 'Pipeline Setup';
    this.peakVramUsedBytes = 0;
    this.lastProgressTime = null;
    this.lastProgressDeltaSec = null;

    this.fetchSystemStats().catch(() => {});

    this.liveState = {
      isActive: true,
      promptId,
      startTime: now,
      elapsedSeconds: 0,
      currentStep: 0,
      totalSteps: 0,
      progressPercent: 0,
      itPerSec: null,
      secPerIt: null,
      currentNodeId: null,
      currentNodeType: 'Memulai eksekusi...',
      statusMessage: 'Memproses node pipeline...',
    };
    this.emitLiveState();

    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = setInterval(() => {
      if (this.liveState.isActive && this.liveState.startTime) {
        const elapsed = (Date.now() - this.liveState.startTime) / 1000;
        this.liveState.elapsedSeconds = Number(elapsed.toFixed(2));
        this.emitLiveState();
      }
    }, 200);
  }

  private recordNodeSwitch(nodeId: string, nodeType?: string): void {
    const now = Date.now();
    if (this.activeNodeStart && this.activeNodeType) {
      const prevKey = this.activeNodeType;
      const duration = now - this.activeNodeStart;
      if (!this.nodeExecutionTimes[prevKey]) {
        this.nodeExecutionTimes[prevKey] = { nodeType: this.activeNodeType, durationMs: 0 };
      }
      this.nodeExecutionTimes[prevKey].durationMs += duration;
    }

    this.activeNodeStart = now;
    this.activeNodeType = nodeType || `Node #${nodeId}`;
    this.liveState.currentNodeId = nodeId;
    this.liveState.currentNodeType = this.activeNodeType;
    this.liveState.statusMessage = `Mengeksekusi ${this.activeNodeType}`;
    this.emitLiveState();
  }

  private updateProgress(value: number, max: number, nodeId?: string): void {
    const now = Date.now();

    // Measure delta between progress ticks for precise Step Speed (s/it)
    if (this.lastProgressTime) {
      const deltaMs = now - this.lastProgressTime;
      if (deltaMs > 30) {
        this.lastProgressDeltaSec = Number((deltaMs / 1000).toFixed(2));
      }
    }
    this.lastProgressTime = now;

    this.stepTimestamps.push(now);
    if (this.stepTimestamps.length > 30) this.stepTimestamps.shift();

    let itPerSec: number | null = null;
    let secPerIt: number | null = this.lastProgressDeltaSec;

    if (this.stepTimestamps.length >= 2) {
      const first = this.stepTimestamps[0];
      const deltaSec = (now - first) / 1000;
      const stepsInWindow = this.stepTimestamps.length - 1;
      if (deltaSec > 0.05 && stepsInWindow > 0) {
        itPerSec = Number((stepsInWindow / deltaSec).toFixed(2));
        secPerIt = Number((deltaSec / stepsInWindow).toFixed(2));
      }
    }

    const pct = Math.min(100, Math.round((value / max) * 100));
    this.liveState.currentStep = value;
    this.liveState.totalSteps = max;
    this.liveState.progressPercent = pct;
    this.liveState.itPerSec = itPerSec;
    this.liveState.secPerIt = secPerIt;
    if (nodeId) this.liveState.currentNodeId = nodeId;

    const speedLabel = secPerIt && secPerIt >= 1.0 ? `${secPerIt.toFixed(2)} s/it` : `${itPerSec || 0} it/s`;
    this.liveState.statusMessage = `Sampling Step ${value} / ${max} (${speedLabel})`;
    this.emitLiveState();
  }

  private async finishExecutionTracking(
    status: 'success' | 'error',
    errorTranslation?: ReturnType<typeof translateComfyError>
  ): Promise<void> {
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = null;

    const now = Date.now();
    const duration = this.liveState.startTime
      ? Number(((now - this.liveState.startTime) / 1000).toFixed(2))
      : 0;

    if (this.activeNodeStart && this.activeNodeType) {
      const durationMs = now - this.activeNodeStart;
      if (!this.nodeExecutionTimes[this.activeNodeType]) {
        this.nodeExecutionTimes[this.activeNodeType] = {
          nodeType: this.activeNodeType,
          durationMs: 0,
        };
      }
      this.nodeExecutionTimes[this.activeNodeType].durationMs += durationMs;
    }

    const steps = this.liveState.totalSteps || this.liveState.currentStep || 20;
    const completedSteps = this.liveState.currentStep || steps;
    const secondsPerStep =
      completedSteps > 0 && duration > 0 ? Number((duration / completedSteps).toFixed(2)) : 0;

    let timePerStepStr = '0.00 it/s';
    if (secondsPerStep >= 1.0) {
      timePerStepStr = `${secondsPerStep.toFixed(2)} s/it`;
    } else if (duration > 0 && completedSteps > 0) {
      timePerStepStr = `${(completedSteps / duration).toFixed(2)} it/s`;
    }

    const hw = this.hardwareSnapshot || {
      gpuName: 'Local GPU',
      vramTotalGb: 6,
      vramUsedGb: 3.5,
      vramFreeGb: 2.5,
      vramPercent: 58.3,
      ramTotalGb: 16,
      ramUsedGb: 10,
      ramFreeGb: 6,
      ramPercent: 62.5,
      os: 'Windows 11',
      envInfo: 'PyTorch CUDA',
    };

    let slowestNodeName: string | undefined;
    let maxNodeDuration = 0;
    Object.values(this.nodeExecutionTimes).forEach((n) => {
      if (n.durationMs > maxNodeDuration) {
        maxNodeDuration = n.durationMs;
        slowestNodeName = n.nodeType;
      }
    });

    const bottleneckDiagnosis = analyzeBottlenecks({
      durationSeconds: duration,
      totalSteps: steps,
      secondsPerStep,
      hardwareSnapshot: hw,
      nodeExecutionTimes: this.nodeExecutionTimes,
      slowestNodeType: slowestNodeName,
    });

    const promptId = this.liveState.promptId || `gen_${now}`;
    const logEntry: GenerationLog = {
      id: `log_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      promptId,
      duration,
      timePerStep: timePerStepStr,
      secondsPerStep,
      totalSteps: steps,
      completedSteps,
      resolution: '1024x1024',
      sampler: 'euler_ancestral / karras',
      activeLoras: [],
      modelName: 'ComfyUI Workflow Model',
      status,
      errorTranslation,
      bottleneckDiagnosis,
      hardwareSnapshot: hw,
    };

    try {
      const { isNewFastest, isNewSlowest } = await saveGenerationLog(logEntry);
      this.knownPromptIds.add(promptId);
      this.logListeners.forEach((fn) => fn(logEntry, isNewFastest, isNewSlowest));
    } catch (dbErr) {
      console.error('[ComfyClient] Failed to persist log in IndexedDB:', dbErr);
    }

    this.liveState = {
      isActive: false,
      promptId: null,
      startTime: null,
      elapsedSeconds: duration,
      currentStep: 0,
      totalSteps: 0,
      progressPercent: 0,
      itPerSec: null,
      secPerIt: null,
      currentNodeId: null,
      currentNodeType: null,
      statusMessage: status === 'success' ? 'Selesai' : 'Gagal',
    };
    this.emitLiveState();
  }

  // --------------------------------------------------------------------------
  // /history Synchronization (Cross-Tab Execution Capture)
  // --------------------------------------------------------------------------

  public async syncFromHistory(maxItems: number = 10): Promise<number> {
    if (this.knownPromptIds.size === 0) {
      const existing = await getLoggedPromptIds();
      existing.forEach((id) => this.knownPromptIds.add(id));
    }

    let rawHistory: Record<string, any> | null = null;
    const url = this.getHttpUrl(`/history?max_items=${maxItems}`);

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        rawHistory = await res.json();
      }
    } catch {
      // Proxy fallback if direct fetch blocked by CORS in dev mode
      try {
        const proxyRes = await fetch(`/comfy-proxy/history?max_items=${maxItems}`);
        if (proxyRes.ok) {
          rawHistory = await proxyRes.json();
        }
      } catch {
        // Unable to reach
      }
    }

    if (!rawHistory || typeof rawHistory !== 'object') {
      return 0;
    }

    let newCount = 0;
    const entries = Object.entries(rawHistory);

    for (const [promptId, item] of entries) {
      if (!promptId || this.knownPromptIds.has(promptId)) {
        continue;
      }

      const statusObj = item.status || {};
      const statusStr = statusObj.status_str || 'success';
      const isCompleted = statusObj.completed !== false;
      const messages: [string, any][] = statusObj.messages || [];

      // Extract exact start & end timestamp from messages
      let startTimeMs: number | null = null;
      let endTimeMs: number | null = null;
      let executionErrorMsg: string | null = null;
      let exceptionType: string | undefined;
      let errorNodeType: string | undefined;
      let errorNodeId: string | undefined;

      for (const msg of messages) {
        if (!Array.isArray(msg) || msg.length < 2) continue;
        const msgType = msg[0];
        const msgData = msg[1] || {};

        if (msgType === 'execution_start' && typeof msgData.timestamp === 'number') {
          startTimeMs = msgData.timestamp;
        } else if (msgType === 'execution_success' && typeof msgData.timestamp === 'number') {
          endTimeMs = msgData.timestamp;
        } else if (msgType === 'execution_interrupted') {
          if (typeof msgData.timestamp === 'number') endTimeMs = msgData.timestamp;
          executionErrorMsg = `Generasi dibatalkan / interrupted pada node ${msgData.node_type || 'Pipeline'}.`;
          exceptionType = 'ExecutionInterrupted';
          errorNodeType = msgData.node_type || '';
          errorNodeId = msgData.node_id || '';
        } else if (msgType === 'execution_error') {
          if (typeof msgData.timestamp === 'number') endTimeMs = msgData.timestamp;
          executionErrorMsg = msgData.exception_message || '';
          exceptionType = msgData.exception_type || '';
          errorNodeType = msgData.node_type || '';
          errorNodeId = msgData.node_id || '';
        }
      }

      // Compute exact total duration in seconds (e.g. 468.38s)
      let durationSeconds = 0;
      let recordTimestamp = Date.now();

      if (startTimeMs && endTimeMs && endTimeMs >= startTimeMs) {
        durationSeconds = Number(((endTimeMs - startTimeMs) / 1000).toFixed(2));
        recordTimestamp = endTimeMs;
      } else if (startTimeMs && !endTimeMs) {
        durationSeconds = Math.max(0, Number(((Date.now() - startTimeMs) / 1000).toFixed(2)));
      }

      // Parse workflow node graph from item.prompt[2]
      const nodes: Record<string, any> = (item.prompt && item.prompt[2]) || {};
      let modelName = 'SDXL Checkpoint';
      let resolution = '1024x1024';
      let sampler = 'euler_ancestral / normal';
      let cfg: number | undefined;
      let totalSteps = 0;
      const activeLoras: string[] = [];
      const postProcessingNodes: string[] = [];
      let hasFaceDetailer = false;
      let hasUltimateUpscale = false;

      for (const [, node] of Object.entries(nodes)) {
        const classType = String(node.class_type || '');
        const inputs = node.inputs || {};

        // Checkpoint / Model Name
        if (inputs.ckpt_name) {
          modelName = String(inputs.ckpt_name).split(/[\/\\]/).pop() || inputs.ckpt_name;
        } else if (inputs.unet_name && modelName === 'SDXL Checkpoint') {
          modelName = String(inputs.unet_name).split(/[\/\\]/).pop() || inputs.unet_name;
        }

        // Resolution
        if (classType === 'EmptyLatentImage' || (inputs.width && inputs.height)) {
          if (inputs.width && inputs.height) {
            resolution = `${inputs.width}x${inputs.height}`;
          }
        }

        // Steps & Sampler & CFG
        if (inputs.steps) {
          const stepVal = Number(inputs.steps) || 0;
          totalSteps += stepVal;
        }

        if (inputs.sampler_name) {
          const sName = String(inputs.sampler_name);
          const sched = inputs.scheduler ? String(inputs.scheduler) : 'normal';
          sampler = `${sName} / ${sched}`;
        }

        if (inputs.cfg !== undefined) {
          cfg = Number(inputs.cfg);
        }

        // Active LoRAs
        if (inputs.lora_name) {
          const loraClean = String(inputs.lora_name).split(/[\/\\]/).pop() || inputs.lora_name;
          if (!activeLoras.includes(loraClean)) {
            activeLoras.push(loraClean);
          }
        }

        // Post-Processing Nodes
        if (/FaceDetailer/i.test(classType)) {
          hasFaceDetailer = true;
          if (!postProcessingNodes.includes('FaceDetailer')) postProcessingNodes.push('FaceDetailer');
        } else if (/UltimateSDUpscale/i.test(classType)) {
          hasUltimateUpscale = true;
          if (!postProcessingNodes.includes('UltimateSDUpscale')) postProcessingNodes.push('UltimateSDUpscale');
        } else if (/Upscale|Detailer|ImpactWildcard/i.test(classType)) {
          if (!postProcessingNodes.includes(classType)) postProcessingNodes.push(classType);
        }
      }

      if (totalSteps === 0) totalSteps = 20;

      // Calculate Step Speed (s/it or it/s)
      const secondsPerStep =
        totalSteps > 0 && durationSeconds > 0
          ? Number((durationSeconds / totalSteps).toFixed(2))
          : 0;

      let timePerStepStr = '0.00 it/s';
      if (secondsPerStep >= 1.0) {
        timePerStepStr = `${secondsPerStep.toFixed(2)} s/it`;
      } else if (durationSeconds > 0 && totalSteps > 0) {
        timePerStepStr = `${(totalSteps / durationSeconds).toFixed(2)} it/s`;
      }

      const isSuccess = statusStr === 'success' && isCompleted;
      const status: 'success' | 'error' = isSuccess ? 'success' : 'error';

      // Error translation if failed
      let errorTranslation = undefined;
      if (!isSuccess) {
        const rawErr = executionErrorMsg || `ComfyUI execution error on prompt ${promptId}`;
        errorTranslation = translateComfyError(rawErr, exceptionType, errorNodeType, errorNodeId);
      }

      // Hardware snapshot
      const hw = this.hardwareSnapshot || {
        gpuName: 'Local GPU',
        vramTotalGb: 6,
        vramUsedGb: 3.5,
        vramFreeGb: 2.5,
        vramPercent: 58.3,
        ramTotalGb: 16,
        ramUsedGb: 10,
        ramFreeGb: 6,
        ramPercent: 62.5,
        os: 'Windows 11',
        envInfo: 'PyTorch CUDA',
      };

      // Run smarter bottleneck diagnostics
      const bottleneckDiagnosis = analyzeBottlenecks({
        durationSeconds,
        totalSteps,
        secondsPerStep,
        hardwareSnapshot: hw,
        hasFaceDetailer,
        hasUltimateUpscale,
        activePostProcessingNodes: postProcessingNodes,
        slowestNodeType: hasFaceDetailer
          ? 'FaceDetailer'
          : hasUltimateUpscale
          ? 'UltimateSDUpscale'
          : undefined,
      });

      const logEntry: GenerationLog = {
        id: `log_${recordTimestamp}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: recordTimestamp,
        promptId,
        duration: durationSeconds,
        timePerStep: timePerStepStr,
        secondsPerStep,
        totalSteps,
        completedSteps: totalSteps,
        resolution,
        sampler,
        cfg,
        activeLoras,
        postProcessingNodes,
        modelName,
        status,
        errorTranslation,
        bottleneckDiagnosis,
        hardwareSnapshot: hw,
      };

      try {
        const { isNewFastest, isNewSlowest } = await saveGenerationLog(logEntry);
        this.knownPromptIds.add(promptId);
        newCount++;
        this.logListeners.forEach((fn) => fn(logEntry, isNewFastest, isNewSlowest));
      } catch (err) {
        console.error('[ComfyClient] Failed to save synced history log:', err);
      }
    }

    return newCount;
  }

  // --------------------------------------------------------------------------
  // Simulation Engine (For Quick QA Testing & Demonstration)
  // --------------------------------------------------------------------------

  public async simulateRun(scenario: 'normal' | 'offload' | 'oom' | 'shape_mismatch'): Promise<void> {
    const promptId = `sim_${scenario}_${Date.now()}`;
    this.startExecutionTracking(promptId);

    const steps = scenario === 'oom' ? 8 : 25;
    const stepDelay = scenario === 'offload' ? 220 : 60;

    if (scenario === 'offload' && this.hardwareSnapshot) {
      this.hardwareSnapshot.ramPercent = 91.2;
      this.hardwareSnapshot.ramUsedGb = 14.6;
    }

    this.recordNodeSwitch('1', 'CheckpointLoaderSimple');
    await new Promise((r) => setTimeout(r, 200));

    this.recordNodeSwitch('3', 'KSampler');

    for (let s = 1; s <= steps; s++) {
      await new Promise((r) => setTimeout(r, stepDelay));
      this.updateProgress(s, 25, '3');

      if (scenario === 'oom' && s === 7) {
        const fullRaw =
          'torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.40 GiB (GPU 0; 6.00 GiB total capacity; 5.82 GiB already allocated; 12.00 MiB free; 5.88 GiB reserved in total by PyTorch)';
        const translated = translateComfyError(fullRaw, 'OutOfMemoryError', 'KSampler', '3');
        await this.finishExecutionTracking('error', translated);
        return;
      }

      if (scenario === 'shape_mismatch' && s === 2) {
        const fullRaw =
          'RuntimeError: mat1 and mat2 shapes cannot be multiplied (2x768 and 1024x1024) in Linear layer for LoRA LoRA_SD15_Detailer.safetensors';
        const translated = translateComfyError(fullRaw, 'RuntimeError', 'LoraLoader', '2');
        await this.finishExecutionTracking('error', translated);
        return;
      }
    }

    if (scenario === 'offload') {
      this.recordNodeSwitch('23', 'FaceDetailer');
      await new Promise((r) => setTimeout(r, 1200));
    }

    this.recordNodeSwitch('8', 'VAEDecode');
    await new Promise((r) => setTimeout(r, 250));

    await this.finishExecutionTracking('success');
  }

  // --------------------------------------------------------------------------
  // Subscriptions & Getters
  // --------------------------------------------------------------------------

  public getStatus(): ComfyConnectionStatus {
    return this.connectionStatus;
  }

  public getHardwareSnapshot(): HardwareSnapshot | null {
    return this.hardwareSnapshot;
  }

  public getLiveState(): LiveExecutionState {
    return this.liveState;
  }

  public onStatusChange(fn: (status: ComfyConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.connectionStatus);
    return () => this.statusListeners.delete(fn);
  }

  public onHardwareUpdate(fn: (snapshot: HardwareSnapshot) => void): () => void {
    this.hardwareListeners.add(fn);
    if (this.hardwareSnapshot) fn(this.hardwareSnapshot);
    return () => this.hardwareListeners.delete(fn);
  }

  public onLiveStateChange(fn: (state: LiveExecutionState) => void): () => void {
    this.liveStateListeners.add(fn);
    fn(this.liveState);
    return () => this.liveStateListeners.delete(fn);
  }

  public onGenerationComplete(
    fn: (log: GenerationLog, isFastest: boolean, isSlowest: boolean) => void
  ): () => void {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }

  private updateStatus(newStatus: ComfyConnectionStatus): void {
    if (this.connectionStatus !== newStatus) {
      this.connectionStatus = newStatus;
      this.statusListeners.forEach((fn) => fn(newStatus));
    }
  }

  private emitLiveState(): void {
    const copy = { ...this.liveState };
    this.liveStateListeners.forEach((fn) => fn(copy));
  }
}

export const comfyClient = ComfyClientManager.getInstance();
