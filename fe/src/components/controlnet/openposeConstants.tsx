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

/**
 * Draws standard OpenPose skeleton onto an HTML5 Canvas 2D context.
 */
export function drawSkeletonOnCanvas(
  ctx: CanvasRenderingContext2D,
  keypoints: JointPoint[],
  scaleX: number = 1.0,
  scaleY: number = 1.0,
  options: {
    showJoints?: boolean;
    showLimbs?: boolean;
    jointRadius?: number;
    limbWidth?: number;
    activeJointId?: number | null;
    hoverJointId?: number | null;
  } = {}
) {
  const {
    showJoints = true,
    showLimbs = true,
    jointRadius = 5,
    limbWidth = 4,
    activeJointId = null,
    hoverJointId = null,
  } = options;

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

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = rgbToString(limb.color, 0.95);
      ctx.lineWidth = limbWidth;
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

      ctx.beginPath();
      const currentRadius = isActive ? jointRadius * 1.6 : isHover ? jointRadius * 1.3 : jointRadius;
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(meta.color, 1.0);
      ctx.fill();

      // Outer ring for active or hovered joint
      if (isActive || isHover) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }
    }
  }
}

/**
 * Exports genuine ControlNet OpenPose black background PNG
 */
export function exportToOpenPosePNG(
  keypoints: JointPoint[],
  width: number,
  height: number,
  filename: string = "controlnet_openpose_skeleton.png"
): void {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return;

  // ControlNet requires solid black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Render official colored skeleton
  drawSkeletonOnCanvas(ctx, keypoints, 1.0, 1.0, {
    showJoints: true,
    showLimbs: true,
    jointRadius: Math.max(4, Math.round(width / 110)),
    limbWidth: Math.max(3, Math.round(width / 130)),
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
 * Parses the pose's actual 18-joint coordinates and renders exact OpenPose limbs and joints.
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
      <svg width="60" height="90" viewBox={`0 0 ${width} ${height}`} className={className}>
        <rect width={width} height={height} fill="#000000" />
      </svg>
    );
  }

  return (
    <svg width="60" height="90" viewBox={`0 0 ${width} ${height}`} className={className}>
      <rect width={width} height={height} fill="#000000" />
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
            strokeWidth={18}
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
            r={16}
            fill={`rgb(${joint.color.join(",")})`}
          />
        );
      })}
    </svg>
  );
};

