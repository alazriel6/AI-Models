import { useEffect, useRef } from 'react';

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  width: number;
  layer: number; // 0 = background, 1 = midground, 2 = foreground
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Draw a subtle calm gradient wash and do not run animation loop
      const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(12, 16, 24, 0.4)');
      grad.addColorStop(1, 'rgba(9, 11, 15, 0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    let animationFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let drops: RainDrop[] = [];
    let splashes: SplashParticle[] = [];

    // Wind angle: slant of ~12 degrees (dx per frame)
    const windDrift = 0.22;

    const resizeCanvas = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initDrops();
    };

    const initDrops = () => {
      drops = [];
      splashes = [];

      // Scale drop count based on screen width
      const isMobile = width < 768;
      const baseCount = isMobile ? 65 : 170;

      for (let i = 0; i < baseCount; i++) {
        // Distribute drops across 3 depth planes:
        // 55% background, 30% midground, 15% foreground
        const rand = Math.random();
        let layer = 0;
        let speed = 9 + Math.random() * 5;
        let length = 12 + Math.random() * 12;
        let opacity = 0.12 + Math.random() * 0.10;
        let strokeWidth = 0.8;

        if (rand > 0.85) {
          // Foreground: fast, longer, crisp
          layer = 2;
          speed = 22 + Math.random() * 8;
          length = 36 + Math.random() * 22;
          opacity = 0.35 + Math.random() * 0.22;
          strokeWidth = 1.35;
        } else if (rand > 0.55) {
          // Midground
          layer = 1;
          speed = 15 + Math.random() * 6;
          length = 22 + Math.random() * 16;
          opacity = 0.22 + Math.random() * 0.15;
          strokeWidth = 1.0;
        }

        drops.push({
          x: Math.random() * (width + 200) - 100,
          y: Math.random() * height,
          length,
          speed,
          opacity,
          width: strokeWidth,
          layer,
        });
      }
    };

    const spawnSplash = (x: number, y: number, layer: number) => {
      // Only spawn splashes for midground and foreground drops to maintain high performance
      if (layer === 0 || splashes.length > 40) return;
      const count = layer === 2 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = 1.2 + Math.random() * 2.2;
        splashes.push({
          x,
          y: Math.min(y, height - 2),
          vx: Math.cos(angle) * speed + windDrift * 0.5,
          vy: Math.sin(angle) * speed,
          radius: 0.8 + Math.random() * 0.8,
          opacity: 0.3 + Math.random() * 0.25,
          life: 0,
          maxLife: 10 + Math.random() * 10,
        });
      }
    };

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Render & update rain drops
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        // Atmospheric steel-blue / cool-gray tint
        let strokeStyle: string;
        if (d.layer === 2) {
          strokeStyle = `rgba(195, 220, 255, ${d.opacity})`;
        } else if (d.layer === 1) {
          strokeStyle = `rgba(170, 195, 230, ${d.opacity})`;
        } else {
          strokeStyle = `rgba(145, 170, 205, ${d.opacity})`;
        }

        ctx.beginPath();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = d.width;
        ctx.lineCap = 'round';
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.length * windDrift, d.y + d.length);
        ctx.stroke();

        // Advance position
        d.x += d.speed * windDrift;
        d.y += d.speed;

        // Reset if it drops below bottom or past right edge
        if (d.y > height) {
          spawnSplash(d.x, height, d.layer);
          d.y = -d.length - Math.random() * 40;
          d.x = Math.random() * (width + 200) - 100;
        } else if (d.x > width + 100) {
          d.x = -50;
        }
      }

      // Render & update splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.15; // gravity

        const alpha = s.opacity * (1 - s.life / s.maxLife);
        if (alpha <= 0 || s.life >= s.maxLife) {
          splashes.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(185, 210, 245, ${alpha})`;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    resizeCanvas();
    animationFrameId = requestAnimationFrame(render);

    // Resize observer on parent
    let resizeTimer: number;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 80);
    };
    window.addEventListener('resize', handleResize);

    // Pause when tab is not focused/visible
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Pause when scrolled out of view using IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting && document.visibilityState === 'visible' : true;
      },
      { threshold: 0.05 }
    );
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mg-rain-canvas"
      aria-hidden="true"
    />
  );
}
