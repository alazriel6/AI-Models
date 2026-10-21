import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  OPENPOSE_JOINTS,
  type JointPoint,
  drawSkeletonOnCanvas,
  exportToOpenPosePNG,
  exportToOpenPoseJSON,
  parseKeypointsFromJSON,
} from "./openposeConstants";
import { createControlNetPoseApi, type ControlNetPose } from "../../api/controlnet";
import { bridgeToPromptLab } from "../../utils/workflowBridge";
import { useNavigate } from "react-router-dom";

interface OpenPoseCanvasProps {
  selectedPose: ControlNetPose | null;
  onPoseSaved?: (newPose: ControlNetPose) => void;
}

export const OpenPoseCanvas: React.FC<OpenPoseCanvasProps> = ({
  selectedPose,
  onPoseSaved,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas Dimensions & Presets
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(768);

  // Active Keypoints State
  const [keypoints, setKeypoints] = useState<JointPoint[]>([]);
  const [initialKeypoints, setInitialKeypoints] = useState<JointPoint[]>([]);

  // Dragging & Interaction State
  const [activeJointId, setActiveJointId] = useState<number | null>(null);
  const [hoverJointId, setHoverJointId] = useState<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Background Options
  const [bgMode, setBgMode] = useState<"black" | "transparent" | "reference">("black");
  const [referenceImgUrl, setReferenceImgUrl] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.45);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveCategory, setSaveCategory] = useState<string>("Standing & Model");
  const [saveTags, setSaveTags] = useState<string>("");
  const [savePrompt, setSavePrompt] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Initialize or update keypoints when selectedPose changes
  useEffect(() => {
    if (!selectedPose) return;

    const parsed = parseKeypointsFromJSON(selectedPose.keypoints_data);
    if (parsed.length > 0) {
      setCanvasWidth(selectedPose.canvas_width || 512);
      setCanvasHeight(selectedPose.canvas_height || 768);
      setKeypoints(parsed);
      setInitialKeypoints(parsed);
      setSaveTitle(`${selectedPose.title} (Custom)`);
      setSaveCategory(selectedPose.category);
      setSaveTags(selectedPose.tags || "");
      setSavePrompt(selectedPose.recommended_prompt || "");
    }
  }, [selectedPose]);

  // Handle Reference Image Load
  useEffect(() => {
    if (!referenceImgUrl) {
      referenceImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = referenceImgUrl;
    img.onload = () => {
      referenceImgRef.current = img;
      renderCanvas();
    };
  }, [referenceImgUrl]);

  // Main Canvas Render Function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Render Background
    if (bgMode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (bgMode === "transparent") {
      // Draw subtle dark checkerboard pattern
      const tileSize = 16;
      for (let x = 0; x < canvasWidth; x += tileSize) {
        for (let y = 0; y < canvasHeight; y += tileSize) {
          ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? "#111827" : "#1f2937";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else if (bgMode === "reference" && referenceImgRef.current) {
      // Solid dark base behind reference
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw reference photo with user opacity
      ctx.globalAlpha = referenceOpacity;
      ctx.drawImage(referenceImgRef.current, 0, 0, canvasWidth, canvasHeight);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Render OpenPose Skeleton
    if (keypoints.length > 0) {
      drawSkeletonOnCanvas(ctx, keypoints, 1.0, 1.0, {
        showJoints: true,
        showLimbs: true,
        jointRadius: Math.max(5, Math.round(canvasWidth / 95)),
        limbWidth: Math.max(4, Math.round(canvasWidth / 115)),
        activeJointId,
        hoverJointId,
      });
    }
  }, [canvasWidth, canvasHeight, keypoints, activeJointId, hoverJointId, bgMode, referenceOpacity]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordinate Helper: Converts Client Mouse/Touch position to Canvas space
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Find Nearest Joint within threshold radius
  const findNearestJoint = (x: number, y: number, threshold: number = 22): number | null => {
    let closestId: number | null = null;
    let minDistance = threshold;

    for (let i = 0; i < keypoints.length; i++) {
      const pt = keypoints[i];
      if (!pt || pt.confidence <= 0) continue;
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = i;
      }
    }

    return closestId;
  };

  // Mouse & Touch Event Handlers
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const nearest = findNearestJoint(x, y, 24);

    if (nearest !== null) {
      setActiveJointId(nearest);
      isDraggingRef.current = true;
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (isDraggingRef.current && activeJointId !== null) {
      // Clamp coordinates within canvas boundaries
      const clampedX = Math.max(0, Math.min(canvasWidth, x));
      const clampedY = Math.max(0, Math.min(canvasHeight, y));

      setKeypoints((prev) => {
        const next = [...prev];
        next[activeJointId] = {
          ...next[activeJointId],
          x: Math.round(clampedX),
          y: Math.round(clampedY),
        };
        return next;
      });
    } else {
      // Check for hover state
      const hover = findNearestJoint(x, y, 20);
      setHoverJointId(hover);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setActiveJointId(null);
  };

  // Operations: Flip Horizontally (Mirrors pose and swaps Left & Right limbs)
  const handleFlipHorizontal = () => {
    if (keypoints.length === 0) return;

    // Pairs to swap when flipped:
    // R-Shoulder (2) <-> L-Shoulder (5)
    // R-Elbow (3) <-> L-Elbow (6)
    // R-Wrist (4) <-> L-Wrist (7)
    // R-Hip (8) <-> L-Hip (11)
    // R-Knee (9) <-> L-Knee (12)
    // R-Ankle (10) <-> L-Ankle (13)
    // R-Eye (14) <-> L-Eye (15)
    // R-Ear (16) <-> L-Ear (17)
    const swapPairs: [number, number][] = [
      [2, 5],
      [3, 6],
      [4, 7],
      [8, 11],
      [9, 12],
      [10, 13],
      [14, 15],
      [16, 17],
    ];

    setKeypoints((prev) => {
      // 1. Mirror X coordinate
      const mirrored = prev.map((pt) => ({
        ...pt,
        x: canvasWidth - pt.x,
      }));

      // 2. Swap L and R keypoints
      const next = [...mirrored];
      for (const [r, l] of swapPairs) {
        if (next[r] && next[l]) {
          const temp = { ...next[r] };
          next[r] = { ...next[l] };
          next[l] = temp;
        }
      }

      return next;
    });
  };

  // Operations: Center Pose in Canvas
  const handleCenterPose = () => {
    if (keypoints.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of keypoints) {
      if (pt.confidence <= 0) continue;
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;
    const targetCenterX = canvasWidth / 2;
    const targetCenterY = canvasHeight / 2;

    const deltaX = Math.round(targetCenterX - currentCenterX);
    const deltaY = Math.round(targetCenterY - currentCenterY);

    setKeypoints((prev) =>
      prev.map((pt) => ({
        ...pt,
        x: Math.max(10, Math.min(canvasWidth - 10, pt.x + deltaX)),
        y: Math.max(10, Math.min(canvasHeight - 10, pt.y + deltaY)),
      }))
    );
  };

  // Operations: Reset Pose
  const handleResetPose = () => {
    if (initialKeypoints.length > 0) {
      setKeypoints(initialKeypoints);
    }
  };

  // Switch Aspect Ratio with proportional coordinate scaling
  const handleSelectAspectRatio = (newW: number, newH: number) => {
    if (newW === canvasWidth && newH === canvasHeight) return;

    const scaleX = newW / canvasWidth;
    const scaleY = newH / canvasHeight;

    setCanvasWidth(newW);
    setCanvasHeight(newH);

    setKeypoints((prev) =>
      prev.map((pt) => ({
        ...pt,
        x: Math.round(pt.x * scaleX),
        y: Math.round(pt.y * scaleY),
      }))
    );
  };

  // Reference Image Upload Handler
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReferenceImgUrl(event.target.result as string);
        setBgMode("reference");
      }
    };
    reader.readAsDataURL(file);
  };

  // Export 1: Genuine OpenPose PNG
  const handleDownloadPNG = () => {
    const filename = `${selectedPose?.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || "pose"}_openpose_${canvasWidth}x${canvasHeight}.png`;
    exportToOpenPosePNG(keypoints, canvasWidth, canvasHeight, filename);
  };

  // Export 2: Standard OpenPose JSON
  const handleDownloadJSON = () => {
    const filename = `${selectedPose?.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || "pose"}_openpose.json`;
    exportToOpenPoseJSON(keypoints, canvasWidth, canvasHeight, filename);
  };

  // Copy Prompt with Toast Feedback
  const handleCopyPrompt = () => {
    if (!selectedPose?.recommended_prompt) return;
    navigator.clipboard.writeText(selectedPose.recommended_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);
  };

  // Bridge to Prompt Lab
  const handleSendToPromptLab = () => {
    const promptText = selectedPose?.recommended_prompt || "";
    bridgeToPromptLab(navigate, {
      source: "controlnet",
      timestamp: Date.now(),
      title: selectedPose?.title,
      positivePrompt: promptText,
    });
  };

  // Save Custom Pose Modal Submit
  const handleSavePoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        title: saveTitle.trim(),
        category: saveCategory,
        tags: saveTags.trim(),
        recommended_prompt: savePrompt.trim(),
        description: `Custom pose dibuat via ControlNet OpenPose Rig Editor (${canvasWidth}x${canvasHeight}).`,
        keypoints_data: JSON.stringify(keypoints.map((pt) => [pt.x, pt.y, pt.confidence])),
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        is_system: false,
      };

      const saved = await createControlNetPoseApi(payload);
      setShowSaveModal(false);
      if (onPoseSaved) {
        onPoseSaved(saved);
      }
    } catch (err) {
      console.error("Failed to save pose:", err);
      alert("Gagal menyimpan pose. Silakan periksa koneksi backend.");
    } finally {
      setIsSaving(false);
    }
  };

  const hoveredJointMeta = useMemo(() => {
    if (hoverJointId === null || !OPENPOSE_JOINTS[hoverJointId]) return null;
    return OPENPOSE_JOINTS[hoverJointId];
  }, [hoverJointId]);

  return (
    <div className="openpose-rig-container">
      {/* LEFT: Interactive Canvas Workstation */}
      <div className="openpose-canvas-panel">
        <div className="openpose-canvas-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-badge">
              <span className="status-dot live" />
              18-Joint COCO Rig
            </span>

            {/* Aspect Ratio Switcher */}
            <div className="canvas-aspect-selector">
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 512 && canvasHeight === 768 ? "active" : ""}`}
                onClick={() => handleSelectAspectRatio(512, 768)}
              >
                512×768 (2:3)
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 512 && canvasHeight === 512 ? "active" : ""}`}
                onClick={() => handleSelectAspectRatio(512, 512)}
              >
                512×512 (1:1)
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 832 && canvasHeight === 1216 ? "active" : ""}`}
                onClick={() => handleSelectAspectRatio(832, 1216)}
              >
                832×1216 (SDXL)
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 1024 && canvasHeight === 1024 ? "active" : ""}`}
                onClick={() => handleSelectAspectRatio(1024, 1024)}
              >
                1024×1024 (Flux)
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="toolbar-right">
            <button
              type="button"
              className="canvas-tool-btn"
              onClick={handleFlipHorizontal}
              title="Mirror / Flip Horizontal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              <span>Mirror</span>
            </button>

            <button
              type="button"
              className="canvas-tool-btn"
              onClick={handleCenterPose}
              title="Center Skeleton"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Center</span>
            </button>

            <button
              type="button"
              className="canvas-tool-btn danger-hover"
              onClick={handleResetPose}
              title="Reset ke pose awal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Viewport Canvas Wrapper */}
        <div className="canvas-viewport-wrapper">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="openpose-interactive-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          {/* Hover Joint Indicator Tooltip */}
          {hoveredJointMeta && (
            <div className="joint-floating-indicator">
              <span
                className="joint-color-dot"
                style={{
                  backgroundColor: `rgb(${hoveredJointMeta.color.join(",")})`,
                }}
              />
              <span className="joint-label">{hoveredJointMeta.name}</span>
            </div>
          )}

          {/* Interactive Drag Hint */}
          <div className="canvas-interaction-hint">
            <span>💡 Geser / Drag sendi (titik berwarna) untuk mengubah pose tubuh secara interaktif</span>
          </div>
        </div>

        {/* Background & Trace Overlay Controls */}
        <div className="canvas-bottom-controls">
          <div className="bg-mode-group">
            <span className="control-label">Canvas Layer:</span>
            <button
              type="button"
              className={`bg-mode-btn ${bgMode === "black" ? "active" : ""}`}
              onClick={() => setBgMode("black")}
            >
              Solid Black (ControlNet)
            </button>
            <button
              type="button"
              className={`bg-mode-btn ${bgMode === "transparent" ? "active" : ""}`}
              onClick={() => setBgMode("transparent")}
            >
              Checkerboard
            </button>
            <label className={`bg-mode-btn file-label ${bgMode === "reference" ? "active" : ""}`}>
              <span>Trace Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReferenceUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {bgMode === "reference" && (
            <div className="reference-opacity-control">
              <span className="opacity-label">Foto Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={referenceOpacity}
                onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
                className="opacity-slider"
              />
              <span className="opacity-val">{Math.round(referenceOpacity * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Pose Info, Prompt & 1-Click Export Actions */}
      <div className="openpose-sidebar-panel">
        {selectedPose ? (
          <>
            <div className="pose-card-header">
              <div className="pose-header-top">
                <span className="pose-category-tag">{selectedPose.category}</span>
                {selectedPose.is_system ? (
                  <span className="pose-system-badge">Verified System Pose</span>
                ) : (
                  <span className="pose-custom-badge">User Custom</span>
                )}
              </div>
              <h3 className="pose-title">{selectedPose.title}</h3>
              <p className="pose-desc">{selectedPose.description}</p>
            </div>

            {/* Recommended Prompt Box */}
            <div className="pose-prompt-card">
              <div className="prompt-header">
                <span className="prompt-title">Recommended Trigger &amp; Prompt</span>
                <button
                  type="button"
                  className="copy-prompt-btn"
                  onClick={handleCopyPrompt}
                >
                  {copiedPrompt ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <p className="prompt-body">{selectedPose.recommended_prompt}</p>

              {selectedPose.tags && (
                <div className="pose-tags-wrap">
                  {selectedPose.tags.split(",").map((t, idx) => (
                    <span key={idx} className="pose-tag-pill">
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 1-Click Download & Export Action Buttons */}
            <div className="export-action-box">
              <div className="export-box-title">1-Click ControlNet Export</div>

              <button
                type="button"
                className="export-btn primary-export"
                onClick={handleDownloadPNG}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <div className="btn-text-col">
                  <strong>Download OpenPose PNG</strong>
                  <small>Black Background Standard • {canvasWidth}×{canvasHeight}px</small>
                </div>
              </button>

              <button
                type="button"
                className="export-btn secondary-export"
                onClick={handleDownloadJSON}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <div className="btn-text-col">
                  <strong>Download OpenPose JSON</strong>
                  <small>Compatible DWPose / OpenPose Editor</small>
                </div>
              </button>

              <div className="dual-bridge-actions">
                <button
                  type="button"
                  className="bridge-action-btn"
                  onClick={handleSendToPromptLab}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>Bawa ke Prompt Lab</span>
                </button>

                <button
                  type="button"
                  className="bridge-action-btn"
                  onClick={() => setShowSaveModal(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Simpan ke Database</span>
                </button>
              </div>
            </div>

            {/* Quick Technical Instructions for WebUI & ComfyUI */}
            <div className="controlnet-quick-guide">
              <div className="guide-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Cara Pakai di WebUI / ComfyUI:</span>
              </div>
              <ul className="guide-points">
                <li>
                  <strong>Preprocessor:</strong> Atur ke <code>none</code> (karena PNG hasil download sudah berupa skeleton utuh yang siap pakai).
                </li>
                <li>
                  <strong>Model:</strong> Pilih <code>control_v11p_sd15_openpose</code> atau <code>controlnet-openpose-sdxl</code>.
                </li>
                <li>
                  <strong>Control Weight:</strong> Rekomendasi <strong>0.80 – 0.95</strong> untuk pose anatomi yang sangat presisi.
                </li>
                <li>
                  <strong>Ending Step:</strong> Atur ke <strong>0.75 – 0.85</strong> agar AI tetap bebas merender tekstur kulit dan pakaian secara natural pada tahap akhir.
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="no-pose-selected">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Pilih salah satu pose dari galeri di bawah untuk memuat skeleton interaktif.</p>
          </div>
        )}
      </div>

      {/* Save Custom Pose Modal */}
      {showSaveModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowSaveModal(false)}>
          <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h4>Simpan Pose ke Database Pribadi</h4>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowSaveModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePoseSubmit} className="modal-form-custom">
              <div className="form-group-custom">
                <label>Judul Pose *</label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Contoh: Dynamic Flying Kick Modified"
                />
              </div>

              <div className="form-group-custom">
                <label>Kategori</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                >
                  <option value="Standing & Model">Standing &amp; Model</option>
                  <option value="Action & Combat">Action &amp; Combat</option>
                  <option value="Sitting & Relaxed">Sitting &amp; Relaxed</option>
                  <option value="Portrait & Selfie">Portrait &amp; Selfie</option>
                  <option value="Dynamic & Aerial">Dynamic &amp; Aerial</option>
                  <option value="Duo & Interaction">Duo &amp; Interaction</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label>Tags (pisahkan koma)</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="kick, dynamic, martial arts, anime"
                />
              </div>

              <div className="form-group-custom">
                <label>Rekomendasi Prompt</label>
                <textarea
                  rows={3}
                  value={savePrompt}
                  onChange={(e) => setSavePrompt(e.target.value)}
                  placeholder="1girl, solo, dynamic pose, looking at viewer..."
                />
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSaveModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Menyimpan..." : "Simpan ke Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
