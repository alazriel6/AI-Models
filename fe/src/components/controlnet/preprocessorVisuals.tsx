import React from "react";

interface PreprocessorVisualProps {
  preprocessorId: string;
  stage: "source" | "extracted" | "result";
}

export const PreprocessorVisualGraphic: React.FC<PreprocessorVisualProps> = ({
  preprocessorId,
  stage,
}) => {
  switch (preprocessorId) {
    // ==========================================
    // 1. CANNY (HARD EDGE DETECTION)
    // ==========================================
    case "canny":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <defs>
              <linearGradient id="cannySky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="cannyCar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect width="600" height="360" fill="url(#cannySky)" />
            {/* City Silhouette */}
            <rect x="60" y="80" width="80" height="180" fill="#334155" />
            <rect x="160" y="50" width="100" height="210" fill="#1e293b" />
            <rect x="280" y="110" width="70" height="150" fill="#334155" />
            <rect x="370" y="70" width="90" height="190" fill="#1e293b" />
            <rect x="480" y="100" width="70" height="160" fill="#334155" />
            {/* Road */}
            <rect x="0" y="260" width="600" height="100" fill="#090d16" />
            <line x1="0" y1="310" x2="600" y2="310" stroke="#475569" strokeWidth="3" strokeDasharray="20 15" />
            {/* Sports Car Body */}
            <path d="M 120 270 L 170 220 L 290 205 L 390 220 L 480 250 L 480 280 L 120 280 Z" fill="url(#cannyCar)" />
            {/* Car Cabin */}
            <path d="M 210 220 L 250 160 L 350 160 L 390 220 Z" fill="#0f172a" opacity="0.85" />
            {/* Headlights & Wheels */}
            <circle cx="200" cy="280" r="28" fill="#1e293b" stroke="#64748b" strokeWidth="6" />
            <circle cx="200" cy="280" r="14" fill="#94a3b8" />
            <circle cx="410" cy="280" r="28" fill="#1e293b" stroke="#64748b" strokeWidth="6" />
            <circle cx="410" cy="280" r="14" fill="#94a3b8" />
            <polygon points="120,265 140,260 140,272" fill="#38bdf8" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#000000" />
            {/* Extracted Pure White Canny Edges */}
            <g stroke="#ffffff" strokeWidth="1.6" fill="none">
              {/* Buildings Edges */}
              <rect x="60" y="80" width="80" height="180" />
              <rect x="160" y="50" width="100" height="210" />
              <rect x="280" y="110" width="70" height="150" />
              <rect x="370" y="70" width="90" height="190" />
              <rect x="480" y="100" width="70" height="160" />
              {/* Road line */}
              <line x1="0" y1="260" x2="600" y2="260" />
              <line x1="0" y1="310" x2="600" y2="310" strokeDasharray="20 15" />
              {/* Car Edges */}
              <path d="M 120 270 L 170 220 L 290 205 L 390 220 L 480 250 L 480 280 L 120 280 Z" />
              <path d="M 210 220 L 250 160 L 350 160 L 390 220 Z" />
              <circle cx="200" cy="280" r="28" />
              <circle cx="200" cy="280" r="14" />
              <circle cx="410" cy="280" r="28" />
              <circle cx="410" cy="280" r="14" />
              <line x1="170" y1="220" x2="210" y2="220" />
              <line x1="390" y1="220" x2="420" y2="245" />
            </g>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="cannyNeonSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="neonCar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="url(#cannyNeonSky)" />
          {/* Cyberpunk City */}
          <rect x="60" y="80" width="80" height="180" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1" />
          <rect x="160" y="50" width="100" height="210" fill="#0f172a" stroke="#ec4899" strokeWidth="1" />
          <rect x="280" y="110" width="70" height="150" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="1" />
          <rect x="370" y="70" width="90" height="190" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
          {/* Wet Road with reflections */}
          <rect x="0" y="260" width="600" height="100" fill="#020617" />
          <ellipse cx="300" cy="280" rx="200" ry="25" fill="#f43f5e" opacity="0.25" />
          {/* Redesigned Cyberpunk Car following exact same geometry */}
          <path d="M 120 270 L 170 220 L 290 205 L 390 220 L 480 250 L 480 280 L 120 280 Z" fill="url(#neonCar)" />
          <path d="M 210 220 L 250 160 L 350 160 L 390 220 Z" fill="#020617" opacity="0.9" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="200" cy="280" r="28" fill="#090d16" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="200" cy="280" r="14" fill="#38bdf8" />
          <circle cx="410" cy="280" r="28" fill="#090d16" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="410" cy="280" r="14" fill="#38bdf8" />
          <polygon points="120,265 140,260 140,272" fill="#facc15" />
          {/* Neon underglow */}
          <line x1="140" y1="282" x2="460" y2="282" stroke="#f43f5e" strokeWidth="4" />
        </svg>
      );

    // ==========================================
    // 2. LINEART ANIME (MANGA COLORING)
    // ==========================================
    case "lineart_anime":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            {/* Paper Texture */}
            <rect width="600" height="360" fill="#fef3c7" opacity="0.9" />
            {/* Faint Pencil Sketch Lines & Smudges */}
            <g stroke="#92400e" strokeWidth="2.5" opacity="0.65" fill="none">
              <ellipse cx="300" cy="170" rx="95" ry="115" />
              <path d="M 205 160 Q 230 110 300 110 Q 370 110 395 160" />
              <path d="M 230 170 Q 255 185 270 170" />
              <path d="M 330 170 Q 345 185 370 170" />
              <ellipse cx="255" cy="180" rx="14" ry="18" />
              <ellipse cx="345" cy="180" rx="14" ry="18" />
              <path d="M 295 210 Q 300 215 305 210" />
              <path d="M 285 235 Q 300 248 315 235" />
              {/* Hair Bangs */}
              <path d="M 240 120 Q 255 160 260 175 Q 275 140 285 170 Q 300 130 320 175 Q 340 150 350 170" />
              {/* Shoulders */}
              <path d="M 260 270 L 180 340" />
              <path d="M 340 270 L 420 340" />
            </g>
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            {/* Pure White Inked Paper */}
            <rect width="600" height="360" fill="#ffffff" />
            {/* Clean Crisp Manga Inking Lines */}
            <g stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M 220 160 C 220 240, 260 270, 300 275 C 340 270, 380 240, 380 160" />
              {/* Sharp Anime Eyes */}
              <path d="M 240 170 Q 255 162 272 170" strokeWidth="3.5" />
              <path d="M 328 170 Q 345 162 360 170" strokeWidth="3.5" />
              <ellipse cx="256" cy="178" rx="10" ry="14" fill="#000000" />
              <ellipse cx="344" cy="178" rx="10" ry="14" fill="#000000" />
              {/* Nose & Mouth */}
              <path d="M 300 205 L 297 212" strokeWidth="2.5" />
              <path d="M 290 232 Q 300 238 310 232" strokeWidth="2.5" />
              {/* Clean Manga Hair Bangs */}
              <path d="M 205 145 C 215 90, 385 90, 395 145" strokeWidth="3" />
              <path d="M 240 115 C 248 145, 255 175, 258 180 C 265 155, 275 145, 280 175 C 290 145, 305 135, 315 178 C 328 150, 345 140, 355 175" strokeWidth="2.8" />
              {/* Collar */}
              <path d="M 265 275 L 230 330 L 300 345 L 370 330 L 335 275" strokeWidth="2.5" />
            </g>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="animeHairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="animeSkinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>
          {/* Background Scene */}
          <rect width="600" height="360" fill="#f0f9ff" />
          <circle cx="480" cy="80" r="70" fill="#fef08a" opacity="0.6" />
          {/* Filled Colored Skin */}
          <path d="M 220 160 C 220 240, 260 270, 300 275 C 340 270, 380 240, 380 160 Z" fill="url(#animeSkinGrad)" />
          {/* Eyes with Shading */}
          <ellipse cx="256" cy="178" rx="11" ry="15" fill="#0284c7" />
          <circle cx="253" cy="174" r="4" fill="#ffffff" />
          <ellipse cx="344" cy="178" rx="11" ry="15" fill="#0284c7" />
          <circle cx="341" cy="174" r="4" fill="#ffffff" />
          {/* Hair with Vibrant Gradient */}
          <path d="M 205 145 C 215 80, 385 80, 395 145 C 380 220, 385 280, 420 340 L 180 340 C 215 280, 220 220, 205 145 Z" fill="url(#animeHairGrad)" />
          <path d="M 240 115 C 248 145, 255 175, 258 180 C 265 155, 275 145, 280 175 C 290 145, 305 135, 315 178 C 328 150, 345 140, 355 175 Z" fill="#67e8f9" />
          {/* Sailor Uniform */}
          <path d="M 265 275 L 230 340 L 370 340 L 335 275 Z" fill="#1e1b4b" />
          <polygon points="300,300 280,340 320,340" fill="#ef4444" />
        </svg>
      );

    // ==========================================
    // 3. SOFTEDGE HED / PIDI (ORGANIC CONTOURS)
    // ==========================================
    case "softedge_hed":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#18181b" />
            {/* Woman portrait with flowing hair */}
            <circle cx="300" cy="150" r="70" fill="#fde047" opacity="0.85" />
            <path d="M 220 180 Q 200 270 170 340" stroke="#f59e0b" strokeWidth="24" strokeLinecap="round" fill="none" />
            <path d="M 380 180 Q 400 270 430 340" stroke="#f59e0b" strokeWidth="24" strokeLinecap="round" fill="none" />
            <path d="M 250 220 L 220 340 L 380 340 L 350 220 Z" fill="#ec4899" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#000000" />
            {/* Soft Grayscale Nested Edges (PIDI/HED) with gradient halos */}
            <g stroke="#ffffff" fill="none">
              <circle cx="300" cy="150" r="70" strokeWidth="4" opacity="0.8" />
              <circle cx="300" cy="150" r="72" strokeWidth="8" opacity="0.25" />
              <path d="M 220 180 Q 200 270 170 340" strokeWidth="6" opacity="0.75" />
              <path d="M 220 180 Q 200 270 170 340" strokeWidth="14" opacity="0.2" />
              <path d="M 380 180 Q 400 270 430 340" strokeWidth="6" opacity="0.75" />
              <path d="M 380 180 Q 400 270 430 340" strokeWidth="14" opacity="0.2" />
              <path d="M 250 220 L 220 340 L 380 340 L 350 220 Z" strokeWidth="3" opacity="0.6" />
            </g>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="softEdgeArtGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="#09090b" />
          {/* Painterly flowing artwork */}
          <circle cx="300" cy="150" r="70" fill="#fed7aa" />
          <path d="M 220 180 Q 200 270 170 340" stroke="url(#softEdgeArtGrad)" strokeWidth="26" strokeLinecap="round" fill="none" />
          <path d="M 380 180 Q 400 270 430 340" stroke="url(#softEdgeArtGrad)" strokeWidth="26" strokeLinecap="round" fill="none" />
          <path d="M 250 220 L 220 340 L 380 340 L 350 220 Z" fill="#3b82f6" />
          <path d="M 265 145 Q 300 175 335 145" stroke="#475569" strokeWidth="3" fill="none" />
        </svg>
      );

    // ==========================================
    // 4. DEPTHANYTHING V2 (DEPTH ESTIMATION)
    // ==========================================
    case "depth_anything_v2":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#0f172a" />
            {/* Distant Bridge & Night Sky */}
            <rect x="0" y="0" width="600" height="220" fill="#1e293b" />
            <path d="M 0 160 Q 300 90 600 160" stroke="#334155" strokeWidth="18" fill="none" />
            <circle cx="500" cy="80" r="30" fill="#e2e8f0" />
            {/* Midground Floor */}
            <polygon points="0,220 600,220 600,360 0,360" fill="#090d16" />
            {/* Foreground Character Standing */}
            <ellipse cx="270" cy="180" rx="35" ry="45" fill="#f87171" />
            <path d="M 235 220 L 305 220 L 320 350 L 220 350 Z" fill="#3b82f6" />
            <ellipse cx="270" cy="130" rx="22" ry="26" fill="#fde047" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            {/* Depth Map: Foreground is Pure White, Background is Pure Black */}
            <rect width="600" height="360" fill="#050505" />
            {/* Distant Bridge: Very Dark Gray (~20% White) */}
            <path d="M 0 160 Q 300 90 600 160" stroke="#2a2a2a" strokeWidth="18" fill="none" />
            {/* Midground Floor: Gradient from Dark Gray to Medium Gray */}
            <polygon points="0,220 600,220 600,360 0,360" fill="#404040" />
            {/* Foreground Character: Bright White (~95% White) */}
            <ellipse cx="270" cy="180" rx="35" ry="45" fill="#f0f0f0" />
            <path d="M 235 220 L 305 220 L 320 350 L 220 350 Z" fill="#ffffff" />
            <ellipse cx="270" cy="130" rx="22" ry="26" fill="#f5f5f5" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <radialGradient id="bokehLights" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="600" height="360" fill="#020617" />
          <circle cx="480" cy="110" r="45" fill="#fbbf24" opacity="0.35" />
          <circle cx="530" cy="70" r="30" fill="#60a5fa" opacity="0.4" />
          <path d="M 0 160 Q 300 90 600 160" stroke="#1e293b" strokeWidth="18" fill="none" opacity="0.7" />
          <rect x="0" y="0" width="600" height="360" fill="url(#bokehLights)" />
          {/* Foreground Character with Depth of Field Bokeh */}
          <ellipse cx="270" cy="180" rx="35" ry="45" fill="#065f46" stroke="#10b981" strokeWidth="2" />
          <path d="M 235 220 L 305 220 L 320 350 L 220 350 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <ellipse cx="270" cy="130" rx="22" ry="26" fill="#fed7aa" />
          <path d="M 248 115 C 255 100, 285 100, 292 115 C 285 140, 255 140, 248 115 Z" fill="#1e293b" />
        </svg>
      );

    // ==========================================
    // 5. ZOEDEPTH (METRIC DEPTH FOR INTERIOR)
    // ==========================================
    case "zoe_depth":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#1e293b" />
            {/* Room Perspective Lines */}
            <line x1="0" y1="0" x2="200" y2="120" stroke="#475569" strokeWidth="2" />
            <line x1="600" y1="0" x2="400" y2="120" stroke="#475569" strokeWidth="2" />
            <line x1="0" y1="360" x2="200" y2="240" stroke="#475569" strokeWidth="2" />
            <line x1="600" y1="360" x2="400" y2="240" stroke="#475569" strokeWidth="2" />
            <rect x="200" y="120" width="200" height="120" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            {/* Desk in Room */}
            <rect x="180" y="210" width="240" height="70" fill="#3b82f6" opacity="0.8" />
            <rect x="260" y="160" width="80" height="50" fill="#94a3b8" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#111111" />
            {/* Perspective Depth Gradient strictly adhering to 3D geometry */}
            <polygon points="0,0 200,120 200,240 0,360" fill="#333333" />
            <polygon points="600,0 400,120 400,240 600,360" fill="#333333" />
            <rect x="200" y="120" width="200" height="120" fill="#1a1a1a" />
            {/* Foreground Desk: High-contrast Metric White */}
            <rect x="180" y="210" width="240" height="70" fill="#e5e5e5" />
            <rect x="260" y="160" width="80" height="50" fill="#999999" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <rect width="600" height="360" fill="#0a0a0f" />
          {/* Cyberpunk Room Interior */}
          <polygon points="0,0 200,120 200,240 0,360" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
          <polygon points="600,0 400,120 400,240 600,360" fill="#1e1b4b" stroke="#ec4899" strokeWidth="1" />
          <rect x="200" y="120" width="200" height="120" fill="#030712" stroke="#38bdf8" strokeWidth="2" />
          {/* Sci-fi Holographic Monitors */}
          <rect x="230" y="140" width="140" height="60" fill="#0284c7" opacity="0.3" stroke="#38bdf8" strokeWidth="2" />
          <rect x="180" y="210" width="240" height="70" fill="#111827" stroke="#a855f7" strokeWidth="2" />
        </svg>
      );

    // ==========================================
    // 6. DWPOSE (WHOLE-BODY + HANDS POSE ESTIMATION)
    // ==========================================
    case "dwpose":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#1e293b" />
            {/* Martial Artist Silhouette in Combat Jump */}
            <circle cx="320" cy="90" r="24" fill="#fed7aa" />
            <path d="M 320 114 L 300 190 L 250 250 L 210 330" stroke="#0284c7" strokeWidth="20" strokeLinecap="round" fill="none" />
            <path d="M 300 190 L 370 230 L 450 230" stroke="#0284c7" strokeWidth="20" strokeLinecap="round" fill="none" />
            <path d="M 320 130 L 250 120 L 190 100" stroke="#f43f5e" strokeWidth="14" strokeLinecap="round" fill="none" />
            <path d="M 320 130 L 390 140 L 440 110" stroke="#f43f5e" strokeWidth="14" strokeLinecap="round" fill="none" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#000000" />
            {/* DWPose 18 Limbs with Official Colors */}
            <g strokeWidth="5" strokeLinecap="round">
              <line x1="320" y1="90" x2="315" y2="125" stroke="#ff0000" />
              <line x1="315" y1="125" x2="255" y2="120" stroke="#ffaa00" />
              <line x1="255" y1="120" x2="195" y2="105" stroke="#ffff00" />
              <line x1="315" y1="125" x2="375" y2="135" stroke="#55ff00" />
              <line x1="375" y1="135" x2="435" y2="115" stroke="#00ff00" />
              <line x1="315" y1="125" x2="300" y2="190" stroke="#00ffaa" />
              <line x1="300" y1="190" x2="250" y2="250" stroke="#00aaff" />
              <line x1="250" y1="250" x2="210" y2="330" stroke="#0000ff" />
              <line x1="300" y1="190" x2="365" y2="230" stroke="#aa00ff" />
              <line x1="365" y1="230" x2="445" y2="230" stroke="#ff00aa" />
            </g>
            {/* 18 Body Keypoints */}
            <circle cx="320" cy="90" r="6" fill="#0000ff" />
            <circle cx="315" cy="125" r="6" fill="#ff0000" />
            <circle cx="255" cy="120" r="6" fill="#ffaa00" />
            <circle cx="195" cy="105" r="6" fill="#ffff00" />
            <circle cx="375" cy="135" r="6" fill="#55ff00" />
            <circle cx="435" cy="115" r="6" fill="#00ff00" />
            <circle cx="300" cy="190" r="6" fill="#00ffaa" />
            <circle cx="250" cy="250" r="6" fill="#00aaff" />
            <circle cx="210" cy="330" r="6" fill="#0000ff" />
            {/* Hand Landmark Skeleton (DWPose exclusive capability) */}
            <g fill="#ffff00">
              <circle cx="190" cy="100" r="2.5" />
              <circle cx="185" cy="98" r="2" />
              <circle cx="180" cy="95" r="2" />
              <circle cx="192" cy="104" r="2.5" />
              <circle cx="188" cy="108" r="2" />
              <circle cx="184" cy="112" r="2" />
            </g>
            <g fill="#00ff00">
              <circle cx="440" cy="110" r="2.5" />
              <circle cx="445" cy="108" r="2" />
              <circle cx="450" cy="105" r="2" />
              <circle cx="442" cy="114" r="2.5" />
              <circle cx="448" cy="118" r="2" />
            </g>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="fighterAura" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="#0f172a" />
          {/* Energy Sparks matching action pose */}
          <path d="M 170 80 Q 200 130 150 160" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 460 210 Q 420 250 480 280" stroke="#ec4899" strokeWidth="4" fill="none" opacity="0.7" />
          {/* Rendered Anime Martial Artist Hero */}
          <circle cx="320" cy="90" r="24" fill="#fed7aa" />
          <path d="M 305 78 C 310 65, 340 65, 342 82 C 335 95, 310 95, 305 78 Z" fill="#e11d48" />
          <path d="M 320 114 L 300 190 L 250 250 L 210 330" stroke="url(#fighterAura)" strokeWidth="22" strokeLinecap="round" fill="none" />
          <path d="M 300 190 L 370 230 L 450 230" stroke="url(#fighterAura)" strokeWidth="22" strokeLinecap="round" fill="none" />
          <path d="M 320 130 L 250 120 L 190 100" stroke="#f1f5f9" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M 320 130 L 390 140 L 440 110" stroke="#f1f5f9" strokeWidth="14" strokeLinecap="round" fill="none" />
        </svg>
      );

    // ==========================================
    // 7. NORMALBAE (SURFACE NORMAL 3D ESTIMATION)
    // ==========================================
    case "normal_bae":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#1e293b" />
            {/* Marble Bust Sculpture with Shadows */}
            <circle cx="300" cy="140" r="60" fill="#cbd5e1" />
            <path d="M 260 190 Q 300 240 340 190 L 380 320 L 220 320 Z" fill="#94a3b8" />
            {/* Shading */}
            <path d="M 300 90 Q 340 140 320 190" stroke="#64748b" strokeWidth="8" fill="none" />
            <path d="M 270 230 Q 320 280 290 320" stroke="#475569" strokeWidth="12" fill="none" />
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#8080ff" />
            {/* 3D Normal Map Vectors (RGB mapping) */}
            <circle cx="300" cy="140" r="60" fill="#00e5ff" />
            <path d="M 240 140 A 60 60 0 0 0 300 200 Z" fill="#f43f5e" />
            <path d="M 300 200 A 60 60 0 0 0 360 140 Z" fill="#a855f7" />
            {/* Torso & Drapery Surface Normals */}
            <path d="M 260 190 Q 300 240 340 190 L 380 320 L 220 320 Z" fill="#00e5ff" />
            <path d="M 220 250 L 300 220 L 340 320 L 220 320 Z" fill="#ec4899" />
            <path d="M 300 220 L 380 260 L 380 320 L 340 320 Z" fill="#38bdf8" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="goldSpec" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="#030712" />
          {/* Golden Cyborg Sculpture adhering to the exact normal vector reflections */}
          <circle cx="300" cy="140" r="60" fill="url(#goldSpec)" stroke="#fde047" strokeWidth="2" />
          <path d="M 260 190 Q 300 240 340 190 L 380 320 L 220 320 Z" fill="url(#goldSpec)" />
          {/* Specular Rim Lighting matching normal tangents */}
          <path d="M 242 140 Q 250 185 285 195" stroke="#38bdf8" strokeWidth="4" fill="none" opacity="0.8" />
          <path d="M 358 140 Q 350 185 315 195" stroke="#f43f5e" strokeWidth="4" fill="none" opacity="0.8" />
        </svg>
      );

    // ==========================================
    // 8. TILE / BLUR (SUPER-RESOLUTION UPSCALE)
    // ==========================================
    case "tile_blur":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#1e293b" />
            {/* Low-Res Pixelated Image with Visible Pixel Blocks */}
            <g opacity="0.85">
              <rect x="220" y="80" width="40" height="40" fill="#93c5fd" />
              <rect x="260" y="80" width="40" height="40" fill="#60a5fa" />
              <rect x="300" y="80" width="40" height="40" fill="#60a5fa" />
              <rect x="340" y="80" width="40" height="40" fill="#93c5fd" />

              <rect x="220" y="120" width="40" height="40" fill="#fed7aa" />
              <rect x="260" y="120" width="40" height="40" fill="#1e293b" />
              <rect x="300" y="120" width="40" height="40" fill="#1e293b" />
              <rect x="340" y="120" width="40" height="40" fill="#fed7aa" />

              <rect x="220" y="160" width="40" height="40" fill="#fed7aa" />
              <rect x="260" y="160" width="40" height="40" fill="#fed7aa" />
              <rect x="300" y="160" width="40" height="40" fill="#fed7aa" />
              <rect x="340" y="160" width="40" height="40" fill="#fed7aa" />

              <rect x="220" y="200" width="40" height="40" fill="#fed7aa" />
              <rect x="260" y="200" width="40" height="40" fill="#f87171" />
              <rect x="300" y="200" width="40" height="40" fill="#f87171" />
              <rect x="340" y="200" width="40" height="40" fill="#fed7aa" />
            </g>
            <text x="300" y="300" fill="#94a3b8" fontSize="16" textAnchor="middle" fontFamily="monospace">
              [512x512 Pixelated Input]
            </text>
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <defs>
              <filter id="tileBlurFilter">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>
            <rect width="600" height="360" fill="#0f172a" />
            {/* Smooth Bicubic Blurred Control Tile */}
            <circle cx="300" cy="160" r="70" fill="#fed7aa" filter="url(#tileBlurFilter)" opacity="0.9" />
            <circle cx="270" cy="140" r="16" fill="#1e293b" filter="url(#tileBlurFilter)" />
            <circle cx="330" cy="140" r="16" fill="#1e293b" filter="url(#tileBlurFilter)" />
            <rect x="280" y="195" width="40" height="15" fill="#f87171" filter="url(#tileBlurFilter)" />
            <text x="300" y="300" fill="#10b981" fontSize="16" textAnchor="middle" fontFamily="monospace">
              [Bicubic Downsample + Blur Tensor Guidance]
            </text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <rect width="600" height="360" fill="#090d16" />
          {/* Pristine 4K Synthesized Detail */}
          <circle cx="300" cy="160" r="75" fill="#fef3c7" stroke="#38bdf8" strokeWidth="1" />
          {/* High-res eyes with catchlights */}
          <circle cx="265" cy="145" r="14" fill="#0369a1" />
          <circle cx="262" cy="141" r="4" fill="#ffffff" />
          <circle cx="335" cy="145" r="14" fill="#0369a1" />
          <circle cx="332" cy="141" r="4" fill="#ffffff" />
          {/* Detailed eyelashes & lips */}
          <path d="M 250 135 Q 265 128 280 135" stroke="#0f172a" strokeWidth="3" fill="none" />
          <path d="M 320 135 Q 335 128 350 135" stroke="#0f172a" strokeWidth="3" fill="none" />
          <path d="M 285 200 Q 300 208 315 200" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" fill="none" />
          <text x="300" y="300" fill="#38bdf8" fontSize="16" textAnchor="middle" fontFamily="monospace">
            [Ultra 4K Regenerated with ControlNet Tile]
          </text>
        </svg>
      );

    // ==========================================
    // 9. IP-ADAPTER / FACEID (VISUAL CONDITIONING)
    // ==========================================
    case "ip_adapter":
      if (stage === "source") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#1e293b" />
            {/* Reference portrait: Blue hair & glasses */}
            <circle cx="300" cy="150" r="65" fill="#fed7aa" />
            {/* Hair */}
            <path d="M 235 140 C 235 70, 365 70, 365 140 C 375 190, 385 240, 395 270 L 205 270 C 215 240, 225 190, 235 140 Z" fill="#0284c7" />
            {/* Glasses */}
            <circle cx="275" cy="150" r="18" fill="none" stroke="#facc15" strokeWidth="3" />
            <circle cx="325" cy="150" r="18" fill="none" stroke="#facc15" strokeWidth="3" />
            <line x1="293" y1="150" x2="307" y2="150" stroke="#facc15" strokeWidth="3" />
            <text x="300" y="310" fill="#94a3b8" fontSize="14" textAnchor="middle" fontFamily="monospace">
              Reference Subject (Face Identity)
            </text>
          </svg>
        );
      }
      if (stage === "extracted") {
        return (
          <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
            <rect width="600" height="360" fill="#000000" />
            {/* CLIP Latent Feature Grid Matrix */}
            <g stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.4">
              <line x1="150" y1="60" x2="450" y2="60" />
              <line x1="150" y1="120" x2="450" y2="120" />
              <line x1="150" y1="180" x2="450" y2="180" />
              <line x1="150" y1="240" x2="450" y2="240" />
              <line x1="150" y1="60" x2="150" y2="240" />
              <line x1="225" y1="60" x2="225" y2="240" />
              <line x1="300" y1="60" x2="300" y2="240" />
              <line x1="375" y1="60" x2="375" y2="240" />
              <line x1="450" y1="60" x2="450" y2="240" />
            </g>
            {/* Feature Heatmap Clusters */}
            <circle cx="275" cy="150" r="14" fill="#10b981" opacity="0.6" />
            <circle cx="325" cy="150" r="14" fill="#10b981" opacity="0.6" />
            <circle cx="300" cy="190" r="10" fill="#f43f5e" opacity="0.6" />
            <path d="M 235 100 Q 300 80 365 100" stroke="#00e5ff" strokeWidth="4" fill="none" />
            <text x="300" y="300" fill="#10b981" fontSize="14" textAnchor="middle" fontFamily="monospace">
              512-D Vision Latent Tokens (Cross-Attention Conditioning)
            </text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <defs>
            <linearGradient id="armorSteel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="600" height="360" fill="#0f172a" />
          {/* Exact same person identity in Royal Knight Armor */}
          <circle cx="300" cy="140" r="60" fill="#fed7aa" />
          <path d="M 240 130 C 240 65, 360 65, 360 130 C 370 170, 380 220, 390 250 L 210 250 C 220 220, 230 170, 240 130 Z" fill="#0284c7" />
          <circle cx="275" cy="140" r="16" fill="none" stroke="#facc15" strokeWidth="3" />
          <circle cx="325" cy="140" r="16" fill="none" stroke="#facc15" strokeWidth="3" />
          <line x1="291" y1="140" x2="309" y2="140" stroke="#facc15" strokeWidth="3" />
          {/* Steel Plate Armor */}
          <path d="M 200 240 L 300 280 L 400 240 L 420 360 L 180 360 Z" fill="url(#armorSteel)" stroke="#94a3b8" strokeWidth="2" />
          <polygon points="300,280 280,360 320,360" fill="#fbbf24" />
          <text x="300" y="340" fill="#fbbf24" fontSize="14" textAnchor="middle" fontFamily="monospace">
            Identitas Konsisten dalam Tema Fantasi Baru
          </text>
        </svg>
      );

    // Fallback
    default:
      return (
        <svg viewBox="0 0 600 360" className="preproc-svg-canvas">
          <rect width="600" height="360" fill="#0f172a" />
          <circle cx="300" cy="180" r="60" fill="#3b82f6" />
        </svg>
      );
  }
};
