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
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
