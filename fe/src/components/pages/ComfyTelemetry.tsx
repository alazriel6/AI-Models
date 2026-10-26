import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { comfyClient } from '../../services/comfyClient';
import {
  getGenerationLogs,
  getHardwareBenchmark,
  getAllHardwareBenchmarks,
  deleteGenerationLog,
  clearAllGenerationLogs,
  getDatabaseStorageStats,
  sanitizeHardwareKey,
} from '../../services/comfyTelemetryDB';
import type {
  ComfyConnectionStatus,
  HardwareSnapshot,
  LiveExecutionState,
  GenerationLog,
  HardwareBenchmarkRecord,
} from '../../types/comfyTelemetry';
import '../../style/ComfyTelemetry.css';

export default function ComfyTelemetry(): React.JSX.Element {
  const [connectionStatus, setConnectionStatus] = useState<ComfyConnectionStatus>(
    comfyClient.getStatus()
  );
  const [hardware, setHardware] = useState<HardwareSnapshot | null>(
    comfyClient.getHardwareSnapshot()
  );
  const [liveState, setLiveState] = useState<LiveExecutionState>(comfyClient.getLiveState());
  const [hostInput, setHostInput] = useState<string>(comfyClient.getHost());
  const [benchmarkRecord, setBenchmarkRecord] = useState<HardwareBenchmarkRecord | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'offload'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storageStats, setStorageStats] = useState<{
    logCount: number;
    benchmarkCount: number;
    sizeKb: number;
  }>({ logCount: 0, benchmarkCount: 0, sizeKb: 0 });
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Refresh DB data
  const refreshData = useCallback(async (hwSnapshot?: HardwareSnapshot | null) => {
    try {
      const currentHw = hwSnapshot || hardware;
      const hwKey = sanitizeHardwareKey(currentHw?.gpuName);

      const [logsData, benchData, statsData] = await Promise.all([
        getGenerationLogs(),
        getHardwareBenchmark(hwKey),
        getDatabaseStorageStats(),
      ]);

      setLogs(logsData);

      if (benchData) {
        setBenchmarkRecord(benchData);
      } else {
        const all = await getAllHardwareBenchmarks();
        if (all.length > 0) setBenchmarkRecord(all[0]);
      }

      setStorageStats(statsData);
    } catch (e) {
      console.error('[ComfyTelemetry] Error refreshing database:', e);
    }
  }, [hardware]);

  // Connect & listen to comfyClient events
  useEffect(() => {
    comfyClient.connect();

    const unsubStatus = comfyClient.onStatusChange((st) => {
      setConnectionStatus(st);
    });

    const unsubHardware = comfyClient.onHardwareUpdate((hw) => {
      setHardware(hw);
      refreshData(hw);
    });

    const unsubLive = comfyClient.onLiveStateChange((ls) => {
      setLiveState(ls);
    });

    const unsubLog = comfyClient.onGenerationComplete(() => {
      refreshData();
    });

    refreshData();

    return () => {
      unsubStatus();
      unsubHardware();
      unsubLive();
      unsubLog();
    };
  }, [refreshData]);

  // Handlers
  const handleConnectToggle = () => {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      comfyClient.disconnect();
    } else {
      comfyClient.setHost(hostInput);
      comfyClient.connect();
    }
  };

  const handleHostBlur = () => {
    if (hostInput.trim() && hostInput.trim() !== comfyClient.getHost()) {
      comfyClient.setHost(hostInput);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteGenerationLog(id);
      await refreshData();
    } catch (e) {
      console.error('Failed to delete log:', e);
    }
  };

  const handleClearAllHistory = async () => {
    setIsClearing(true);
    try {
      await clearAllGenerationLogs();
      await refreshData();
      setShowClearModal(false);
    } catch (e) {
      console.error('Failed to clear logs:', e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSyncHistory = async () => {
    setIsSyncing(true);
    try {
      const count = await comfyClient.syncFromHistory(20);
      await refreshData();
      setSyncToast(
        count > 0
          ? `Berhasil menyinkronkan ${count} generasi baru dari sesi ComfyUI!`
          : 'Semua riwayat generasi dari sesi ComfyUI sudah tersinkronkan.'
      );
      setTimeout(() => setSyncToast(null), 4000);
    } catch (e) {
      console.error('Failed to sync history:', e);
      setSyncToast('Gagal menyinkronkan riwayat dari ComfyUI.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulate = async (scenario: 'normal' | 'offload' | 'oom' | 'shape_mismatch') => {
    if (simRunning || liveState.isActive) return;
    setSimRunning(true);
    try {
      await comfyClient.simulateRun(scenario);
      await refreshData();
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setSimRunning(false);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filter === 'success' && log.status !== 'success') return false;
      if (filter === 'error' && log.status !== 'error') return false;
      if (filter === 'offload' && log.bottleneckDiagnosis?.tag !== 'VRAM Offload Detected') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inPrompt = log.promptId.toLowerCase().includes(q);
        const inModel = (log.modelName || '').toLowerCase().includes(q);
        const inSampler = (log.sampler || '').toLowerCase().includes(q);
        const inError = (log.errorTranslation?.title || '').toLowerCase().includes(q);
        const inDiagnosis = (log.bottleneckDiagnosis?.title || '').toLowerCase().includes(q);
        if (!inPrompt && !inModel && !inSampler && !inError && !inDiagnosis) return false;
      }

      return true;
    });
  }, [logs, filter, searchQuery]);

  // Format Helpers
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  const vramProgressClass = (pct: number) => {
    if (pct >= 90) return 'danger';
    if (pct >= 75) return 'warning';
    return 'normal';
  };

  return (
    <div className="comfy-telemetry-page">
      <div className="ct-container">
        {/* ================================================================
            Header & Title
            ================================================================ */}
        <header className="ct-header">
          <div className="ct-header-left">
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              ComfyUI Telemetry &amp; Hardware Benchmark
            </h1>
            <p className="ct-subtitle">
              Pelacak eksekusi real-time, diagnosa VRAM offloading, penerjemah error bahasa manusia, dan rekor benchmark permanen.
            </p>
          </div>

          <div className="ct-header-actions">
            <button
              type="button"
              className="ct-btn ct-btn-sm ct-btn-primary"
              onClick={handleSyncHistory}
              disabled={isSyncing}
              title="Tarik riwayat generasi dari ComfyUI lokal (termasuk yang dijalankan dari tab lain)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {isSyncing ? 'Menyinkronkan...' : 'Sync from ComfyUI History'}
            </button>

            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={() => refreshData()}
              title="Refresh Telemetry &amp; Data"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh Data
            </button>
          </div>
        </header>

        {/* Sync Toast Feedback Banner */}
        {syncToast && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10B981',
              color: '#10B981',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{syncToast}</span>
          </div>
        )}

        {/* ================================================================
            Top Telemetry Bar & Connection Strip
            ================================================================ */}
        <section className="ct-telemetry-bar">
          <div className="ct-connection-row">
            <div className="ct-status-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className={`ct-status-badge ${connectionStatus}`}>
                <span className="ct-status-dot" />
                {connectionStatus === 'connected' && 'Terhubung ke ComfyUI'}
                {connectionStatus === 'connecting' && 'Menghubungkan ke ComfyUI...'}
                {connectionStatus === 'disconnected' && 'ComfyUI Terputus'}
                {connectionStatus === 'cors_error' && 'CORS Diblokir / Offline'}
                {connectionStatus === 'network_error' && 'Jaringan Terputus'}
              </div>

              {hardware && (
                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                  {hardware.os} • {hardware.envInfo}
                </span>
              )}
            </div>

            <div className="ct-connection-controls">
              <div className="ct-host-input-wrap">
                <span className="ct-host-prefix">http://</span>
                <input
                  type="text"
                  className="ct-host-input"
                  value={hostInput}
                  onChange={(e) => setHostInput(e.target.value)}
                  onBlur={handleHostBlur}
                  placeholder="127.0.0.1:8188"
                  title="Alamat host dan port ComfyUI lokal"
                />
              </div>

              <button
                type="button"
                className={`ct-btn ${connectionStatus === 'connected' ? 'ct-btn-danger' : 'ct-btn-primary'}`}
                onClick={handleConnectToggle}
              >
                {connectionStatus === 'connected' ? 'Putuskan' : 'Hubungkan'}
              </button>
            </div>
          </div>

          {/* CORS Instructions Tooltip / Banner */}
          {(connectionStatus === 'cors_error' || connectionStatus === 'network_error') && (
            <div className="ct-cors-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Instruksi Koneksi &amp; CORS:</strong> Jika browser memblokir request langsung ke ComfyUI, pastikan ComfyUI dijalankan dengan parameter:{' '}
                <code>--enable-cors-header</code> (contoh: buka file <code>run_nvidia_gpu.bat</code> dan tambahkan <code>--enable-cors-header</code> pada baris eksekusi Python).
              </div>
            </div>
          )}

          {/* Auto-detected Hardware Specs Grid */}
          <div className="ct-hardware-strip">
            <div className="ct-hw-metric">
              <div className="ct-hw-label">
                <span>GPU MODEL</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </div>
              <div className="ct-hw-val" title={hardware?.gpuName || 'Mendeteksi...'}>
                {hardware ? hardware.gpuName : 'Memuat Hardware...'}
              </div>
              <span className="ct-hw-subtext">Device CUDA Akselerasi Utama</span>
            </div>

            <div className="ct-hw-metric">
              <div className="ct-hw-label">
                <span>VRAM CAPACITY</span>
                <span style={{ color: hardware && hardware.vramPercent >= 90 ? '#EF4444' : '#10B981' }}>
                  {hardware ? `${hardware.vramPercent}%` : '0%'}
                </span>
              </div>
              <div className="ct-hw-val">
                {hardware
                  ? `${hardware.vramUsedGb} GB / ${hardware.vramTotalGb} GB`
                  : '0.0 / 0.0 GB'}
              </div>
              <div className="ct-hw-progress-track">
                <div
                  className={`ct-hw-progress-fill ${vramProgressClass(hardware?.vramPercent || 0)}`}
                  style={{ width: `${Math.min(100, hardware?.vramPercent || 0)}%` }}
                />
              </div>
              <span className="ct-hw-subtext">
                Free: {hardware ? `${hardware.vramFreeGb} GB` : '0.0 GB'}
              </span>
            </div>

            <div className="ct-hw-metric">
              <div className="ct-hw-label">
                <span>SYSTEM RAM</span>
                <span>{hardware ? `${hardware.ramPercent}%` : '0%'}</span>
              </div>
              <div className="ct-hw-val">
                {hardware
                  ? `${hardware.ramUsedGb} GB / ${hardware.ramTotalGb} GB`
                  : '0.0 / 0.0 GB'}
              </div>
              <div className="ct-hw-progress-track">
                <div
                  className="ct-hw-progress-fill normal"
                  style={{ width: `${Math.min(100, hardware?.ramPercent || 0)}%` }}
                />
              </div>
              <span className="ct-hw-subtext">
                Free: {hardware ? `${hardware.ramFreeGb} GB` : '0.0 GB'}
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================
            Live Execution Banner (Active Generation Tracker)
            ================================================================ */}
        {liveState.isActive && (
          <section className="ct-live-banner">
            <div className="ct-live-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="ct-live-badge">
                  <span className="ct-live-pulse-dot" />
                  Generating Active
                </span>
                <strong style={{ fontSize: '0.9rem', color: '#F3F4F6' }}>
                  {liveState.currentNodeType || 'Mengeksekusi Pipeline'}
                </strong>
              </div>

              <div className="ct-live-metrics">
                <div className="ct-live-metric-item">
                  Durasi: <strong>{liveState.elapsedSeconds.toFixed(1)}s</strong>
                </div>
                <div className="ct-live-metric-item">
                  Step: <strong>{liveState.currentStep} / {liveState.totalSteps || '?'}</strong>
                </div>
                <div className="ct-live-metric-item">
                  Kecepatan:{' '}
                  <strong>
                    {liveState.secPerIt && liveState.secPerIt >= 1.0
                      ? `${liveState.secPerIt.toFixed(2)} s/it`
                      : liveState.itPerSec
                      ? `${liveState.itPerSec} it/s`
                      : 'Menghitung...'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="ct-live-progress-bar">
              <div
                className="ct-live-progress-bar-fill"
                style={{ width: `${liveState.progressPercent}%` }}
              />
            </div>
          </section>
        )}

        {/* ================================================================
            Permanent Benchmark Cards (Immutable & Protected)
            ================================================================ */}
        <section className="ct-benchmarks-section">
          <div className="ct-section-heading">
            <span>REKOR HARDWARE ALL-TIME (PERMANENT &amp; PROTECTED)</span>
            <span className="ct-lock-pill" title="Rekor ini tetap bertahan meski riwayat log dibersihkan">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Protected Storage
            </span>
          </div>

          <div className="ct-benchmarks-grid">
            {/* 1. Fastest Record Card */}
            <div className="ct-bench-card fastest">
              <div className="ct-bench-card-header">
                <div className="ct-bench-title-wrap">
                  <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Rekor Tercepat (Fastest Generation)
                  </h3>
                  <p className="ct-bench-sub">Waktu terpendek untuk generasi sukses pada hardware ini</p>
                </div>
                <span className="ct-lock-pill">🔒 Locked</span>
              </div>

              {benchmarkRecord?.fastestRecord ? (
                <>
                  <div className="ct-bench-number-area">
                    <span className="ct-bench-number emerald">
                      {benchmarkRecord.fastestRecord.duration.toFixed(2)}
                    </span>
                    <span className="ct-bench-number-unit">detik</span>
                  </div>

                  <div className="ct-bench-details">
                    <div className="ct-bench-detail-row">
                      <span>Kecepatan Inferensi:</span>
                      <span>{benchmarkRecord.fastestRecord.timePerStep}</span>
                    </div>
                    <div className="ct-bench-detail-row">
                      <span>Resolusi &amp; Steps:</span>
                      <span>
                        {benchmarkRecord.fastestRecord.resolution} ({benchmarkRecord.fastestRecord.steps} steps)
                      </span>
                    </div>
                    <div className="ct-bench-detail-row">
                      <span>Sampler:</span>
                      <span>{benchmarkRecord.fastestRecord.sampler}</span>
                    </div>
                    <div className="ct-bench-detail-row">
                      <span>Tercatat Pada:</span>
                      <span>{formatTime(benchmarkRecord.fastestRecord.timestamp)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="ct-bench-empty">
                  Belum ada generasi sukses yang tercatat. Jalankan ComfyUI untuk menetapkan baseline tercepat.
                </div>
              )}
            </div>

            {/* 2. Slowest Record Card (With Root-Cause Diagnosis) */}
            <div className="ct-bench-card slowest">
              <div className="ct-bench-card-header">
                <div className="ct-bench-title-wrap">
                  <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Rekor Terlambat (Slowest Generation)
                  </h3>
                  <p className="ct-bench-sub">Durasi terlama beserta diagnosa akar penyebab bottleneck</p>
                </div>
                <span className="ct-lock-pill">🔒 Locked</span>
              </div>

              {benchmarkRecord?.slowestRecord ? (
                <>
                  <div className="ct-bench-number-area">
                    <span className="ct-bench-number amber">
                      {benchmarkRecord.slowestRecord.duration.toFixed(2)}
                    </span>
                    <span className="ct-bench-number-unit">detik</span>
                  </div>

                  <div className="ct-bench-diagnosis-box">
                    <strong>Akar Masalah: </strong>
                    {benchmarkRecord.slowestRecord.bottleneckReason}
                  </div>

                  <div className="ct-bench-details">
                    <div className="ct-bench-detail-row">
                      <span>Resolusi &amp; Steps:</span>
                      <span>
                        {benchmarkRecord.slowestRecord.resolution} ({benchmarkRecord.slowestRecord.steps} steps)
                      </span>
                    </div>
                    <div className="ct-bench-detail-row">
                      <span>Trigger Node:</span>
                      <span>{benchmarkRecord.slowestRecord.nodeType || 'General Sampling'}</span>
                    </div>
                    <div className="ct-bench-detail-row">
                      <span>Tercatat Pada:</span>
                      <span>{formatTime(benchmarkRecord.slowestRecord.timestamp)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="ct-bench-empty">
                  Belum ada data eksekusi terlama. Milestones akan tercatat otomatis saat eksekusi selesai.
                </div>
              )}
            </div>

            {/* 3. Reliability & Hardware Counters Card */}
            <div className="ct-bench-card stats">
              <div className="ct-bench-card-header">
                <div className="ct-bench-title-wrap">
                  <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                    Statistik Keandalan Hardware
                  </h3>
                  <p className="ct-bench-sub">Frekuensi offload dan insiden memori pada hardware aktif</p>
                </div>
                <span className="ct-lock-pill">🔒 Locked</span>
              </div>

              <div className="ct-stats-counters-grid">
                <div className="ct-stat-mini-box">
                  <span className="ct-stat-mini-label">Total Generasi</span>
                  <span className="ct-stat-mini-val">
                    {benchmarkRecord ? benchmarkRecord.totalGenerations : 0}
                  </span>
                </div>

                <div className="ct-stat-mini-box">
                  <span className="ct-stat-mini-label">VRAM Offload</span>
                  <span className={`ct-stat-mini-val ${benchmarkRecord && benchmarkRecord.offloadCount > 0 ? 'warn' : ''}`}>
                    {benchmarkRecord ? benchmarkRecord.offloadCount : 0}x
                  </span>
                </div>

                <div className="ct-stat-mini-box">
                  <span className="ct-stat-mini-label">OOM Crashes</span>
                  <span className={`ct-stat-mini-val ${benchmarkRecord && benchmarkRecord.oomCount > 0 ? 'danger' : ''}`}>
                    {benchmarkRecord ? benchmarkRecord.oomCount : 0}x
                  </span>
                </div>

                <div className="ct-stat-mini-box">
                  <span className="ct-stat-mini-label">Heavy Upscales</span>
                  <span className="ct-stat-mini-val">
                    {benchmarkRecord ? benchmarkRecord.heavyPostProcessingCount : 0}x
                  </span>
                </div>
              </div>

              <div className="ct-bench-details">
                <div className="ct-bench-detail-row">
                  <span>Hardware Profile:</span>
                  <span>{benchmarkRecord ? benchmarkRecord.gpuName : 'Default GPU'}</span>
                </div>
                <div className="ct-bench-detail-row">
                  <span>Success Rate:</span>
                  <span>
                    {benchmarkRecord && benchmarkRecord.totalGenerations > 0
                      ? `${Math.round((benchmarkRecord.totalSuccess / benchmarkRecord.totalGenerations) * 100)}%`
                      : '100%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            Simulation & QA Bar
            ================================================================ */}
        <section className="ct-sim-bar">
          <div className="ct-sim-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span>Simulasi Uji Coba Telemetri:</span>
          </div>

          <div className="ct-sim-btn-group">
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              disabled={simRunning || liveState.isActive}
              onClick={() => handleSimulate('normal')}
              title="Simulasikan generasi normal cepat"
            >
              ⚡ Normal (Cepat)
            </button>

            <button
              type="button"
              className="ct-btn ct-btn-sm"
              disabled={simRunning || liveState.isActive}
              onClick={() => handleSimulate('offload')}
              title="Simulasikan VRAM penuh >95% dan offload ke RAM"
            >
              ⚠️ VRAM Offload (Lambat)
            </button>

            <button
              type="button"
              className="ct-btn ct-btn-sm"
              disabled={simRunning || liveState.isActive}
              onClick={() => handleSimulate('oom')}
              title="Simulasikan error CUDA Out of Memory"
            >
              💥 CUDA Out of Memory
            </button>

            <button
              type="button"
              className="ct-btn ct-btn-sm"
              disabled={simRunning || liveState.isActive}
              onClick={() => handleSimulate('shape_mismatch')}
              title="Simulasikan error LoRA shape mismatch"
            >
              ❌ LoRA Shape Mismatch
            </button>
          </div>
        </section>

        {/* ================================================================
            History & Action Bar
            ================================================================ */}
        <section className="ct-history-header">
          <div className="ct-filters-group">
            <button
              type="button"
              className={`ct-filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Semua ({logs.length})
            </button>
            <button
              type="button"
              className={`ct-filter-tab ${filter === 'success' ? 'active' : ''}`}
              onClick={() => setFilter('success')}
            >
              Sukses ({logs.filter((l) => l.status === 'success').length})
            </button>
            <button
              type="button"
              className={`ct-filter-tab ${filter === 'offload' ? 'active' : ''}`}
              onClick={() => setFilter('offload')}
            >
              Offload / Slowdown ({logs.filter((l) => l.bottleneckDiagnosis?.tag === 'VRAM Offload Detected').length})
            </button>
            <button
              type="button"
              className={`ct-filter-tab ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              Error ({logs.filter((l) => l.status === 'error').length})
            </button>

            <div className="ct-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="ct-search-input"
                placeholder="Cari prompt, error, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ct-storage-pill" title="Ukuran IndexedDB saat ini">
              IndexedDB: {storageStats.logCount} item ({storageStats.sizeKb} KB)
            </span>

            <button
              type="button"
              className="ct-btn ct-btn-danger ct-btn-sm"
              disabled={logs.length === 0}
              onClick={() => setShowClearModal(true)}
              title="Bersihkan riwayat log harian (rekor benchmark tetap tersimpan)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear Logs (Keep Records)
            </button>
          </div>
        </section>

        {/* ================================================================
            Execution History Feed
            ================================================================ */}
        <section className="ct-history-list">
          {filteredLogs.length === 0 ? (
            <div className="ct-history-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <div>
                <strong>Tidak ada riwayat eksekusi</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                  Jalankan render gambar di ComfyUI atau klik tombol Simulasi di atas untuk melihat pencatatan telemetri.
                </p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isError = log.status === 'error';
              const isOffload = log.bottleneckDiagnosis?.tag === 'VRAM Offload Detected';
              const statusClass = isError
                ? 'status-error'
                : isOffload
                ? 'status-offload'
                : 'status-success';

              return (
                <div key={log.id} className={`ct-log-card ${statusClass}`}>
                  <div className="ct-log-main-row">
                    <div className="ct-log-meta-left">
                      <span className={`ct-tag-status ${log.status}`}>
                        {log.status === 'success' ? 'Sukses' : 'Gagal'}
                      </span>
                      <span className="ct-log-time">{formatTime(log.timestamp)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace' }}>
                        ID: {log.promptId.length > 20 ? `${log.promptId.slice(0, 18)}...` : log.promptId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="ct-log-metrics-row">
                        <span className="ct-log-metric-badge">
                          Durasi: <strong>{log.duration.toFixed(2)}s</strong>
                        </span>
                        <span className="ct-log-metric-badge">
                          Speed: <strong>{log.timePerStep}</strong>
                        </span>
                        <span className="ct-log-metric-badge">
                          Resolusi: <strong>{log.resolution}</strong>
                        </span>
                        <span className="ct-log-metric-badge">
                          Steps: <strong>{log.completedSteps} / {log.totalSteps}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="ct-btn ct-btn-sm"
                        onClick={() => handleDeleteLog(log.id)}
                        title="Hapus log ini"
                        style={{ padding: '4px 8px', color: '#EF4444' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Model, LoRAs & Pipeline Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.76rem' }}>
                    {log.modelName && (
                      <span className="ct-badge-model" title="Model Checkpoint">
                        📦 {log.modelName}
                      </span>
                    )}
                    {log.cfg && (
                      <span className="ct-badge-cfg" title="Classifier Free Guidance">
                        CFG: {log.cfg}
                      </span>
                    )}
                    {log.activeLoras && log.activeLoras.length > 0 && (
                      log.activeLoras.map((lora, idx) => (
                        <span key={idx} className="ct-badge-lora" title="Active LoRA">
                          🧬 LoRA: {lora}
                        </span>
                      ))
                    )}
                    {log.postProcessingNodes && log.postProcessingNodes.length > 0 && (
                      log.postProcessingNodes.map((pp, idx) => (
                        <span key={idx} className="ct-badge-postproc" title="Post-Processing Stage">
                          ⚡ {pp}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Bottleneck Diagnosis Badge */}
                  {log.bottleneckDiagnosis && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`ct-log-bottleneck-badge ${log.bottleneckDiagnosis.severity}`}>
                          {log.bottleneckDiagnosis.tag}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#FCD34D' }}>
                          {log.bottleneckDiagnosis.title}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#D1D5DB', lineHeight: 1.45 }}>
                        {log.bottleneckDiagnosis.explanation}
                      </span>
                      {log.bottleneckDiagnosis.details && (
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                          {log.bottleneckDiagnosis.details}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Human-Friendly Error Box */}
                  {isError && log.errorTranslation && (
                    <div className="ct-error-box">
                      <div className="ct-error-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{log.errorTranslation.title}</span>
                      </div>

                      <p className="ct-error-desc">{log.errorTranslation.explanation}</p>

                      <div className="ct-error-solution">
                        <strong>Solusi: </strong>
                        {log.errorTranslation.solution}
                      </div>

                      {/* Toggleable Raw Technical Accordion */}
                      <details className="ct-tech-accordion">
                        <summary>▶ Tampilkan Log Teknis Python (Raw Traceback)</summary>
                        <pre className="ct-tech-code">{log.errorTranslation.rawError}</pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* ================================================================
            Confirmation Modal for Clear History
            ================================================================ */}
        {showClearModal && (
          <div className="ct-modal-backdrop" onClick={() => setShowClearModal(false)}>
            <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="ct-modal-title">Bersihkan Riwayat Log Eksekusi?</h3>
              <p className="ct-modal-body">
                Tindakan ini akan menghapus <strong>{logs.length}</strong> catatan riwayat harian dari database browser.
                <br /><br />
                🔒 <strong>Jaminan Keamanan Rekor:</strong> Rekor Tercepat (Fastest), Rekor Terlambat (Slowest), dan Statistik Hardware <strong>TIDAK AKAN DIHAPUS</strong> dan tetap terlindungi secara permanen di <code>hardware_benchmarks</code>.
              </p>
              <div className="ct-modal-actions">
                <button
                  type="button"
                  className="ct-btn"
                  onClick={() => setShowClearModal(false)}
                  disabled={isClearing}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn-danger"
                  onClick={handleClearAllHistory}
                  disabled={isClearing}
                >
                  {isClearing ? 'Membersihkan...' : 'Ya, Bersihkan Log'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
