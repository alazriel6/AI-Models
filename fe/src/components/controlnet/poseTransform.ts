/**
 * Pose Transformation, Coordinate System & Normalization Engine
 * 
 * Provides pure mathematical functions for:
 * 1. Bounding box calculation of 18-joint OpenPose skeletons
 * 2. Aspect-ratio preserving transformations (contain / letterbox)
 * 3. Validation & sanitization of raw preset data
 * 4. Coordinate conversions (Normalized <-> Canvas <-> Viewport)
 * 5. Screen-space hit testing and centering
 */

import { type JointPoint, OPENPOSE_JOINTS } from "./openposeConstants";

export interface PoseBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  validCount: number;
  isValid: boolean;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface FitOptions {
  /** Padding as a fraction of canvas dimension (e.g. 0.08 = 8% margin). Default: 0.08 */
  paddingRatio?: number;
  /** Keep natural 1:1 human anatomical aspect ratio without stretching. Default: true */
  maintainAspect?: boolean;
  /** Center the bounding box in the target canvas. Default: true */
  center?: boolean;
}

export interface PoseTransform {
  scale: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calculates the bounding box of valid joints in a pose.
 * Safely ignores joints with zero or negative confidence, NaN, or non-finite numbers.
 */
export function getPoseBounds(points: JointPoint[]): PoseBounds {
  if (!points || !Array.isArray(points) || points.length === 0) {
    return {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100,
      width: 100,
      height: 100,
      centerX: 50,
      centerY: 50,
      validCount: 0,
      isValid: false,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let validCount = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (
      !pt ||
      typeof pt.x !== "number" ||
      typeof pt.y !== "number" ||
      !Number.isFinite(pt.x) ||
      !Number.isFinite(pt.y) ||
      (pt.confidence !== undefined && pt.confidence <= 0)
    ) {
      continue;
    }

    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
    validCount++;
  }

  if (validCount === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100,
      width: 100,
      height: 100,
      centerX: 50,
      centerY: 50,
      validCount: 0,
      isValid: false,
    };
  }

  // Handle collapsed bounding boxes (e.g. all points on a single point or line)
  let width = maxX - minX;
  let height = maxY - minY;

  if (width < 4) {
    width = 10;
    minX -= 5;
    maxX += 5;
  }

  if (height < 4) {
    height = 10;
    minY -= 5;
    maxY += 5;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    validCount,
    isValid: validCount >= 4,
  };
}

/**
 * Checks if keypoints are in normalized [0, 1] coordinate space.
 */
export function isNormalizedCoordinates(points: JointPoint[]): boolean {
  if (!points || points.length === 0) return false;
  let hasValid = false;
  let maxCoord = 0;

  for (const pt of points) {
    if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y) && pt.confidence > 0) {
      hasValid = true;
      if (pt.x > maxCoord) maxCoord = pt.x;
      if (pt.y > maxCoord) maxCoord = pt.y;
    }
  }

  // If coordinates never exceed 1.05 and are strictly positive, it is normalized [0, 1]
  return hasValid && maxCoord > 0 && maxCoord <= 1.05;
}

/**
 * Validates raw keypoints and returns a clean, sanitized 18-joint array.
 * If points are normalized [0, 1], scales them to reference canvas dimensions.
 * Ensures exactly 18 COCO keypoints with valid numbers.
 */
export function validateAndSanitizePose(
  rawPoints: JointPoint[],
  referenceCanvas: CanvasDimensions = { width: 512, height: 768 }
): {
  sanitized: JointPoint[];
  sourceSize: CanvasDimensions;
  isValid: boolean;
  error?: string;
} {
  const refW = referenceCanvas.width > 0 ? referenceCanvas.width : 512;
  const refH = referenceCanvas.height > 0 ? referenceCanvas.height : 768;

  if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length === 0) {
    return {
      sanitized: createFallbackPose(refW, refH),
      sourceSize: { width: refW, height: refH },
      isValid: false,
      error: "Data pose kosong atau bukan array.",
    };
  }

  const isNorm = isNormalizedCoordinates(rawPoints);
  const sanitized: JointPoint[] = [];

  for (let i = 0; i < OPENPOSE_JOINTS.length; i++) {
    const raw = rawPoints[i];
    if (
      raw &&
      Number.isFinite(raw.x) &&
      Number.isFinite(raw.y) &&
      (raw.confidence === undefined || raw.confidence > 0)
    ) {
      const x = isNorm ? raw.x * refW : raw.x;
      const y = isNorm ? raw.y * refH : raw.y;
      const confidence = raw.confidence !== undefined && Number.isFinite(raw.confidence) ? raw.confidence : 1.0;
      sanitized.push({ x, y, confidence });
    } else {
      // Inactive or missing joint placeholder
      sanitized.push({ x: 0, y: 0, confidence: 0 });
    }
  }

  const bounds = getPoseBounds(sanitized);

  if (!bounds.isValid) {
    return {
      sanitized: createFallbackPose(refW, refH),
      sourceSize: { width: refW, height: refH },
      isValid: false,
      error: "Pose tidak memiliki cukup joint valid untuk dirender.",
    };
  }

  return {
    sanitized,
    sourceSize: { width: refW, height: refH },
    isValid: true,
  };
}

/**
 * Fits a pose from source canvas dimensions onto target canvas dimensions.
 * 
 * Rules:
 * - Always preserves aspect ratio (no horizontal or vertical distortion).
/**
 * Calculates translation and scaling factors to fit a pose bounding box into a target canvas.
 * Preserves 1:1 human anatomical aspect ratio without distortion.
 */
export function calculatePoseTransform(
  points: JointPoint[],
  targetCanvas: CanvasDimensions,
  sourceCanvas: CanvasDimensions = { width: 512, height: 768 },
  options: FitOptions = {}
): PoseTransform {
  const { paddingRatio = 0.08, maintainAspect = true, center = true } = options;

  const srcW = Math.max(10, sourceCanvas.width || 512);
  const srcH = Math.max(10, sourceCanvas.height || 768);
  const tgtW = Math.max(10, targetCanvas.width || 1024);
  const tgtH = Math.max(10, targetCanvas.height || 1536);

  const bounds = getPoseBounds(points);

  if (!bounds.isValid) {
    return { scale: 1, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  if (maintainAspect) {
    const availableW = tgtW * (1 - paddingRatio * 2);
    const availableH = tgtH * (1 - paddingRatio * 2);

    const scaleByCanvas = Math.min(availableW / srcW, availableH / srcH);
    const uniformScale = scaleByCanvas > 0 ? scaleByCanvas : 1;

    let offsetX = 0;
    let offsetY = 0;

    if (center) {
      offsetX = Math.round(tgtW / 2 - bounds.centerX * uniformScale);
      offsetY = Math.round(tgtH / 2 - bounds.centerY * uniformScale);
    } else {
      offsetX = Math.round((tgtW - srcW * uniformScale) / 2);
      offsetY = Math.round((tgtH - srcH * uniformScale) / 2);
    }

    return {
      scale: uniformScale,
      scaleX: uniformScale,
      scaleY: uniformScale,
      offsetX,
      offsetY,
    };
  }

  // Non-uniform stretch mode
  const scaleX = tgtW / srcW;
  const scaleY = tgtH / srcH;
  return {
    scale: (scaleX + scaleY) / 2,
    scaleX,
    scaleY,
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Transforms a point from pose coordinate space to canvas coordinate space.
 */
export function poseToCanvasCoordinates(
  point: JointPoint,
  transform: PoseTransform
): JointPoint {
  if (!point || point.confidence <= 0) {
    return { x: 0, y: 0, confidence: 0 };
  }
  return {
    x: Math.round(point.x * transform.scaleX + transform.offsetX),
    y: Math.round(point.y * transform.scaleY + transform.offsetY),
    confidence: point.confidence,
  };
}

/**
 * Transforms a point from canvas coordinate space back to pose coordinate space.
 */
export function canvasToPoseCoordinates(
  canvasPoint: { x: number; y: number },
  transform: PoseTransform
): { x: number; y: number } {
  const safeScaleX = transform.scaleX > 0 ? transform.scaleX : 1;
  const safeScaleY = transform.scaleY > 0 ? transform.scaleY : 1;
  return {
    x: (canvasPoint.x - transform.offsetX) / safeScaleX,
    y: (canvasPoint.y - transform.offsetY) / safeScaleY,
  };
}

/**
 * Fits a pose from source canvas dimensions onto target canvas dimensions.
 * 
 * Rules:
 * - Always preserves aspect ratio (no horizontal or vertical distortion).
 * - Centers the pose in target canvas with clean padding.
 * - Derived from raw unscaled preset data, so it NEVER shrinks on repeated calls.
 */
export function fitPoseToCanvas(
  rawPoints: JointPoint[],
  sourceSize: CanvasDimensions,
  targetSize: CanvasDimensions,
  options: FitOptions = {}
): JointPoint[] {
  const tgtW = Math.max(10, targetSize.width || 1024);
  const tgtH = Math.max(10, targetSize.height || 1536);

  const transform = calculatePoseTransform(rawPoints, targetSize, sourceSize, options);

  return rawPoints.map((pt) => {
    if (!pt || pt.confidence <= 0) {
      return { x: 0, y: 0, confidence: 0 };
    }

    const transformed = poseToCanvasCoordinates(pt, transform);

    return {
      x: Math.max(0, Math.min(tgtW, transformed.x)),
      y: Math.max(0, Math.min(tgtH, transformed.y)),
      confidence: pt.confidence,
    };
  });
}

/**
 * Translates the pose so its bounding box center aligns with the canvas center.
 */
export function centerPoseInCanvas(
  points: JointPoint[],
  canvasSize: CanvasDimensions
): JointPoint[] {
  const bounds = getPoseBounds(points);
  if (!bounds.isValid) return points;

  const targetCenterX = canvasSize.width / 2;
  const targetCenterY = canvasSize.height / 2;

  const deltaX = Math.round(targetCenterX - bounds.centerX);
  const deltaY = Math.round(targetCenterY - bounds.centerY);

  if (deltaX === 0 && deltaY === 0) return points;

  return points.map((pt) => {
    if (!pt || pt.confidence <= 0) return { ...pt };
    return {
      ...pt,
      x: Math.max(10, Math.min(canvasSize.width - 10, pt.x + deltaX)),
      y: Math.max(10, Math.min(canvasSize.height - 10, pt.y + deltaY)),
    };
  });
}

/**
 * Mirrors the pose horizontally and swaps Left & Right COCO limb pairs.
 */
export function flipPoseHorizontal(
  points: JointPoint[],
  canvasWidth: number
): JointPoint[] {
  if (!points || points.length === 0) return points;

  const swapPairs: [number, number][] = [
    [2, 5],   // R-Shoulder <-> L-Shoulder
    [3, 6],   // R-Elbow <-> L-Elbow
    [4, 7],   // R-Wrist <-> L-Wrist
    [8, 11],  // R-Hip <-> L-Hip
    [9, 12],  // R-Knee <-> L-Knee
    [10, 13], // R-Ankle <-> L-Ankle
    [14, 15], // R-Eye <-> L-Eye
    [16, 17], // R-Ear <-> L-Ear
  ];

  // 1. Mirror X coordinates
  const mirrored = points.map((pt) => {
    if (!pt || pt.confidence <= 0) return { ...pt };
    return {
      ...pt,
      x: canvasWidth - pt.x,
    };
  });

  // 2. Swap L and R limb keypoints
  const result = [...mirrored];
  for (const [r, l] of swapPairs) {
    if (result[r] && result[l]) {
      const temp = { ...result[r] };
      result[r] = { ...result[l] };
      result[l] = temp;
    }
  }

  return result;
}

/**
 * Finds the nearest joint to given canvas coordinates within a screen-space threshold.
 */
export function findNearestJoint(
  points: JointPoint[],
  canvasX: number,
  canvasY: number,
  thresholdCanvasPx: number = 24
): number | null {
  let closestId: number | null = null;
  let minDistance = thresholdCanvasPx;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt || pt.confidence <= 0) continue;
    const dist = Math.hypot(pt.x - canvasX, pt.y - canvasY);
    if (dist < minDistance) {
      minDistance = dist;
      closestId = i;
    }
  }

  return closestId;
}

/**
 * Generates an anatomically safe fallback standard standing pose.
 */
export function createFallbackPose(width: number = 512, height: number = 768): JointPoint[] {
  const cx = width / 2;
  const unit = height / 768;

  return [
    { x: cx, y: Math.round(110 * unit), confidence: 1.0 },       // 0: Nose
    { x: cx, y: Math.round(160 * unit), confidence: 1.0 },       // 1: Neck
    { x: cx - 45 * unit, y: Math.round(165 * unit), confidence: 1.0 }, // 2: R-Shoulder
    { x: cx - 65 * unit, y: Math.round(260 * unit), confidence: 1.0 }, // 3: R-Elbow
    { x: cx - 75 * unit, y: Math.round(360 * unit), confidence: 1.0 }, // 4: R-Wrist
    { x: cx + 45 * unit, y: Math.round(165 * unit), confidence: 1.0 }, // 5: L-Shoulder
    { x: cx + 65 * unit, y: Math.round(260 * unit), confidence: 1.0 }, // 6: L-Elbow
    { x: cx + 75 * unit, y: Math.round(360 * unit), confidence: 1.0 }, // 7: L-Wrist
    { x: cx - 30 * unit, y: Math.round(360 * unit), confidence: 1.0 }, // 8: R-Hip
    { x: cx - 32 * unit, y: Math.round(510 * unit), confidence: 1.0 }, // 9: R-Knee
    { x: cx - 35 * unit, y: Math.round(680 * unit), confidence: 1.0 }, // 10: R-Ankle
    { x: cx + 30 * unit, y: Math.round(360 * unit), confidence: 1.0 }, // 11: L-Hip
    { x: cx + 32 * unit, y: Math.round(510 * unit), confidence: 1.0 }, // 12: L-Knee
    { x: cx + 35 * unit, y: Math.round(680 * unit), confidence: 1.0 }, // 13: L-Ankle
    { x: cx - 10 * unit, y: Math.round(100 * unit), confidence: 1.0 }, // 14: R-Eye
    { x: cx + 10 * unit, y: Math.round(100 * unit), confidence: 1.0 }, // 15: L-Eye
    { x: cx - 22 * unit, y: Math.round(108 * unit), confidence: 1.0 }, // 16: R-Ear
    { x: cx + 22 * unit, y: Math.round(108 * unit), confidence: 1.0 }, // 17: L-Ear
  ];
}
