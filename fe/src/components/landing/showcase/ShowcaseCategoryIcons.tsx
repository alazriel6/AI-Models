interface IconProps {
  className?: string;
  active?: boolean;
}

/**
 * Clean, monochrome animated SVG icon for "All Architectures"
 * Minimal isometric lattice with subtle pulse
 */
export function AllArchitecturesSvg({ className = '', active = false }: IconProps) {
  return (
    <svg
      className={`mg-cat-svg ${active ? 'is-active' : ''} ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer subtle boundary */}
      <polygon
        points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={active ? '1' : '0.75'}
      />

      {/* Internal Axis Connectors */}
      <line x1="12" y1="3" x2="12" y2="12" strokeWidth="1.3" opacity="0.6" />
      <line x1="12" y1="12" x2="20" y2="16.5" strokeWidth="1.3" opacity="0.6" />
      <line x1="12" y1="12" x2="4" y2="16.5" strokeWidth="1.3" opacity="0.6" />

      {/* Central Core Bead */}
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" className="mg-svg-pulse-core" />
    </svg>
  );
}

/**
 * Clean, monochrome animated SVG icon for "Checkpoints"
 * Layered foundation model weight stack
 */
export function CheckpointsSvg({ className = '', active = false }: IconProps) {
  return (
    <svg
      className={`mg-cat-svg ${active ? 'is-active' : ''} ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bottom layer */}
      <path
        d="M3 17L12 21L21 17L12 13L3 17Z"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity={active ? '0.5' : '0.35'}
      />

      {/* Middle layer */}
      <path
        d="M3 12L12 16L21 12L12 8L3 12Z"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity={active ? '0.75' : '0.55'}
      />

      {/* Top layer */}
      <path
        d="M3 7L12 11L21 7L12 3L3 7Z"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={active ? '1' : '0.8'}
      />
    </svg>
  );
}

/**
 * Clean, monochrome animated SVG icon for "LoRA Adapters"
 * Low-rank decomposition matrix W = B × A
 */
export function LoraSvg({ className = '', active = false }: IconProps) {
  return (
    <svg
      className={`mg-cat-svg ${active ? 'is-active' : ''} ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Matrix A Column */}
      <rect x="3.5" y="6" width="4.5" height="12" rx="1" strokeWidth="1.4" opacity={active ? '1' : '0.8'} />

      {/* Matrix B Column */}
      <rect x="16" y="6" width="4.5" height="12" rx="1" strokeWidth="1.4" opacity={active ? '1' : '0.8'} />

      {/* Multiplier cross */}
      <path d="M10.5 10.5L13.5 13.5M13.5 10.5L10.5 13.5" strokeWidth="1.5" strokeLinecap="round" />

      {/* Connecting Top Arc */}
      <path d="M6 3.5C9 1.8 15 1.8 18 3.5" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/**
 * Clean, monochrome animated SVG icon for "Illustrious Base"
 * Minimal camera aperture / iris
 */
export function IllustriousSvg({ className = '', active = false }: IconProps) {
  return (
    <svg
      className={`mg-cat-svg ${active ? 'is-active' : ''} ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.4" opacity={active ? '0.9' : '0.7'} />
      <g className="mg-svg-spin-slow" style={{ transformOrigin: '12px 12px' }}>
        <line x1="12" y1="3.5" x2="16.5" y2="8" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="20.5" y1="12" x2="16" y2="16.5" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="16.5" y1="20" x2="11" y2="19" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="12" y1="20.5" x2="7.5" y2="16" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="3.5" y1="12" x2="8" y2="7.5" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="7.5" y1="4" x2="13" y2="5" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
      </g>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Clean, monochrome animated SVG icon for "NoobAI Base"
 * Kinetic v-prediction vector
 */
export function NoobAiSvg({ className = '', active = false }: IconProps) {
  return (
    <svg
      className={`mg-cat-svg ${active ? 'is-active' : ''} ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer subtle target circle */}
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />

      {/* Kinetic Vector Arrow */}
      <path
        d="M5 14L10 18L19 6"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? '1' : '0.8'}
      />

      <circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
