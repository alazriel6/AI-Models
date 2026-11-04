import React from 'react';

export interface SamuraiEmblemProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  glow?: boolean;
}

/**
 * Cyberpunk 2077 - SAMURAI Oni Skull Emblem
 * Vectorized standalone SVG component referencing /images/cyberpunk-samurai.svg
 */
export const SamuraiEmblem: React.FC<SamuraiEmblemProps> = ({
  size = 120,
  glow = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <img
      src="/images/cyberpunk-samurai.svg"
      alt="Cyberpunk 2077 Samurai Oni Emblem"
      width={size}
      height="auto"
      className={`samurai-emblem-img ${glow ? 'drop-shadow-[0_0_15px_rgba(229,27,36,0.6)]' : ''} ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', height: 'auto', ...style }}
      {...props}
    />
  );
};

export default SamuraiEmblem;
