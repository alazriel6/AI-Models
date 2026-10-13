import { useEffect, useRef } from 'react';

interface Spore {
  x: number;
  y: number;
  baseX: number;
  radius: number;
  vy: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  pulsePhase: number;
  pulseSpeed: number;
  baseAlpha: number;
  color: { r: number; g: number; b: number };
  layer: number; // 0 = tiny deep background, 1 = midground, 2 = foreground glow
}

interface ForestLeaf {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  swayPhase: number;
  opacity: number;
  hue: string; // Subtle moss/amber tone
}

export function ForestSporeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rawCtx = canvas.getContext('2d', { alpha: true });
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spores: Spore[] = [];
    const leaves: ForestLeaf[] = [];

    // Distinct organic forest color palettes (warm golden amber, emerald-chartreuse bioluminescence, warm cream)
    const PALETTES = [
      { r: 245, g: 158, b: 11 },  // Warm Amber
      { r: 251, g: 191, b: 36 },  // Golden Sunbeam
      { r: 132, g: 204, b: 22 },  // Forest Chartreuse
      { r: 52,  g: 211, b: 153 }, // Bioluminescent Moss Green
      { r: 254, g: 243, b: 199 }, // Pale Golden Pollen
    ];

    const LEAF_COLORS = [
      'rgba(84, 120, 68, ',   // Moss green
      'rgba(142, 120, 58, ',  // Sunlit dry leaf
      'rgba(60, 95, 62, ',    // Deep cedar needle
      'rgba(180, 145, 65, ',  // Golden beech leaf
    ];

    function initSpores() {
      spores.length = 0;
      // Ambient density based on section size
      const count = Math.min(50, Math.max(28, Math.floor((width * height) / 28000)));

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = PALETTES[Math.floor(Math.random() * PALETTES.length)];
        const layer = Math.random() < 0.25 ? 2 : Math.random() < 0.65 ? 1 : 0;
        const radius = layer === 2 ? 2.4 + Math.random() * 1.6 : layer === 1 ? 1.5 + Math.random() * 1.0 : 0.8 + Math.random() * 0.7;

        spores.push({
          x,
          y,
          baseX: x,
          radius,
          vy: -(0.18 + Math.random() * 0.35), // Gently drift upwards on warm canopy thermals
          swaySpeed: 0.008 + Math.random() * 0.014,
          swayAmp: 18 + Math.random() * 32,
          phase: Math.random() * Math.PI * 2,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.035,
          baseAlpha: layer === 2 ? 0.65 : layer === 1 ? 0.5 : 0.3,
          color,
          layer,
        });
      }
    }

    function initLeaves() {
      leaves.length = 0;
      // Gentle occasional falling leaf silhouettes (7 total)
      const count = 7;
      for (let i = 0; i < count; i++) {
        leaves.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 7 + Math.random() * 8,
          vx: 0.2 + Math.random() * 0.45,
          vy: 0.35 + Math.random() * 0.5,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.025,
          swayPhase: Math.random() * Math.PI * 2,
          opacity: 0.22 + Math.random() * 0.28,
          hue: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        });
      }
    }

    function handleResize() {
      const parent = canvas?.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initSpores();
      initLeaves();
    }

    // IntersectionObserver to pause loop when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry.isIntersecting;
        if (isVisible && !animId) {
          lastTime = performance.now();
          animId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // ResizeObserver for responsive adaptation
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    handleResize();

    let lastTime = performance.now();
    let windTime = 0;

    function render(currentTime: number) {
      if (!isVisible) {
        animId = 0;
        return;
      }

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      windTime += dt;

      // Soft natural forest breeze vector (cyclic gust every ~14s)
      const breeze = Math.sin(windTime * 0.45) * 0.25 + Math.cos(windTime * 0.2) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // 1. Render Spores / Fireflies
      for (let i = 0; i < spores.length; i++) {
        const p = spores[i];

        p.phase += p.swaySpeed;
        p.pulsePhase += p.pulseSpeed;

        // Upward float with horizontal sinusoidal sway + gentle breeze
        p.y += p.vy * (1 + Math.sin(p.phase * 0.5) * 0.2);
        p.x = p.baseX + Math.sin(p.phase) * p.swayAmp + breeze * 12;

        // Wrap around vertically
        if (p.y < -30) {
          p.y = height + 20;
          p.baseX = Math.random() * width;
          p.x = p.baseX;
        } else if (p.y > height + 30) {
          p.y = -20;
          p.baseX = Math.random() * width;
          p.x = p.baseX;
        }

        // Luminescent pulse calculation
        const pulse = 0.5 + 0.5 * Math.sin(p.pulsePhase);
        const currentAlpha = Math.max(0.04, p.baseAlpha * (0.45 + 0.55 * pulse));

        // Draw soft ambient outer glow halo
        const haloRadius = p.layer === 2 ? p.radius * 5.5 : p.layer === 1 ? p.radius * 4.0 : p.radius * 2.5;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
        glow.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentAlpha * 0.85})`);
        glow.addColorStop(0.35, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentAlpha * 0.35})`);
        glow.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw crisp luminescent inner core
        ctx.fillStyle = `rgba(255, 255, 245, ${Math.min(1, currentAlpha * 1.35)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render Falling / Floating Forest Leaves
      for (let i = 0; i < leaves.length; i++) {
        const lf = leaves[i];

        lf.swayPhase += 0.02;
        lf.rotation += lf.vRot;
        lf.y += lf.vy;
        lf.x += lf.vx + Math.sin(lf.swayPhase) * 0.8 + breeze * 1.2;

        // Wrap around when falling past bottom
        if (lf.y > height + 40) {
          lf.y = -30;
          lf.x = Math.random() * width;
        }
        if (lf.x > width + 40) lf.x = -30;
        if (lf.x < -40) lf.x = width + 30;

        // Draw stylized organic leaf shape
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rotation);
        ctx.fillStyle = `${lf.hue}${lf.opacity})`;

        ctx.beginPath();
        // Delicate curved leaf silhouette
        ctx.moveTo(0, -lf.size * 0.6);
        ctx.quadraticCurveTo(lf.size * 0.45, 0, 0, lf.size * 0.6);
        ctx.quadraticCurveTo(-lf.size * 0.45, 0, 0, -lf.size * 0.6);
        ctx.fill();

        // Subtle leaf central spine/vein
        ctx.strokeStyle = `rgba(255, 255, 255, ${lf.opacity * 0.3})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -lf.size * 0.5);
        ctx.lineTo(0, lf.size * 0.5);
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mg-showcase-canvas"
      aria-hidden="true"
    />
  );
}

export default ForestSporeCanvas;
