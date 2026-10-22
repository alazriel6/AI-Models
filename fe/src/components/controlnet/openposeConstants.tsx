// Standard OpenPose COCO 18-Keypoint Definition and Color Palette
// Compatible with ControlNet OpenPose (v11p), DWPose, OpenPose Editor, and ComfyUI

export interface JointPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface JointMetadata {
  id: number;
  name: string;
  shortName: string;
  color: [number, number, number]; // [R, G, B]
}

export interface LimbConnection {
  from: number;
  to: number;
  color: [number, number, number]; // [R, G, B]
}

// 18 Keypoints defined in standard OpenPose specification
export const OPENPOSE_JOINTS: JointMetadata[] = [
  { id: 0, name: "Nose", shortName: "Nose", color: [0, 0, 255] },
  { id: 1, name: "Neck", shortName: "Neck", color: [255, 0, 0] },
  { id: 2, name: "Right Shoulder", shortName: "R-Shldr", color: [255, 85, 0] },
  { id: 3, name: "Right Elbow", shortName: "R-Elbow", color: [255, 170, 0] },
  { id: 4, name: "Right Wrist", shortName: "R-Wrist", color: [255, 255, 0] },
  { id: 5, name: "Left Shoulder", shortName: "L-Shldr", color: [170, 255, 0] },
  { id: 6, name: "Left Elbow", shortName: "L-Elbow", color: [85, 255, 0] },
  { id: 7, name: "Left Wrist", shortName: "L-Wrist", color: [0, 255, 0] },
  { id: 8, name: "Right Hip", shortName: "R-Hip", color: [0, 255, 85] },
  { id: 9, name: "Right Knee", shortName: "R-Knee", color: [0, 255, 170] },
  { id: 10, name: "Right Ankle", shortName: "R-Ankle", color: [0, 255, 255] },
  { id: 11, name: "Left Hip", shortName: "L-Hip", color: [0, 170, 255] },
  { id: 12, name: "Left Knee", shortName: "L-Knee", color: [0, 85, 255] },
  { id: 13, name: "Left Ankle", shortName: "L-Ankle", color: [0, 0, 255] },
  { id: 14, name: "Right Eye", shortName: "R-Eye", color: [255, 0, 170] },
  { id: 15, name: "Left Eye", shortName: "L-Eye", color: [170, 0, 255] },
  { id: 16, name: "Right Ear", shortName: "R-Ear", color: [255, 0, 255] },
  { id: 17, name: "Left Ear", shortName: "L-Ear", color: [255, 0, 85] },
];

// 17 Limb connections with strict OpenPose RGB color coding
export const OPENPOSE_LIMBS: LimbConnection[] = [
  { from: 1, to: 2, color: [255, 85, 0] },   // Neck -> R-Shoulder
  { from: 1, to: 5, color: [170, 255, 0] },  // Neck -> L-Shoulder
  { from: 2, to: 3, color: [255, 170, 0] },  // R-Shoulder -> R-Elbow
  { from: 3, to: 4, color: [255, 255, 0] },  // R-Elbow -> R-Wrist
  { from: 5, to: 6, color: [85, 255, 0] },   // L-Shoulder -> L-Elbow
  { from: 6, to: 7, color: [0, 255, 0] },    // L-Elbow -> L-Wrist
  { from: 1, to: 8, color: [0, 255, 85] },   // Neck -> R-Hip
  { from: 8, to: 9, color: [0, 255, 170] },  // R-Hip -> R-Knee
  { from: 9, to: 10, color: [0, 255, 255] }, // R-Knee -> R-Ankle
  { from: 1, to: 11, color: [0, 170, 255] }, // Neck -> L-Hip
  { from: 11, to: 12, color: [0, 85, 255] }, // L-Hip -> L-Knee
  { from: 12, to: 13, color: [0, 0, 255] },  // L-Knee -> L-Ankle
  { from: 1, to: 0, color: [255, 0, 0] },    // Neck -> Nose
  { from: 0, to: 14, color: [255, 0, 170] }, // Nose -> R-Eye
  { from: 14, to: 16, color: [255, 0, 255] },// R-Eye -> R-Ear
  { from: 0, to: 15, color: [170, 0, 255] }, // Nose -> L-Eye
  { from: 15, to: 17, color: [255, 0, 85] }, // L-Eye -> L-Ear
];

export function rgbToString(color: [number, number, number], alpha: number = 1.0): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

import { getPoseBounds } from "./poseTransform";

export type StickThicknessMode = "sdxl" | "flux_heavy" | "sd15" | "custom";

export interface ThicknessConfig {
  mode: StickThicknessMode;
  label: string;
  badge: string;
  desc: string;
}

export const THICKNESS_PROFILES: Record<StickThicknessMode, ThicknessConfig> = {
  sdxl: {
    mode: "sdxl",
    label: "SDXL & Xinsir (Tebal)",
    badge: "SDXL / Xinsir",
    desc: "Standar resmi Xinsir SDXL (scale_stick_for_xinsr_cn) agar sendi terbaca akurat.",
  },
  flux_heavy: {
    mode: "flux_heavy",
    label: "Flux & Heavy (Super Tebal)",
    badge: "Flux / Extra Heavy",
    desc: "Garis ekstra tebal untuk resolusi tinggi (>= 1536px) & model Flux.1 Union.",
  },
  sd15: {
    mode: "sd15",
    label: "SD 1.5 (Tipis)",
    badge: "SD 1.5",
    desc: "Standar klasik OpenPose SD 1.5 beresolusi 512x512.",
  },
  custom: {
    mode: "custom",
    label: "Manual Slider",
    badge: "Custom px",
    desc: "Atur ketebalan piksel garis & bulatan sendi secara manual dengan slider.",
  },
};

/**
 * Centralized rendering configuration for OpenPose skeleton.
 */
export interface SkeletonRenderConfig {
  /** Target context: "canvas" for interactive editor with screen compensation, "export" for raw buffer PNG */
  target?: "canvas" | "export";
  /** Screen display scale: (CSS rendered width / Canvas buffer width) */
  displayScale?: number;
  /** Thickness mode: sdxl, flux_heavy, sd15, custom */
  thicknessMode?: StickThicknessMode;
  /** Show joints circles */
  showJoints?: boolean;
  /** Show limbs stick lines */
  showLimbs?: boolean;
  /** Joint radius override */
  jointRadius?: number;
  /** Limb width override */
  limbWidth?: number;
  /** Custom limb width in pixels */
  customLimbWidth?: number;
  /** Custom joint radius in pixels */
  customJointRadius?: number;
  /** Active / selected joint index */
  activeJointId?: number | null;
  /** Hovered joint index */
  hoverJointId?: number | null;
  /** Opacity of entire skeleton (0.0 to 1.0) */
  opacity?: number;
  /** High contrast outline around joints for visibility on any background */
  drawOutlines?: boolean;
}

/**
 * Computes limb width and joint radius based on canvas width and target thickness mode
 */
export function getStickDimensions(
  canvasWidth: number,
  mode: StickThicknessMode = "sdxl",
  customLimbWidth?: number,
  customJointRadius?: number
): { limbWidth: number; jointRadius: number } {
  if (mode === "custom" && customLimbWidth !== undefined && customJointRadius !== undefined) {
    return {
      limbWidth: Math.max(3, customLimbWidth),
      jointRadius: Math.max(4, customJointRadius),
    };
  }

  const safeW = Math.max(256, canvasWidth);

  switch (mode) {
    case "flux_heavy":
      // ~22px limb, ~24px joint at 1024px width (~33px at 1536px)
      return {
        limbWidth: Math.max(12, Math.round(safeW / 46)),
        jointRadius: Math.max(14, Math.round(safeW / 42)),
      };
    case "sd15":
      // ~6px limb, ~7px joint at 1024px width (3-4px at 512px)
      return {
        limbWidth: Math.max(3, Math.round(safeW / 170)),
        jointRadius: Math.max(4, Math.round(safeW / 150)),
      };
    case "sdxl":
    default:
      // ~15px limb, ~17px joint at 1024px width (~23px at 1536px)
      // Matches official xinsir/controlnet-openpose-sdxl-1.0 training specs
      return {
        limbWidth: Math.max(8, Math.round(safeW / 68)),
        jointRadius: Math.max(10, Math.round(safeW / 60)),
      };
  }
}

/**
 * Computes exact rendering metrics (with screen-space compensation for the interactive editor)
 */
export function computeRenderMetrics(
  canvasWidth: number,
  config: SkeletonRenderConfig = {}
): {
  limbWidth: number;
  jointRadius: number;
  activeJointRadius: number;
  hoverJointRadius: number;
  outlineWidth: number;
  hitThreshold: number;
} {
  const {
    target = "canvas",
    displayScale = 1.0,
    thicknessMode = "sdxl",
    customLimbWidth,
    customJointRadius,
  } = config;

  const baseDims = getStickDimensions(canvasWidth, thicknessMode, customLimbWidth, customJointRadius);

  if (target === "export") {
    return {
      limbWidth: baseDims.limbWidth,
      jointRadius: baseDims.jointRadius,
      activeJointRadius: baseDims.jointRadius,
      hoverJointRadius: baseDims.jointRadius,
      outlineWidth: 0,
      hitThreshold: 24,
    };
  }

  // Interactive Canvas Mode:
  // Prevent joints and bones from becoming microscopic on scaled-down preview screens.
  const safeScale = Math.max(0.05, Math.min(4.0, displayScale));

  // Desired minimum screen sizes (in CSS px):
  // Limb: at least 4px on screen, max 16px
  // Joint: at least 7px radius on screen, max 20px
  const screenLimb = Math.max(4, Math.min(16, baseDims.limbWidth * safeScale));
  const screenJoint = Math.max(7, Math.min(20, baseDims.jointRadius * safeScale));

  const compensatedLimbWidth = Math.round(screenLimb / safeScale);
  const compensatedJointRadius = Math.round(screenJoint / safeScale);
  const compensatedOutlineWidth = Math.max(1.5, Math.round(2.5 / safeScale));
  const compensatedHitThreshold = Math.max(24, Math.round(22 / safeScale));

  return {
    limbWidth: compensatedLimbWidth,
    jointRadius: compensatedJointRadius,
    activeJointRadius: Math.round(compensatedJointRadius * 1.5),
    hoverJointRadius: Math.round(compensatedJointRadius * 1.25),
    outlineWidth: compensatedOutlineWidth,
    hitThreshold: compensatedHitThreshold,
  };
}

/**
 * Draws standard OpenPose skeleton onto an HTML5 Canvas 2D context.
 * Adheres to official OpenPose COCO format and color palette.
 */
export function drawSkeletonOnCanvas(
  ctx: CanvasRenderingContext2D,
  keypoints: JointPoint[],
  scaleX: number = 1.0,
  scaleY: number = 1.0,
  config: SkeletonRenderConfig = {}
) {
  if (!keypoints || keypoints.length === 0) return;

  const {
    showJoints = true,
    showLimbs = true,
    activeJointId = null,
    hoverJointId = null,
    opacity = 1.0,
    target = "canvas",
    drawOutlines = target === "canvas",
  } = config;

  // Use canvas buffer width for metric calculation
  const canvasW = ctx.canvas.width || 1024;
  const metrics = computeRenderMetrics(canvasW, config);

  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = Math.max(0.1, Math.min(1.0, opacity));

  // 1. Draw Limbs
  if (showLimbs) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const limb of OPENPOSE_LIMBS) {
      const p1 = keypoints[limb.from];
      const p2 = keypoints[limb.to];

      if (!p1 || !p2 || p1.confidence <= 0 || p2.confidence <= 0) {
        continue;
      }

      const x1 = p1.x * scaleX;
      const y1 = p1.y * scaleY;
      const x2 = p2.x * scaleX;
      const y2 = p2.y * scaleY;

      // Optional limb outline for contrast in editor
      if (drawOutlines && target === "canvas") {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = metrics.limbWidth + metrics.outlineWidth * 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = rgbToString(limb.color, target === "export" ? 1.0 : 0.95);
      ctx.lineWidth = metrics.limbWidth;
      ctx.stroke();
    }
  }

  // 2. Draw Keypoints / Joints
  if (showJoints) {
    for (let i = 0; i < OPENPOSE_JOINTS.length; i++) {
      const pt = keypoints[i];
      if (!pt || pt.confidence <= 0) continue;

      const meta = OPENPOSE_JOINTS[i];
      const x = pt.x * scaleX;
      const y = pt.y * scaleY;
      const isActive = activeJointId === i;
      const isHover = hoverJointId === i;

      const currentRadius = isActive
        ? metrics.activeJointRadius
        : isHover
        ? metrics.hoverJointRadius
        : metrics.jointRadius;

      // Under-glow ring for active joint in editor
      if (isActive && target === "canvas") {
        ctx.beginPath();
        ctx.arc(x, y, currentRadius + metrics.outlineWidth * 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
        ctx.fill();
      }

      // Base joint circle
      ctx.beginPath();
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(meta.color, 1.0);
      ctx.fill();

      // Border / outline
      if (target === "canvas") {
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        if (isActive) {
          ctx.lineWidth = metrics.outlineWidth * 1.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        } else if (isHover) {
          ctx.lineWidth = metrics.outlineWidth * 1.2;
          ctx.strokeStyle = "#fbbf24";
          ctx.stroke();
        } else if (drawOutlines) {
          ctx.lineWidth = Math.max(1, metrics.outlineWidth * 0.8);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
          ctx.stroke();
        }
      }
    }
  }

  ctx.globalAlpha = prevAlpha;
}

/**
 * Exports genuine ControlNet OpenPose black background PNG with thick sticks for SDXL/Flux
 */
export function exportToOpenPosePNG(
  keypoints: JointPoint[],
  width: number,
  height: number,
  filename: string = "controlnet_openpose_skeleton.png",
  options: {
    thicknessMode?: StickThicknessMode;
    limbWidth?: number;
    jointRadius?: number;
  } = {}
): void {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return;

  // ControlNet requires solid black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Render official colored skeleton in export mode
  drawSkeletonOnCanvas(ctx, keypoints, 1.0, 1.0, {
    target: "export",
    showJoints: true,
    showLimbs: true,
    thicknessMode: options.thicknessMode || "sdxl",
    limbWidth: options.limbWidth,
    jointRadius: options.jointRadius,
    drawOutlines: false,
    opacity: 1.0,
  });

  // Download file
  const link = document.createElement("a");
  link.download = filename;
  link.href = offscreen.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports standard OpenPose / DWPose JSON format
 */
export function exportToOpenPoseJSON(
  keypoints: JointPoint[],
  width: number,
  height: number,
  filename: string = "openpose_pose.json"
): void {
  // Convert 18 points into flat array [x0, y0, c0, x1, y1, c1, ...]
  const flatPoints: number[] = [];
  for (let i = 0; i < 18; i++) {
    const pt = keypoints[i] || { x: 0, y: 0, confidence: 0 };
    flatPoints.push(Math.round(pt.x), Math.round(pt.y), Number(pt.confidence.toFixed(2)));
  }

  const jsonPayload = {
    version: 1.3,
    people: [
      {
        person_id: [-1],
        pose_keypoints_2d: flatPoints,
        face_keypoints_2d: [],
        hand_left_keypoints_2d: [],
        hand_right_keypoints_2d: []
      }
    ],
    canvas_width: width,
    canvas_height: height
  };

  const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw JSON string into JointPoint[]
 */
export function parseKeypointsFromJSON(jsonString: string): JointPoint[] {
  try {
    const parsed = JSON.parse(jsonString);

    // Case 1: Simple array of [x, y, confidence]
    if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
      return parsed.map((item: number[]) => ({
        x: item[0] ?? 0,
        y: item[1] ?? 0,
        confidence: item[2] ?? 1.0,
      }));
    }

    // Case 2: OpenPose standard { people: [ { pose_keypoints_2d: [...] } ] }
    if (parsed.people && Array.isArray(parsed.people) && parsed.people.length > 0) {
      const flat = parsed.people[0].pose_keypoints_2d;
      if (Array.isArray(flat)) {
        const result: JointPoint[] = [];
        for (let i = 0; i < flat.length; i += 3) {
          result.push({
            x: flat[i] || 0,
            y: flat[i + 1] || 0,
            confidence: flat[i + 2] ?? 1.0,
          });
        }
        return result;
      }
    }

    return [];
  } catch (err) {
    console.error("Failed to parse keypoints data:", err);
    return [];
  }
}

/**
 * Authentic Mini SVG Thumbnail for Pose Library Cards.
 * Parses the pose's actual 18-joint coordinates and dynamically frames the pose.
 */
export const PoseThumbnailSvg: React.FC<{
  keypointsData: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({ keypointsData, width = 512, height = 768, className = "" }) => {
  const points = parseKeypointsFromJSON(keypointsData);
  if (!points || points.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <rect width={width} height={height} fill="#050811" />
      </svg>
    );
  }

  const bounds = getPoseBounds(points);
  const pad = bounds.isValid ? Math.max(bounds.width, bounds.height) * 0.16 : 40;
  const vbX = bounds.isValid ? Math.round(bounds.minX - pad) : 0;
  const vbY = bounds.isValid ? Math.round(bounds.minY - pad) : 0;
  const vbW = bounds.isValid ? Math.round(bounds.width + pad * 2) : width;
  const vbH = bounds.isValid ? Math.round(bounds.height + pad * 2) : height;
  const strokeWidth = bounds.isValid ? Math.max(10, Math.round(vbW / 32)) : 16;
  const jointRadius = bounds.isValid ? Math.max(8, Math.round(vbW / 38)) : 13;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#050811" />
      {/* Draw 17 OpenPose Limbs */}
      {OPENPOSE_LIMBS.map((limb, idx) => {
        const p1 = points[limb.from];
        const p2 = points[limb.to];
        if (!p1 || !p2 || p1.confidence <= 0 || p2.confidence <= 0) return null;
        return (
          <line
            key={`limb-${idx}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={`rgb(${limb.color.join(",")})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
      {/* Draw 18 OpenPose Keypoint Circles */}
      {OPENPOSE_JOINTS.map((joint, idx) => {
        const pt = points[joint.id];
        if (!pt || pt.confidence <= 0) return null;
        return (
          <circle
            key={`joint-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={jointRadius}
            fill={`rgb(${joint.color.join(",")})`}
          />
        );
      })}
    </svg>
  );
};

