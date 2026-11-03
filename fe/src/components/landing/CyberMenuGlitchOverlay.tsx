import { useEffect, useRef } from 'react';

// Exact Japanese & Hex character set matching reference:
// Katakana + Netrunning/Cyberpunk Kanji + Hex codes + Cyber glyphs
const CYBER_RAIN_CHARS =
  'ｱｲｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜﾝ0123456789ABCDEF障壁黒侵入壊網虚無神経回路識><:;=+-*';

// Chunky digital corruption glyphs for Cyberpunk block tears
const CORRUPT_GLYPHS = ['█', '▓', '▒', '░', '╳', '■', '▲', '▼', '0xFA', '0xNULL', 'ERR', '0x4F'];

// Cyberpunk 2077 UI telemetry diagnostics for block tags
const UI_BLOCK_SNIPPETS = [
  '0x7F4A_OVERFLOW',
  'KIROSHI_OPTICS // 2077',
  'DATA_PACKET // CORRUPT',
  'FRAME_SYNC // 0.00ms',
  'NETWATCH_ICE // PASS',
  'SAFETENSORS // 0xDEAD',
  'MODEL_GUIDE // KERNEL',
];

interface StreamColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
  lastUpdate: number;
  updateInterval: number;
  isBright: boolean;
}

interface GlitchBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  shiftX: number;
  colorType: 'cyan' | 'crimson' | 'yellow';
  hasScanlines: boolean;
  snippet?: string;
}

export function CyberMenuGlitchOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect reduced motion settings
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const fontSize = Math.max(12, Math.min(15, Math.floor(width / 95)));
    const colWidth = fontSize + 4;
    const numCols = Math.floor(width / colWidth);

    const getRandomChar = () =>
      CYBER_RAIN_CHARS[Math.floor(Math.random() * CYBER_RAIN_CHARS.length)];

    const createColumn = (colIndex: number, initialY?: number): StreamColumn => {
      const length = Math.floor(13 + Math.random() * 20);
      const chars: string[] = [];
      for (let i = 0; i < length; i++) {
        chars.push(getRandomChar());
      }

      return {
        x: colIndex * colWidth + Math.floor(colWidth / 2),
        y: initialY !== undefined ? initialY : (Math.random() * -height) / 2,
        speed: 1.2 + Math.random() * 2.2,
        length,
        chars,
        lastUpdate: 0,
        updateInterval: 5 + Math.floor(Math.random() * 7),
        isBright: Math.random() > 0.75,
      };
    };

    const columns: StreamColumn[] = [];
    for (let i = 0; i < numCols; i++) {
      const initialY = (Math.random() * height * 1.5) - height * 0.5;
      columns.push(createColumn(i, initialY));
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;

      const newCols = Math.floor(width / colWidth);
      if (newCols !== columns.length) {
        columns.length = 0;
        for (let i = 0; i < newCols; i++) {
          columns.push(createColumn(i, (Math.random() * height) - height * 0.5));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // =========================================================================
    // CYBERPUNK 2077 UI GLITCH BLOCK ENGINE
    // Distinct, medium-sized horizontal glitch blocks & chromatic tears (24px - 45px)
    // =========================================================================
    let frameCount = 0;
    let isGlitching = false;
    let glitchDuration = 0;
    let glitchElapsed = 0;
    let glitchBlocks: GlitchBlock[] = [];

    const triggerGlitchBlocks = () => {
      isGlitching = true;
      glitchDuration = 14 + Math.floor(Math.random() * 10); // 14-24 frames (~230 - 400ms)
      glitchElapsed = 0;

      // 2 to 4 prominent, medium-sized Cyberpunk glitch blocks
      const numBlocks = 2 + Math.floor(Math.random() * 3);
      glitchBlocks = [];

      for (let s = 0; s < numBlocks; s++) {
        // Distinct height: 22px to 46px (roughly 1.5 - 3 rows of code glyphs)
        const blockH = 22 + Math.random() * 24;
        const blockY = Math.random() * (height - blockH);
        const shiftX = (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 22);

        // Mix between full-width screen tears and localized rectangular data blocks
        const isFullWidth = Math.random() > 0.45;
        const blockW = isFullWidth
          ? width
          : Math.min(width * 0.85, 240 + Math.random() * (width * 0.45));
        const blockX = isFullWidth
          ? 0
          : Math.max(0, Math.random() * (width - blockW));

        const colorTypes: ('cyan' | 'crimson' | 'yellow')[] = ['crimson', 'cyan', 'crimson', 'yellow'];
        const colorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];

        glitchBlocks.push({
          x: blockX,
          y: blockY,
          width: blockW,
          height: blockH,
          shiftX,
          colorType,
          hasScanlines: Math.random() > 0.25,
          snippet: Math.random() > 0.45
            ? UI_BLOCK_SNIPPETS[Math.floor(Math.random() * UI_BLOCK_SNIPPETS.length)]
            : undefined,
        });
      }
    };

    const render = () => {
      if (isVisible) {
        frameCount++;

        ctx.clearRect(0, 0, width, height);

        ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Periodic glitch trigger every ~3.8 seconds (230 frames)
        if (!isGlitching && frameCount % 230 === 0) {
          triggerGlitchBlocks();
        }

        if (isGlitching) {
          glitchElapsed++;
          if (glitchElapsed >= glitchDuration) {
            isGlitching = false;
            glitchBlocks = [];
          }
        }

        // ---------------------------------------------------------------------
        // 1. DRAW VERTICAL JAPANESE & HEX CODE RAIN (PERSIS REFERENSI)
        // ---------------------------------------------------------------------
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];

          col.y += col.speed;

          // Mutate trailing characters periodically
          if (frameCount - col.lastUpdate > col.updateInterval) {
            col.lastUpdate = frameCount;
            const randIdx = Math.floor(Math.random() * col.chars.length);
            col.chars[randIdx] = getRandomChar();
          }

          // Respawn column when trailing tail clears bottom
          const tailY = col.y - col.length * fontSize;
          if (tailY > height) {
            columns[i] = createColumn(i, -fontSize * (2 + Math.random() * 8));
            continue;
          }

          // Render glyphs from tail to head
          for (let j = 0; j < col.length; j++) {
            const charY = col.y - j * fontSize;
            let charX = col.x;

            // Check if this character intersects any active glitch block
            let matchedBlock: GlitchBlock | null = null;
            if (isGlitching && glitchBlocks.length > 0) {
              for (const block of glitchBlocks) {
                if (
                  charY >= block.y &&
                  charY <= block.y + block.height &&
                  col.x >= block.x &&
                  col.x <= block.x + block.width
                ) {
                  charX += block.shiftX;
                  matchedBlock = block;
                  break;
                }
              }
            }

            // Skip offscreen
            if (charY < -fontSize || charY > height + fontSize) continue;

            let char = col.chars[j];
            if (!char) {
              char = col.chars[j] = getRandomChar();
            }

            // High-probability block corruption inside glitch block
            if (matchedBlock && Math.random() < 0.38) {
              char = CORRUPT_GLYPHS[Math.floor(Math.random() * CORRUPT_GLYPHS.length)];
            }

            // Chromatic ghosting if inside an active glitch block
            if (matchedBlock) {
              ctx.save();
              ctx.fillStyle = matchedBlock.colorType === 'cyan' ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 0, 85, 0.45)';
              ctx.fillText(char, charX + (matchedBlock.shiftX > 0 ? -3 : 3), charY);
              ctx.restore();
            }

            // -----------------------------------------------------------------
            // EXACT GRADIENT WARNA CRIMSON GLOWING:
            // Head: Putih menyala (#ffffff) dengan halo merah crimson (#ff003c)
            // Badan: Magenta-crimson neon (#ff0055, #ff1744)
            // Ekor: Merah gelap bertahap memudar (#e11d48 -> #9f1239 -> #4c0519)
            // -----------------------------------------------------------------
            if (j === 0) {
              // Ujung Kepala Drop
              ctx.save();
              ctx.shadowColor = '#ff003c';
              ctx.shadowBlur = col.isBright ? 18 : 12;
              ctx.fillStyle = '#ffffff';
              ctx.fillText(char, charX, charY);
              ctx.restore();
            } else if (j <= 2) {
              // Badan Aliran (Bagian Atas)
              ctx.save();
              ctx.shadowColor = '#ff0055';
              ctx.shadowBlur = 8;
              ctx.fillStyle = col.isBright ? '#ff0055' : '#ff1744';
              ctx.fillText(char, charX, charY);
              ctx.restore();
            } else {
              // Ekor Aliran: Merah gelap bertahap memudar
              const progress = j / col.length;
              const alpha = Math.max(0.04, (1 - progress) * (col.isBright ? 0.88 : 0.65));

              if (progress < 0.35) {
                ctx.fillStyle = `rgba(225, 29, 72, ${alpha})`; // #e11d48
              } else if (progress < 0.7) {
                ctx.fillStyle = `rgba(159, 18, 57, ${alpha})`; // #9f1239
              } else {
                ctx.fillStyle = `rgba(76, 5, 25, ${alpha})`; // #4c0519
              }

              ctx.fillText(char, charX, charY);
            }
          }
        }

        // ---------------------------------------------------------------------
        // 2. CYBERPUNK 2077 GLITCH BLOCK RENDERING (DISTINCT & PUNCHY)
        // ---------------------------------------------------------------------
        if (isGlitching && glitchBlocks.length > 0) {
          ctx.save();

          for (const block of glitchBlocks) {
            const isCyan = block.colorType === 'cyan';
            const isYellow = block.colorType === 'yellow';
            const primaryColor = isCyan ? '#00f0ff' : isYellow ? '#fcee0a' : '#ff003c';
            const bgColor = isCyan
              ? 'rgba(0, 240, 255, 0.12)'
              : isYellow
              ? 'rgba(252, 238, 10, 0.12)'
              : 'rgba(255, 0, 60, 0.15)';

            // A. Tinted Glitch Block Container
            ctx.fillStyle = bgColor;
            ctx.fillRect(block.x, block.y, block.width, block.height);

            // B. Top and Bottom Glowing Razor Tears (1.5px)
            ctx.fillStyle = primaryColor;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 8;
            ctx.fillRect(block.x, block.y, block.width, 1.5);
            ctx.fillRect(block.x, block.y + block.height - 1.5, block.width, 1.5);

            // C. Chamfered Accent Corner Bracket
            ctx.fillRect(block.x, block.y, 4, block.height);

            // D. CRT Scanline noise inside block
            if (block.hasScanlines) {
              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
              for (let lineY = block.y; lineY < block.y + block.height; lineY += 3) {
                ctx.fillRect(block.x, lineY, block.width, 1);
              }
            }

            // E. Clear Cyberpunk HUD Diagnostic Tag inside block
            if (block.snippet) {
              ctx.save();
              ctx.font = '700 10px monospace';
              ctx.fillStyle = primaryColor;
              ctx.shadowColor = primaryColor;
              ctx.shadowBlur = 6;
              ctx.textAlign = 'left';
              const textX = block.x + 12;
              const textY = block.y + (block.height - 10) / 2;
              ctx.fillText(`[${block.snippet}]`, textX, textY);
              ctx.restore();
            }
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mg-cyber-menu-glitch-overlay"
      aria-hidden="true"
    />
  );
}
