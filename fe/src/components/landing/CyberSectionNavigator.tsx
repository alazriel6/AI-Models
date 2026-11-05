import React, { useCallback } from 'react';
import { CyberCorruptWalkingText } from './CyberCorruptWalkingText';

export interface CyberSectionNavigatorProps {
  targetId: string;
  direction?: 'down' | 'up';
  label: string;
  japaneseLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Smoothly scrolls and auto-focuses on the destination section with clean viewport centering.
 */
export function scrollToSectionCleanly(targetId: string) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(targetId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;

  if (targetId === 'editorial-statement') {
    // For the 360vh shutter track, scroll so the sticky stage engages and gates unlock (~72% of track)
    const scrollable = Math.max(1, rect.height - vh);
    const targetScroll = window.scrollY + rect.top + Math.max(280, scrollable * 0.72);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    return;
  }

  // If section height is <= viewport height (e.g. 96vh/96dvh like Section 2 model-showcase),
  // center it vertically in the viewport so it is framed cleanly with zero clipping!
  if (rect.height <= vh + 60) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    // For taller sections, offset by the fixed navbar height (~56px)
    const nav = document.querySelector('.nav-editorial, .mg-nav, header');
    const navH = nav ? nav.getBoundingClientRect().height : 56;
    const targetY = window.scrollY + rect.top - navH - 12;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  }
}

export const CyberSectionNavigator: React.FC<CyberSectionNavigatorProps> = ({
  targetId,
  direction = 'down',
  label,
  className = '',
  style,
  onClick,
}) => {
  const handleScroll = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    scrollToSectionCleanly(targetId);
  }, [targetId, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleScroll();
      }
    },
    [handleScroll]
  );

  return (
    <div
      className={`mg-cyber-section-nav dir-${direction} ${className}`}
      onClick={handleScroll}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${direction === 'down' ? 'Scroll down to' : 'Return up to'} ${label}`}
      style={style}
    >
      <span className="mg-nav-arrow" aria-hidden="true">
        {direction === 'down' ? '▼' : '▲'}
      </span>
      <CyberCorruptWalkingText
        text={label}
        accent="yellow"
        cycleMs={4400}
        delayMs={600}
      />
    </div>
  );
};

export default CyberSectionNavigator;
