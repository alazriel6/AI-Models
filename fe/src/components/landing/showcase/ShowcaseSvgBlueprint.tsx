export function ShowcaseSvgBlueprint() {
  return (
    <div className="mg-showcase-svg-blueprint-wrap" aria-hidden="true">
      <svg
        className="mg-showcase-svg-blueprint"
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle neon blue glow filter */}
          <filter id="bp-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Blueprint Linear Gradients */}
          <linearGradient id="bp-cyan-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="bp-fade-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.0" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>

          <pattern id="bp-fine-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(56, 189, 248, 0.03)"
              strokeWidth="0.8"
            />
          </pattern>

          <pattern id="bp-major-grid" width="160" height="160" patternUnits="userSpaceOnUse">
            <rect width="160" height="160" fill="none" stroke="rgba(96, 165, 250, 0.06)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="rgba(96, 165, 250, 0.2)" />
            <circle cx="160" cy="0" r="1.5" fill="rgba(96, 165, 250, 0.2)" />
            <circle cx="0" cy="160" r="1.5" fill="rgba(96, 165, 250, 0.2)" />
            <circle cx="160" cy="160" r="1.5" fill="rgba(96, 165, 250, 0.2)" />
          </pattern>
        </defs>

        {/* 1. Underlying Technical Grid Fills */}
        <rect width="100%" height="100%" fill="url(#bp-fine-grid)" opacity="0.8" />
        <rect width="100%" height="100%" fill="url(#bp-major-grid)" opacity="0.6" />

        {/* 2. Ambient Rotating Radar Rings & Crosshairs in upper right (Clean, no text) */}
        <g transform="translate(1260, 220)">
          {/* Outer Segmented Reticle */}
          <circle
            cx="0"
            cy="0"
            r="160"
            fill="none"
            stroke="rgba(96, 165, 250, 0.1)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            className="mg-svg-spin-slow"
          />
          {/* Middle Counter-rotating Reticle */}
          <circle
            cx="0"
            cy="0"
            r="110"
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="1.4"
            strokeDasharray="40 20 10 20"
            className="mg-svg-spin-counter"
          />
          {/* Inner Pulsing Radar Circle */}
          <circle
            cx="0"
            cy="0"
            r="60"
            fill="rgba(56, 189, 248, 0.02)"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1"
            className="mg-svg-pulse-core"
          />
          {/* Precision Crosshair Lines */}
          <line x1="-180" y1="0" x2="180" y2="0" stroke="rgba(96, 165, 250, 0.08)" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="0" y1="-180" x2="0" y2="180" stroke="rgba(96, 165, 250, 0.08)" strokeWidth="1" strokeDasharray="4 6" />
        </g>

        {/* 3. Left Ambient Constellation Node in upper left (Clean, no text) */}
        <g transform="translate(140, 280)">
          <circle
            cx="0"
            cy="0"
            r="90"
            fill="none"
            stroke="rgba(96, 165, 250, 0.08)"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="mg-svg-spin-slow"
          />
          <circle cx="0" cy="0" r="2.5" fill="#38bdf8" opacity="0.5" />
        </g>

        {/* 4. Animated Circuit Traces (Traveling Energy Streams) */}
        {/* Horizontal Laser Trace 1 */}
        <path
          d="M 60 140 L 420 140 L 480 200 L 980 200 L 1040 140 L 1380 140"
          fill="none"
          stroke="rgba(56, 189, 248, 0.1)"
          strokeWidth="1.2"
        />
        <path
          d="M 60 140 L 420 140 L 480 200 L 980 200 L 1040 140 L 1380 140"
          fill="none"
          stroke="url(#bp-cyan-blue)"
          strokeWidth="1.8"
          strokeDasharray="60 400"
          strokeLinecap="round"
          className="mg-svg-circuit-packet packet-1"
          filter="url(#bp-soft-glow)"
        />

        {/* Diagonal Cross-Trace 2 */}
        <path
          d="M 80 480 L 320 480 L 400 560 L 820 560 L 900 640 L 1360 640"
          fill="none"
          stroke="rgba(96, 165, 250, 0.08)"
          strokeWidth="1.2"
        />
        <path
          d="M 80 480 L 320 480 L 400 560 L 820 560 L 900 640 L 1360 640"
          fill="none"
          stroke="url(#bp-cyan-blue)"
          strokeWidth="2"
          strokeDasharray="80 500"
          strokeLinecap="round"
          className="mg-svg-circuit-packet packet-2"
          filter="url(#bp-soft-glow)"
        />

        {/* Vertical Data Bus on right */}
        <path
          d="M 1240 80 L 1240 820"
          fill="none"
          stroke="url(#bp-fade-v)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
        />

        {/* 5. Minimal Corner Brackets (No technical text) */}
        {/* Top Left */}
        <g transform="translate(48, 48)">
          <path d="M 0 14 L 0 0 L 14 0" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="1.5" fill="#60a5fa" opacity="0.6" />
        </g>

        {/* Top Right */}
        <g transform="translate(1392, 48)">
          <path d="M 0 14 L 0 0 L -14 0" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="1.5" fill="#60a5fa" opacity="0.6" />
        </g>

        {/* Bottom Left */}
        <g transform="translate(48, 852)">
          <path d="M 0 -14 L 0 0 L 14 0" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="1.5" fill="#60a5fa" opacity="0.6" />
        </g>

        {/* Bottom Right */}
        <g transform="translate(1392, 852)">
          <path d="M 0 -14 L 0 0 L -14 0" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="1.5" fill="#60a5fa" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
