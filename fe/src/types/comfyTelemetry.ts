// ============================================================================
// Types for ComfyUI Telemetry, Execution Logger & Hardware Benchmarks
// ============================================================================

export type ComfyConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'cors_error'
  | 'network_error';

export interface ComfyDeviceStats {
  name: string;
  type: string;
  index: number;
  vram_total: number;
  vram_free: number;
  torch_vram_total?: number;
  torch_vram_free?: number;
}

export interface ComfySystemResponse {
  system: {
    os?: string;
    ram_total?: number;
    ram_free?: number;
    comfyui_version?: string;
    python_version?: string;
    pytorch_version?: string;
    embedded_python?: boolean;
    argv?: string[];
  };
  devices: ComfyDeviceStats[];
}

export interface HardwareSnapshot {
  gpuName: string;
  vramTotalGb: number;
  vramUsedGb: number;
  vramFreeGb: number;
  vramPercent: number;
  ramTotalGb: number;
  ramUsedGb: number;
  ramFreeGb: number;
  ramPercent: number;
  os: string;
  envInfo: string;
}

export interface ErrorTranslation {
  category:
    | 'oom'
    | 'shape_mismatch'
    | 'missing_file'
    | 'nan_precision'
    | 'custom_node'
    | 'connection'
    | 'unknown';
  title: string;
  explanation: string;
  solution: string;
  rawError: string;
  nodeId?: string;
  nodeType?: string;
}

export interface BottleneckDiagnosis {
  tag:
    | 'VRAM Offload Detected'
    | 'DynamicVRAM / System RAM Offload'
    | 'Multi-Stage Heavy Pipeline'
    | 'Heavy Post-Processing Node'
    | 'Cold Start / Model Swap'
    | 'Optimal Speed';
  title: string;
  explanation: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  detectedNode?: string;
  details?: string;
}

export interface GenerationLog {
  id: string;
  timestamp: number;
  promptId: string;
  duration: number; // in seconds, e.g. 14.82 or 468.38
  timePerStep: string; // e.g. "4.25 it/s" or "9.93 s/it"
  secondsPerStep?: number;
  totalSteps: number;
  completedSteps: number;
  resolution: string; // e.g. "1024x1536"
  sampler: string; // e.g. "euler_ancestral"
  cfg?: number;
  activeLoras: string[];
  postProcessingNodes?: string[];
  modelName: string;
  status: 'success' | 'error';
  errorTranslation?: ErrorTranslation;
  bottleneckDiagnosis?: BottleneckDiagnosis;
  hardwareSnapshot: HardwareSnapshot;
}

export interface FastestMilestone {
  duration: number; // Lowest duration in seconds
  timestamp: number;
  resolution: string;
  steps: number;
  sampler: string;
  timePerStep: string;
  hardwareState: {
    gpuName: string;
    vramUsedGb: number;
    vramTotalGb: number;
  };
  promptId: string;
}

export interface SlowestMilestone {
  duration: number; // Highest duration in seconds
  timestamp: number;
  resolution: string;
  steps: number;
  sampler: string;
  bottleneckReason: string;
  nodeType?: string;
  hardwareState: {
    gpuName: string;
    vramUsedGb: number;
    vramTotalGb: number;
  };
  promptId: string;
}

export interface HardwareBenchmarkRecord {
  hardwareKey: string;
  gpuName: string;
  firstSeen: number;
  lastUpdated: number;
  totalGenerations: number;
  totalSuccess: number;
  totalErrors: number;
  offloadCount: number;
  oomCount: number;
  modelSwapCount: number;
  heavyPostProcessingCount: number;
  fastestRecord: FastestMilestone | null;
  slowestRecord: SlowestMilestone | null;
}

export interface LiveExecutionState {
  isActive: boolean;
  promptId: string | null;
  startTime: number | null;
  elapsedSeconds: number;
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  itPerSec: number | null;
  secPerIt?: number | null; // e.g. 9.93 s/it
  currentNodeId: string | null;
  currentNodeType: string | null;
  statusMessage: string;
}
