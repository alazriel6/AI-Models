import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  OPENPOSE_JOINTS,
  type JointPoint,
  drawSkeletonOnCanvas,
  exportToOpenPosePNG,
  exportToOpenPoseJSON,
  parseKeypointsFromJSON,
  type StickThicknessMode,
  THICKNESS_PROFILES,
  getStickDimensions,
} from "./openposeConstants";
import {
  validateAndSanitizePose,
  fitPoseToCanvas,
  centerPoseInCanvas,
  flipPoseHorizontal,
  findNearestJoint,
  createFallbackPose,
} from "./poseTransform";
import { createControlNetPoseApi, type ControlNetPose } from "../../api/controlnet";
import { bridgeToPromptLab } from "../../utils/workflowBridge";
import { useNavigate } from "react-router-dom";

export interface CanvasPreset {
  label: string;
  width: number;
  height: number;
  desc: string;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { label: "1024×1536", width: 1024, height: 1536, desc: "2:3 SDXL / Illustrious Portrait" },
  { label: "1024×1024", width: 1024, height: 1024, desc: "1:1 SDXL / Flux Square" },
  { label: "832×1216", width: 832, height: 1216, desc: "SDXL Standard Portrait" },
  { label: "1536×1024", width: 1536, height: 1024, desc: "3:2 SDXL Landscape" },
  { label: "1216×832", width: 1216, height: 832, desc: "SDXL Standard Landscape" },
  { label: "512×768", width: 512, height: 768, desc: "2:3 SD 1.5 Portrait" },
  { label: "512×512", width: 512, height: 512, desc: "1:1 SD 1.5 Square" },
  { label: "768×512", width: 768, height: 512, desc: "3:2 SD 1.5 Landscape" },
];

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
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // 1. Canvas Dimensions State (Default to 1024x1536 SDXL 2:3)
  const [canvasWidth, setCanvasWidth] = useState<number>(1024);
  const [canvasHeight, setCanvasHeight] = useState<number>(1536);
  const [inputW, setInputW] = useState<string>("1024");
  const [inputH, setInputH] = useState<string>("1536");
  const [resizeMode, setResizeMode] = useState<"preserve" | "stretch">("preserve");

  // 2. Viewport Display Scale & Zoom/Pan State
  const [displayScale, setDisplayScale] = useState<number>(1.0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // 3. Stick Thickness Configuration
  const [thicknessMode, setThicknessMode] = useState<StickThicknessMode>("sdxl");
  const [customLimbWidth, setCustomLimbWidth] = useState<number>(15);
  const [customJointRadius, setCustomJointRadius] = useState<number>(17);

  // Live buffer thickness metrics
  const currentStickDims = useMemo(() => {
    return getStickDimensions(canvasWidth, thicknessMode, customLimbWidth, customJointRadius);
  }, [canvasWidth, thicknessMode, customLimbWidth, customJointRadius]);

  // 4. Immutable Source of Truth & Active Pose State
  // pristineBasePose stores unscaled preset keypoints and canonical reference dimensions.
  // When switching presets or resizing canvas without manual edits, transformations are
  // ALWAYS calculated from pristineBasePose, eliminating shrinking bugs.
  const pristineBasePoseRef = useRef<{
    points: JointPoint[];
    sourceSize: { width: number; height: number };
  }>({
    points: createFallbackPose(512, 768),
    sourceSize: { width: 512, height: 768 },
  });

  const [keypoints, setKeypoints] = useState<JointPoint[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // 5. Undo / Redo History Stack
  const [history, setHistory] = useState<JointPoint[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const dragStartPointRef = useRef<{ index: number; pt: JointPoint } | null>(null);

  // 6. Interactive Dragging & Hover State
  const [activeJointId, setActiveJointId] = useState<number | null>(null);
  const [hoverJointId, setHoverJointId] = useState<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // 7. Background & Trace Overlay
  const [bgMode, setBgMode] = useState<"black" | "transparent" | "reference">("black");
  const [referenceImgUrl, setReferenceImgUrl] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.45);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);

  // 8. Save Modal State
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveCategory, setSaveCategory] = useState<string>("Standing & Model");
  const [saveTags, setSaveTags] = useState<string>("");
  const [savePrompt, setSavePrompt] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Push new state to undo/redo history
  const pushToHistory = useCallback((newPoints: JointPoint[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, newPoints.map((pt) => ({ ...pt }))];
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Load / Update pose when selectedPose prop changes
  useEffect(() => {
    if (!selectedPose) return;

    const rawParsed = parseKeypointsFromJSON(selectedPose.keypoints_data);
    const origW = selectedPose.canvas_width || 512;
    const origH = selectedPose.canvas_height || 768;

    // Validate and sanitize raw preset data
    const { sanitized, sourceSize } = validateAndSanitizePose(rawParsed, {
      width: origW,
      height: origH,
    });

    // Store pristine reference
    pristineBasePoseRef.current = {
      points: sanitized,
      sourceSize,
    };

    // Fit pristine points onto current active canvas size
    const fitted = fitPoseToCanvas(
      sanitized,
      sourceSize,
      { width: canvasWidth, height: canvasHeight },
      { maintainAspect: true, center: true, paddingRatio: 0.08 }
    );

    setKeypoints(fitted);
    setIsDirty(false);
    setHistory([fitted]);
    setHistoryIndex(0);

    setSaveTitle(`${selectedPose.title} (Custom ${canvasWidth}x${canvasHeight})`);
    setSaveCategory(selectedPose.category);
    setSaveTags(selectedPose.tags || "");
    setSavePrompt(selectedPose.recommended_prompt || "");
  }, [selectedPose]);

  // ResizeObserver to track container display width and compute displayScale
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateDisplayScale = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && canvasWidth > 0) {
        setDisplayScale(rect.width / canvasWidth);
      }
    };

    const observer = new ResizeObserver(() => {
      updateDisplayScale();
    });

    observer.observe(el);
    updateDisplayScale();

    return () => {
      observer.disconnect();
    };
  }, [canvasWidth, canvasHeight, zoom]);

  // Handle Reference Image Load
  useEffect(() => {
    if (!referenceImgUrl) {
      referenceImgRef.current = null;
      renderCanvas();
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

    // Clear buffer
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Render Background
    if (bgMode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (bgMode === "transparent") {
      // Checkerboard pattern
      const tileSize = 20;
      for (let x = 0; x < canvasWidth; x += tileSize) {
        for (let y = 0; y < canvasHeight; y += tileSize) {
          ctx.fillStyle =
            (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
              ? "#111827"
              : "#1f2937";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else if (bgMode === "reference" && referenceImgRef.current) {
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw reference photo with opacity
      ctx.globalAlpha = referenceOpacity;
      ctx.drawImage(referenceImgRef.current, 0, 0, canvasWidth, canvasHeight);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Render OpenPose Skeleton with Centralized Config
    if (keypoints.length > 0) {
      drawSkeletonOnCanvas(ctx, keypoints, 1.0, 1.0, {
        target: "canvas",
        displayScale,
        thicknessMode,
        customLimbWidth,
        customJointRadius,
        activeJointId,
        hoverJointId,
        drawOutlines: true,
        opacity: 1.0,
      });
    }
  }, [
    canvasWidth,
    canvasHeight,
    keypoints,
    activeJointId,
    hoverJointId,
    bgMode,
    referenceOpacity,
    displayScale,
    thicknessMode,
    customLimbWidth,
    customJointRadius,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Screen-space to Canvas Coordinate Transformation
  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
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

  // Pointer Interaction Handlers
  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const { x, y } = getCanvasCoordinates(e);

    // Dynamic screen-space hit detection: 22 real screen pixels
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    const curScale = rect && rect.width > 0 ? rect.width / canvasWidth : 1.0;
    const hitThreshold = Math.max(26, Math.round(22 / curScale));

    const nearest = findNearestJoint(keypoints, x, y, hitThreshold);

    if (nearest !== null) {
      setActiveJointId(nearest);
      isDraggingRef.current = true;
      dragStartPointRef.current = {
        index: nearest,
        pt: { ...keypoints[nearest] },
      };
    }
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const { x, y } = getCanvasCoordinates(e);

    if (isDraggingRef.current && activeJointId !== null) {
      // Clamp coordinates within canvas boundaries
      const clampedX = Math.max(0, Math.min(canvasWidth, Math.round(x)));
      const clampedY = Math.max(0, Math.min(canvasHeight, Math.round(y)));

      setKeypoints((prev) => {
        const next = [...prev];
        next[activeJointId] = {
          ...next[activeJointId],
          x: clampedX,
          y: clampedY,
        };
        return next;
      });

      if (!isDirty) setIsDirty(true);
    } else {
      // Hover check
      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const curScale = rect && rect.width > 0 ? rect.width / canvasWidth : 1.0;
      const hitThreshold = Math.max(24, Math.round(20 / curScale));

      const hover = findNearestJoint(keypoints, x, y, hitThreshold);
      setHoverJointId(hover);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current && activeJointId !== null && dragStartPointRef.current) {
      const orig = dragStartPointRef.current.pt;
      const cur = keypoints[activeJointId];
      if (cur && (orig.x !== cur.x || orig.y !== cur.y)) {
        pushToHistory(keypoints);
      }
    }
    isDraggingRef.current = false;
    setActiveJointId(null);
    dragStartPointRef.current = null;
  };

  // Undo & Redo Actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setKeypoints(targetState.map((pt) => ({ ...pt })));
      setHistoryIndex(targetIndex);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      setKeypoints(targetState.map((pt) => ({ ...pt })));
      setHistoryIndex(targetIndex);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Geometry Operation: Flip Horizontally
  const handleFlipHorizontal = () => {
    if (keypoints.length === 0) return;
    const flipped = flipPoseHorizontal(keypoints, canvasWidth);
    setKeypoints(flipped);
    setIsDirty(true);
    pushToHistory(flipped);
  };

  // Geometry Operation: Center Pose
  const handleCenterPose = () => {
    if (keypoints.length === 0) return;
    const centered = centerPoseInCanvas(keypoints, { width: canvasWidth, height: canvasHeight });
    setKeypoints(centered);
    setIsDirty(true);
    pushToHistory(centered);
  };

  // Operation: Reset Pose
  const handleResetPose = () => {
    const pristine = pristineBasePoseRef.current;
    if (pristine && pristine.points.length > 0) {
      const resetPoints = fitPoseToCanvas(
        pristine.points,
        pristine.sourceSize,
        { width: canvasWidth, height: canvasHeight },
        { maintainAspect: true, center: true, paddingRatio: 0.08 }
      );
      setKeypoints(resetPoints);
      setIsDirty(false);
      pushToHistory(resetPoints);
    }
  };

  // Apply Dimension Changes Without Compound Scaling
  const applyCanvasDimensions = useCallback(
    (newW: number, newH: number, mode: "preserve" | "stretch" = resizeMode) => {
      const clampedW = Math.max(256, Math.min(4096, Math.round(newW) || 1024));
      const clampedH = Math.max(256, Math.min(4096, Math.round(newH) || 1536));

      if (clampedW === canvasWidth && clampedH === canvasHeight) return;

      const pristine = pristineBasePoseRef.current;

      if (!isDirty && pristine && pristine.points.length > 0) {
        // Pristine Pose: Always transform directly from unmutated pristine base data.
        // This guarantees EXACT proportions and ZERO compounding shrinkage.
        const fitted = fitPoseToCanvas(
          pristine.points,
          pristine.sourceSize,
          { width: clampedW, height: clampedH },
          { maintainAspect: mode === "preserve", center: true, paddingRatio: 0.08 }
        );
        setKeypoints(fitted);
      } else if (keypoints.length > 0) {
        // User-modified Pose: Fit active keypoints from current dimensions to new dimensions
        const fitted = fitPoseToCanvas(
          keypoints,
          { width: canvasWidth, height: canvasHeight },
          { width: clampedW, height: clampedH },
          { maintainAspect: mode === "preserve", center: true, paddingRatio: 0.04 }
        );
        setKeypoints(fitted);
        pushToHistory(fitted);
      }

      setCanvasWidth(clampedW);
      setCanvasHeight(clampedH);
      setInputW(clampedW.toString());
      setInputH(clampedH.toString());
    },
    [canvasWidth, canvasHeight, keypoints, isDirty, resizeMode, pushToHistory]
  );

  // Swap Width & Height (Rotate Portrait <-> Landscape)
  const handleSwapDimensions = () => {
    applyCanvasDimensions(canvasHeight, canvasWidth, resizeMode);
  };

  // Submit custom W x H form
  const handleApplyCustomDimensions = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const w = parseInt(inputW, 10);
    const h = parseInt(inputH, 10);
    if (!isNaN(w) && !isNaN(h)) {
      applyCanvasDimensions(w, h, resizeMode);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, Number((prev - 0.15).toFixed(2))));
  const handleZoomReset = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
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

  // Export 1: Genuine OpenPose PNG with Selected Stick Thickness
  const handleDownloadPNG = () => {
    const filename = `${selectedPose?.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || "pose"}_openpose_${canvasWidth}x${canvasHeight}_${thicknessMode}.png`;
    exportToOpenPosePNG(keypoints, canvasWidth, canvasHeight, filename, {
      thicknessMode,
      limbWidth: currentStickDims.limbWidth,
      jointRadius: currentStickDims.jointRadius,
    });
  };

  // Export 2: Standard OpenPose JSON
  const handleDownloadJSON = () => {
    const filename = `${selectedPose?.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || "pose"}_openpose.json`;
    exportToOpenPoseJSON(keypoints, canvasWidth, canvasHeight, filename);
  };

  // Copy Prompt Feedback
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
          <div className="toolbar-top-row">
            <div className="toolbar-left">
              <span className="toolbar-badge">
                <span className="status-dot live" />
                18-Joint COCO Rig
              </span>
              <span className="active-canvas-badge" title="Ukuran aktif kanvas yang akan diekspor ke PNG">
                <span className="badge-dim">{canvasWidth} × {canvasHeight} px</span>
                <span className="badge-ratio">
                  {canvasWidth === 1024 && canvasHeight === 1536
                    ? "2:3 SDXL Match"
                    : canvasWidth === canvasHeight
                    ? "1:1 Square"
                    : canvasWidth < canvasHeight
                    ? "Portrait"
                    : "Landscape"}
                </span>
              </span>

              {isDirty ? (
                <span className="pose-modified-badge" title="Pose telah dimodifikasi secara manual">
                  • Dimodifikasi
                </span>
              ) : (
                <span className="pose-pristine-badge" title="Pose bawaan preset tanpa modifikasi">
                  • Preset Bawaan
                </span>
              )}
            </div>

            {/* Quick Actions (Undo, Redo, Mirror, Center, Reset) */}
            <div className="toolbar-right">
              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo edit (Ctrl + Z)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                <span>Undo</span>
              </button>

              <button
                type="button"
                className="canvas-tool-btn"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo edit (Ctrl + Y)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                </svg>
                <span>Redo</span>
              </button>

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
                title="Reset ke bentuk pose asli preset"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Dimension Controls Row */}
          <div className="toolbar-dimension-row">
            {/* Quick Presets */}
            <div className="preset-pill-group">
              <span className="preset-group-label">Preset:</span>
              <button
                type="button"
                className={`aspect-pill highlight ${canvasWidth === 1024 && canvasHeight === 1536 ? "active" : ""}`}
                onClick={() => applyCanvasDimensions(1024, 1536)}
                title="1024×1536 (2:3) — Resolusi ideal SDXL & Illustrious Portrait"
              >
                1024×1536 (SDXL 2:3)
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 1024 && canvasHeight === 1024 ? "active" : ""}`}
                onClick={() => applyCanvasDimensions(1024, 1024)}
                title="1024×1024 (1:1) — SDXL & Flux Square"
              >
                1024×1024 (1:1)
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 832 && canvasHeight === 1216 ? "active" : ""}`}
                onClick={() => applyCanvasDimensions(832, 1216)}
                title="832×1216 — SDXL Standard Portrait"
              >
                832×1216
              </button>
              <button
                type="button"
                className={`aspect-pill ${canvasWidth === 512 && canvasHeight === 768 ? "active" : ""}`}
                onClick={() => applyCanvasDimensions(512, 768)}
                title="512×768 (2:3) — SD 1.5 Portrait"
              >
                512×768 (SD1.5)
              </button>

              {/* More Presets Dropdown */}
              <select
                className="preset-select-dropdown"
                value={`${canvasWidth}x${canvasHeight}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  if (w && h) applyCanvasDimensions(w, h);
                }}
                title="Pilih preset resolusi lainnya"
              >
                <option value="" disabled>Lainnya...</option>
                {CANVAS_PRESETS.map((p) => (
                  <option key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                    {p.label} — {p.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Dimension Input Form */}
            <form onSubmit={handleApplyCustomDimensions} className="custom-dim-form">
              <span className="dim-form-label">Custom:</span>
              <input
                type="number"
                min="256"
                max="4096"
                step="64"
                value={inputW}
                onChange={(e) => setInputW(e.target.value)}
                placeholder="W"
                className="dim-num-input"
                title="Lebar canvas dalam piksel (256 - 4096)"
              />
              <span className="dim-multiplier">×</span>
              <input
                type="number"
                min="256"
                max="4096"
                step="64"
                value={inputH}
                onChange={(e) => setInputH(e.target.value)}
                placeholder="H"
                className="dim-num-input"
                title="Tinggi canvas dalam piksel (256 - 4096)"
              />
              <button
                type="button"
                className="dim-swap-btn"
                onClick={handleSwapDimensions}
                title="Tukar Lebar & Tinggi (Putar Portrait ⇄ Landscape)"
              >
                ⇄
              </button>
              <button
                type="submit"
                className="dim-apply-btn"
                title="Terapkan ukuran custom ke kanvas"
              >
                Terapkan
              </button>
            </form>

            {/* Resize Mode (Preserve Anatomy vs Stretch) */}
            <div className="resize-mode-control">
              <button
                type="button"
                className={`resize-mode-toggle ${resizeMode}`}
                onClick={() => setResizeMode((prev) => (prev === "preserve" ? "stretch" : "preserve"))}
                title={
                  resizeMode === "preserve"
                    ? "Mode Kunci Anatomi: Menjaga rasio tubuh 1:1 tanpa melar / distorsi (menambah ruang hitam otomatis)"
                    : "Mode Stretch: Menarik semua sendi tubuh mengisi rasio kanvas baru"
                }
              >
                {resizeMode === "preserve" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Kunci Anatomi (Fit)</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    <span>Stretch Kanvas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Canvas Wrapper with Zoom & Pan */}
        <div ref={viewportRef} className="canvas-viewport-wrapper">
          {/* Zoom & Viewport Controls Bar */}
          <div className="viewport-zoom-bar">
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomOut}
              title="Zoom Out (-)"
            >
              −
            </button>
            <span className="zoom-indicator" title="Current Zoom Level">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomIn}
              title="Zoom In (+)"
            >
              +
            </button>
            <button
              type="button"
              className="zoom-fit-btn"
              onClick={handleZoomReset}
              title="Reset Zoom ke 100%"
            >
              Fit
            </button>
          </div>

          {/* Interactive HTML5 Canvas */}
          <div
            className="canvas-zoom-container"
            style={{
              transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
              transformOrigin: "center center",
              transition: isDraggingRef.current ? "none" : "transform 0.15s ease-out",
            }}
          >
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
          </div>

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
            <span>💡 Geser titik sendi untuk memodifikasi pose • Ctrl+Z untuk Undo • Export siap pakai untuk ControlNet</span>
          </div>
        </div>

        {/* Background & Trace Overlay Controls + Stick Thickness Controls */}
        <div className="canvas-bottom-controls">
          {/* Stick Thickness Controls (SDXL, Flux, Heavy, SD 1.5) */}
          <div className="stick-thickness-bar">
            <div className="stick-thickness-group">
              <span className="control-label">Ketebalan Garis (Stick):</span>
              <button
                type="button"
                className={`thickness-pill ${thicknessMode === "sdxl" ? "active" : ""}`}
                onClick={() => setThicknessMode("sdxl")}
                title="SDXL & Xinsir (Standar Resmi): Garis tebal (~15px pada 1024px) agar sendi terbaca akurat oleh model ControlNet SDXL"
              >
                <span className="dot sdxl" />
                SDXL / Xinsir (Tebal)
              </button>
              <button
                type="button"
                className={`thickness-pill ${thicknessMode === "flux_heavy" ? "active" : ""}`}
                onClick={() => setThicknessMode("flux_heavy")}
                title="Flux & Heavy: Ekstra tebal (~22px pada 1024px) untuk resolusi tinggi & model Flux.1 Union"
              >
                <span className="dot heavy" />
                Flux / Heavy (Super Tebal)
              </button>
              <button
                type="button"
                className={`thickness-pill ${thicknessMode === "sd15" ? "active" : ""}`}
                onClick={() => setThicknessMode("sd15")}
                title="SD 1.5: Garis klasik tipis (~6px pada 1024px) standar model 512x512"
              >
                <span className="dot sd15" />
                SD 1.5 (Tipis)
              </button>
              <button
                type="button"
                className={`thickness-pill ${thicknessMode === "custom" ? "active" : ""}`}
                onClick={() => setThicknessMode("custom")}
                title="Manual Slider: Atur ketebalan piksel garis & bulatan sendi secara bebas"
              >
                Manual Slider
              </button>
            </div>

            <div className="thickness-live-indicator" title="Ketebalan aktual pada canvas & file export">
              <span>Garis: <strong>{currentStickDims.limbWidth}px</strong></span>
              <span>•</span>
              <span>Sendi: <strong>{currentStickDims.jointRadius}px</strong></span>
            </div>
          </div>

          {/* Custom Manual Thickness Sliders */}
          {thicknessMode === "custom" && (
            <div className="custom-thickness-slider-row">
              <div className="slider-item">
                <span className="slider-label">Ketebalan Garis (Limb): <strong>{customLimbWidth}px</strong></span>
                <input
                  type="range"
                  min="4"
                  max="40"
                  step="1"
                  value={customLimbWidth}
                  onChange={(e) => setCustomLimbWidth(parseInt(e.target.value, 10))}
                  className="thickness-slider"
                />
              </div>
              <div className="slider-item">
                <span className="slider-label">Ukuran Bulatan Sendi (Joint): <strong>{customJointRadius}px</strong></span>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={customJointRadius}
                  onChange={(e) => setCustomJointRadius(parseInt(e.target.value, 10))}
                  className="thickness-slider"
                />
              </div>
            </div>
          )}

          {/* Background Layer Controls */}
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
                  <strong>Download OpenPose PNG ({THICKNESS_PROFILES[thicknessMode].badge})</strong>
                  <small>Black Background • {canvasWidth}×{canvasHeight}px • Limb {currentStickDims.limbWidth}px</small>
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
                  <strong>Resolusi &amp; Aspect Ratio:</strong> Samakan ukuran canvas di sini dengan <code>Empty Latent Image</code> ComfyUI Anda (misal <strong>1024×1536</strong>) agar skeleton tidak melar / squashed saat diproses oleh Apply ControlNet.
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
