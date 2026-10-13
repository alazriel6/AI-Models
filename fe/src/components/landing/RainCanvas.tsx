import { useEffect, useRef } from 'react';

export type WeatherType = 'clear' | 'rain' | 'storm';

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

interface SunMote {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  phase: number;
  pulseSpeed: number;
}

interface LightningBoltSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LightningStrike {
  startTime: number;
  duration: number;
  originX: number;
  hasBolt: boolean;
  segments: LightningBoltSegment[];
  branches: LightningBoltSegment[][];
}

export interface RainCanvasProps {
  weather?: WeatherType;
}

export function RainCanvas({ weather = 'storm' }: RainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const weatherRef = useRef<WeatherType>(weather);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      const h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(12, 16, 24, 0.4)');
      grad.addColorStop(1, 'rgba(9, 11, 15, 0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    let animationFrameId = 0;
    let isVisible = true;
    let isRunning = false;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let drops: RainDrop[] = [];
    let splashes: SplashParticle[] = [];
    let sunMotes: SunMote[] = [];

    // Natural clean subtle slant (~12 degrees)
    const windDrift = 0.22;

    // Lightning state
    let currentStrike: LightningStrike | null = null;
    let nextLightningTime = performance.now() + (3200 + Math.random() * 3200);

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
      initSunMotes();
    };

    const initSunMotes = () => {
      sunMotes = [];
      const count = width < 768 ? 18 : 36;
      for (let i = 0; i < count; i++) {
        sunMotes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 1.0 + Math.random() * 1.8,
          vx: (Math.random() - 0.45) * 0.4,
          vy: -0.2 - Math.random() * 0.45,
          baseAlpha: 0.18 + Math.random() * 0.32,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.015 + Math.random() * 0.025,
        });
      }
    };

    const initDrops = () => {
      drops = [];
      splashes = [];

      const maxCount = width < 768 ? 130 : 290;

      for (let i = 0; i < maxCount; i++) {
        const rand = Math.random();
        let layer = 0;
        let speed = 12 + Math.random() * 6;
        let length = 16 + Math.random() * 14;
        let opacity = 0.16 + Math.random() * 0.12;
        let strokeWidth = 0.85;

        if (rand > 0.82) {
          layer = 2;
          speed = 28 + Math.random() * 10;
          length = 46 + Math.random() * 26;
          opacity = 0.44 + Math.random() * 0.25;
          strokeWidth = 1.45;
        } else if (rand > 0.50) {
          layer = 1;
          speed = 19 + Math.random() * 7;
          length = 28 + Math.random() * 18;
          opacity = 0.28 + Math.random() * 0.16;
          strokeWidth = 1.1;
        }

        drops.push({
          x: Math.random() * (width + 250) - 100,
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
      if (layer === 0 || splashes.length > 65) return;
      const count = layer === 2 ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const speed = 1.4 + Math.random() * 2.6;
        splashes.push({
          x,
          y: Math.min(y, height - 2),
          vx: Math.cos(angle) * speed + windDrift * 0.5,
          vy: Math.sin(angle) * speed,
          radius: 0.8 + Math.random() * 0.9,
          opacity: 0.35 + Math.random() * 0.3,
          life: 0,
          maxLife: 12 + Math.random() * 12,
        });
      }
    };

    const startAnimation = () => {
      if (!isRunning && isVisible) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const stopAnimation = () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const render = (now: number) => {
      if (!isVisible) {
        isRunning = false;
        animationFrameId = 0;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const currentWeather = weatherRef.current;
      const isMobile = width < 768;

      // Mode 1: Cerah
      if (currentWeather === 'clear') {
        currentStrike = null;

        ctx.beginPath();
        for (let i = 0; i < sunMotes.length; i++) {
          const m = sunMotes[i];
          m.phase += m.pulseSpeed;
          m.x += m.vx;
          m.y += m.vy;

          if (m.y < -15) {
            m.y = height + 10;
            m.x = Math.random() * width;
          }
          if (m.x < -15) m.x = width + 10;
          if (m.x > width + 15) m.x = -10;

          ctx.moveTo(m.x + m.radius, m.y);
          ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = 'rgba(255, 228, 175, 0.5)';
        ctx.fill();

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Mode 2 (Hujan) & Mode 3 (Badai)
      const isStorm = currentWeather === 'storm';
      const activeDropCount = isStorm
        ? (isMobile ? 130 : 290)
        : (isMobile ? 65 : 145);

      const speedMult = isStorm ? 1.0 : 0.75;

      // Lightning Engine (ONLY in 'storm')
      if (isStorm) {
        if (!currentStrike && now >= nextLightningTime) {
          const hasBolt = Math.random() < 0.72;
          const originX = width * (0.15 + Math.random() * 0.7);
          const segments: LightningBoltSegment[] = [];
          const branches: LightningBoltSegment[][] = [];

          if (hasBolt) {
            let curX = originX;
            let curY = 0;
            const targetY = height * (0.55 + Math.random() * 0.35);
            const steps = 15 + Math.floor(Math.random() * 8);
            const dy = targetY / steps;

            for (let s = 0; s < steps; s++) {
              const nextY = curY + dy;
              const nextX = curX + (windDrift * dy) + (Math.random() - 0.5) * 34;
              segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

              if (Math.random() < 0.28 && s > 2 && s < steps - 2) {
                let bX = curX;
                let bY = curY;
                const branch: LightningBoltSegment[] = [];
                const dir = Math.random() < 0.5 ? -1 : 1;
                const bCount = 4 + Math.floor(Math.random() * 4);
                for (let j = 0; j < bCount; j++) {
                  const nbY = bY + dy * 0.75;
                  const nbX = bX + dir * (10 + Math.random() * 18) + (Math.random() - 0.5) * 10;
                  branch.push({ x1: bX, y1: bY, x2: nbX, y2: nbY });
                  bX = nbX;
                  bY = nbY;
                }
                branches.push(branch);
              }

              curX = nextX;
              curY = nextY;
            }
          }

          currentStrike = {
            startTime: now,
            duration: 520,
            originX,
            hasBolt,
            segments,
            branches,
          };
        }
      } else {
        currentStrike = null;
      }

      // Compute lightning intensity
      let flashIntensity = 0;
      if (currentStrike && isStorm) {
        const elapsed = now - currentStrike.startTime;
        if (elapsed >= currentStrike.duration) {
          currentStrike = null;
          nextLightningTime = now + (4200 + Math.random() * 3600);
        } else {
          if (elapsed < 60) {
            flashIntensity = (elapsed / 60) * 0.45;
          } else if (elapsed < 95) {
            flashIntensity = 0.45 - ((elapsed - 60) / 35) * 0.33;
          } else if (elapsed < 165) {
            flashIntensity = 0.12 + ((elapsed - 95) / 70) * 0.88;
          } else if (elapsed < 210) {
            flashIntensity = 1.0 - ((elapsed - 165) / 45) * 0.72;
          } else if (elapsed < 265) {
            flashIntensity = 0.28 + ((elapsed - 210) / 55) * 0.37;
          } else if (elapsed < 320) {
            flashIntensity = 0.65 - ((elapsed - 265) / 55) * 0.4;
          } else {
            const p = (elapsed - 320) / (currentStrike.duration - 320);
            flashIntensity = 0.25 * Math.pow(1 - p, 2);
          }
        }
      }

      // Render Ambient Lightning Flash
      if (flashIntensity > 0.01 && currentStrike) {
        const radialGlow = ctx.createRadialGradient(
          currentStrike.originX, 0, 20,
          currentStrike.originX, height * 0.45, Math.max(width, height)
        );
        radialGlow.addColorStop(0, `rgba(235, 245, 255, ${flashIntensity * 0.4})`);
        radialGlow.addColorStop(0.35, `rgba(185, 218, 255, ${flashIntensity * 0.24})`);
        radialGlow.addColorStop(0.8, `rgba(140, 180, 240, ${flashIntensity * 0.09})`);
        radialGlow.addColorStop(1, 'rgba(100, 140, 200, 0)');

        ctx.fillStyle = radialGlow;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = `rgba(215, 235, 255, ${flashIntensity * 0.15})`;
        ctx.fillRect(0, 0, width, height);

        // Branching Bolt
        if (currentStrike.hasBolt && flashIntensity > 0.2) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'miter';

          ctx.strokeStyle = `rgba(147, 197, 253, ${flashIntensity * 0.85})`;
          ctx.lineWidth = 4.5;
          ctx.shadowColor = '#93c5fd';
          ctx.shadowBlur = 18;

          ctx.beginPath();
          for (const seg of currentStrike.segments) {
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          }
          ctx.stroke();

          if (currentStrike.branches.length > 0) {
            ctx.lineWidth = 2.2;
            for (const branch of currentStrike.branches) {
              ctx.beginPath();
              for (const seg of branch) {
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
              }
              ctx.stroke();
            }
          }

          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, flashIntensity * 1.2)})`;
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ffffff';

          ctx.beginPath();
          for (const seg of currentStrike.segments) {
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          }
          ctx.stroke();

          ctx.restore();
        }
      }

      // Update drop positions & spawn splashes
      for (let i = 0; i < activeDropCount; i++) {
        const d = drops[i];
        d.x += d.speed * speedMult * windDrift;
        d.y += d.speed * speedMult;

        if (d.y > height) {
          spawnSplash(d.x, height, d.layer);
          d.y = -d.length - Math.random() * 40;
          d.x = Math.random() * (width + 250) - 100;
        } else if (d.x > width + 100) {
          d.x = -50;
        }
      }

      // Batched Rain Drops Render by Layer (drastically reduces stroke state changes)
      ctx.lineCap = 'round';

      // Layer 0: Background drops
      const l0Style = flashIntensity > 0.2
        ? 'rgba(240, 248, 255, 0.38)'
        : (flashIntensity > 0.05 ? 'rgba(200, 220, 245, 0.28)' : 'rgba(155, 180, 215, 0.22)');
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = l0Style;
      ctx.beginPath();
      for (let i = 0; i < activeDropCount; i++) {
        const d = drops[i];
        if (d.layer === 0) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.length * windDrift, d.y + d.length);
        }
      }
      ctx.stroke();

      // Layer 1: Midground drops
      const l1Style = flashIntensity > 0.2
        ? 'rgba(240, 248, 255, 0.62)'
        : (flashIntensity > 0.05 ? 'rgba(215, 230, 250, 0.44)' : 'rgba(180, 205, 238, 0.36)');
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = l1Style;
      ctx.beginPath();
      for (let i = 0; i < activeDropCount; i++) {
        const d = drops[i];
        if (d.layer === 1) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.length * windDrift, d.y + d.length);
        }
      }
      ctx.stroke();

      // Layer 2: Foreground drops
      const l2Style = flashIntensity > 0.2
        ? 'rgba(245, 250, 255, 0.88)'
        : (flashIntensity > 0.05 ? 'rgba(230, 240, 255, 0.68)' : 'rgba(205, 228, 255, 0.56)');
      ctx.lineWidth = 1.45;
      ctx.strokeStyle = l2Style;
      ctx.beginPath();
      for (let i = 0; i < activeDropCount; i++) {
        const d = drops[i];
        if (d.layer === 2) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.length * windDrift, d.y + d.length);
        }
      }
      ctx.stroke();

      // Batched Splashes Render
      if (splashes.length > 0) {
        ctx.beginPath();
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.life++;
          s.x += s.vx * speedMult;
          s.y += s.vy * speedMult;
          s.vy += 0.16;

          if (s.life >= s.maxLife) {
            splashes.splice(i, 1);
            continue;
          }

          ctx.moveTo(s.x + s.radius, s.y);
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = flashIntensity > 0.2
          ? 'rgba(240, 250, 255, 0.65)'
          : 'rgba(185, 210, 245, 0.45)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    resizeCanvas();
    startAnimation();

    let resizeTimer: number;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 80);
    };
    window.addEventListener('resize', handleResize);

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      if (!visible) {
        stopAnimation();
      } else if (isVisible) {
        startAnimation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = Boolean(entry && entry.isIntersecting && document.visibilityState === 'visible');
        if (visible !== isVisible) {
          isVisible = visible;
          if (isVisible) {
            startAnimation();
          } else {
            stopAnimation();
          }
        }
      },
      { threshold: 0.02 }
    );
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      stopAnimation();
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
