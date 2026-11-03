import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  maxAlpha: number;
  alphaSpeed: number;
  color: string;
  isDiamond: boolean;
}

export function CyberDustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const colors = [
      '#38bdf8', // Neon Cyan
      '#00f0ff', // Electric Cyan
      '#fcee0a', // Cyberpunk Yellow
      '#10b981', // Terminal Green
      '#e2e8f0', // Crisp White
    ];

    const particleCount = 38;
    const particles: Particle[] = [];

    const createParticle = (initialY?: number): Particle => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const maxAlpha = 0.25 + Math.random() * 0.45;
      return {
        x: Math.random() * width,
        y: initialY !== undefined ? initialY : Math.random() * height,
        size: 1.2 + Math.random() * 2.2,
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: 0.2 + Math.random() * 0.55, // Drifts upward
        alpha: Math.random() * maxAlpha,
        maxAlpha,
        alphaSpeed: 0.004 + Math.random() * 0.008,
        color,
        isDiamond: Math.random() > 0.4,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = () => {
      if (isVisible) {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Move upward
          p.y -= p.speedY;
          p.x += p.speedX;

          // Alpha pulse
          p.alpha += p.alphaSpeed;
          if (p.alpha > p.maxAlpha || p.alpha < 0.05) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          // Respawn at bottom when drifting past top or sides
          if (p.y < -10 || p.x < -10 || p.x > width + 10) {
            particles[i] = createParticle(height + 5);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2;

          if (p.isDiamond) {
            ctx.translate(p.x, p.y);
            ctx.rotate((45 * Math.PI) / 180);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mg-hero-cyber-particles"
      aria-hidden="true"
    />
  );
}

export default CyberDustCanvas;

