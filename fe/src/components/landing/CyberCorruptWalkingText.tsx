import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Authentic Katakana runs & cyber corrupt glyphs matching the reference typewriter image (G ソ NER テノック E AI.)
export const KATAKANA_RUNS = [
  ['テ', 'ノ', 'ッ', 'ク'], // Exact run from user reference screenshot "テノック"
  ['テ', 'ノ', 'ツ', 'ク'],
  ['ネ', 'ノ', 'オ', 'ソ'],
  ['カ', 'セ', 'ク', 'ソ'],
  ['シ', 'ス', 'テ', 'ﾑ'],
  ['ハ', 'ッ', 'シ', 'ュ'],
  ['ネ', 'ッ', 'ト', 'ﾜ'],
  ['サ', 'イ', 'バ', 'ー'],
  ['マ', 'ト', 'リ', 'ｸ'],
];

export const KATAKANA_SINGLES = ['ソ', 'カ', 'ア', 'ク', 'ツ', 'ネ', 'ノ', 'オ', 'Δ', '§', '█', '░', '7', 'X'];

// Half-width Katakana retained for ticker backward-compatibility
export const KATAKANA_GLYPHS = [
  'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ',
  'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ', 'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ',
  'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ',
  'ﾏ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ', 'ﾘ',
  'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ﾝ', '0', '1', '7', '9', 'X', 'F', '█', '░', '▓'
];

export interface WalkingChar {
  char: string;
  isCorrupted: boolean;
}

/**
 * Generates typewriter Katakana corruption for an individual word.
 * Injects 3-4 char Katakana runs and isolated singles directly into the word,
 * replicating the Hero typewriter aesthetic: "G ソ NER テノック E AI."
 */
export function generateTypewriterCorruptWord(word: string): WalkingChar[] {
  if (word.length <= 2) {
    return word.split('').map((c) => ({ char: c, isCorrupted: false }));
  }

  const chars = word.split('');
  const flags = new Array(chars.length).fill(false);

  if (word.length >= 8) {
    // Longer words (e.g. SOVEREIGNTY, ARCHITECTURE, WORKSTATION):
    // 1. Pick a Katakana run
    const run = KATAKANA_RUNS[Math.floor(Math.random() * KATAKANA_RUNS.length)];
    const startIdx = Math.max(1, Math.min(chars.length - run.length, Math.floor(chars.length * 0.38)));

    for (let i = 0; i < run.length; i++) {
      const target = startIdx + i;
      if (target < chars.length && /[a-zA-Z0-9]/.test(chars[target])) {
        chars[target] = run[i];
        flags[target] = true;
      }
    }

    // 2. Isolated single Katakana earlier in the word (e.g. 'ソ' in 'G ソ NER')
    if (startIdx >= 2) {
      const earlyIdx = Math.floor(Math.random() * (startIdx - 1)) + 1;
      if (earlyIdx < chars.length && /[a-zA-Z0-9]/.test(chars[earlyIdx])) {
        chars[earlyIdx] = KATAKANA_SINGLES[Math.floor(Math.random() * KATAKANA_SINGLES.length)];
        flags[earlyIdx] = true;
      }
    }
  } else if (word.length >= 5) {
    // Medium words (e.g. LOCAL, SUITE):
    const run = KATAKANA_RUNS[Math.floor(Math.random() * KATAKANA_RUNS.length)];
    const runLen = Math.min(2, chars.length - 2);
    const startIdx = Math.max(1, Math.floor(chars.length * 0.28));

    for (let i = 0; i < runLen; i++) {
      const target = startIdx + i;
      if (target < chars.length && /[a-zA-Z0-9]/.test(chars[target])) {
        chars[target] = run[i];
        flags[target] = true;
      }
    }

    if (chars.length >= 5 && Math.random() > 0.45) {
      const singleIdx = chars.length - 1;
      if (!flags[singleIdx] && /[a-zA-Z0-9]/.test(chars[singleIdx])) {
        chars[singleIdx] = KATAKANA_SINGLES[Math.floor(Math.random() * KATAKANA_SINGLES.length)];
        flags[singleIdx] = true;
      }
    }
  } else {
    // 3-4 chars (e.g. MOD, LAB, SEC):
    const targetIdx = 1;
    if (targetIdx < chars.length && /[a-zA-Z0-9]/.test(chars[targetIdx])) {
      chars[targetIdx] = KATAKANA_SINGLES[Math.floor(Math.random() * KATAKANA_SINGLES.length)];
      flags[targetIdx] = true;
    }
  }

  return chars.map((ch, idx) => ({
    char: ch,
    isCorrupted: flags[idx],
  }));
}

/**
 * Backward compatibility helper for character-based callers
 */
export function generateWalkingCorruptChars(text: string, _wavePos?: number, _waveWidth?: number): WalkingChar[] {
  return generateTypewriterCorruptWord(text);
}

export interface CyberCorruptWalkingTextProps {
  text: string;
  japaneseSuffix?: string;
  className?: string;
  delayMs?: number;
  cycleMs?: number;
  stepSpeed?: number;
  waveWidth?: number;
  triggerOnHover?: boolean;
  accent?: 'yellow' | 'cyan' | 'green';
  onWaveComplete?: () => void;
}

interface TokenState {
  raw: string;
  isSpace: boolean;
  isTargetWord: boolean;
  charItems: WalkingChar[];
}

/**
 * High-voltage Cyberpunk Typewriter Walking Text.
 * Directly replicates the Hero Typewriter corruption burst (G ソ NER テノック E AI.)
 * and smoothly walks the Katakana corruption across each word in sequence!
 */
export const CyberCorruptWalkingText: React.FC<CyberCorruptWalkingTextProps> = ({
  text,
  japaneseSuffix,
  className = '',
  delayMs = 500,
  cycleMs = 4600,
  triggerOnHover = true,
  accent = 'yellow',
  onWaveComplete,
}) => {
  const fullOriginalText = useMemo(() => {
    return japaneseSuffix ? `${text} · ${japaneseSuffix}` : text;
  }, [text, japaneseSuffix]);

  // Tokenize text into words and spaces preserving exact whitespace structure
  const initialTokens = useMemo<TokenState[]>(() => {
    const segments = fullOriginalText.split(/(\s+)/);
    return segments.map((seg) => {
      const isSpace = /^\s+$/.test(seg);
      // Words with letters/numbers and length >= 3 qualify for corruption
      const isTargetWord = !isSpace && /[a-zA-Z0-9]/.test(seg) && seg.length >= 3;
      return {
        raw: seg,
        isSpace,
        isTargetWord,
        charItems: seg.split('').map((c) => ({ char: c, isCorrupted: false })),
      };
    });
  }, [fullOriginalText]);

  const [tokens, setTokens] = useState<TokenState[]>(initialTokens);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number>(-1);
  const isRunningRef = useRef(false);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrambleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWalkingWave = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Collect indices of tokens that are corrupable target words
    const targetIndices: number[] = [];
    initialTokens.forEach((tok, idx) => {
      if (tok.isTargetWord) targetIndices.push(idx);
    });

    if (targetIndices.length === 0) {
      isRunningRef.current = false;
      return;
    }

    let step = 0;

    const runStep = () => {
      if (step >= targetIndices.length) {
        // Complete walking wave: clean snap-back to pristine original English
        setActiveTokenIdx(-1);
        setTokens(initialTokens);
        isRunningRef.current = false;
        if (onWaveComplete) onWaveComplete();
        return;
      }

      const currentTokenIdx = targetIndices[step];
      const currentToken = initialTokens[currentTokenIdx];
      setActiveTokenIdx(currentTokenIdx);

      // Dedicated burst duration for this word (punchy with micro glitch)
      const wordLen = currentToken.raw.length;
      const wordDuration = wordLen >= 8 ? 560 : wordLen >= 5 ? 380 : 280;

      // Immediately corrupt active word
      setTokens((prev) =>
        prev.map((tok, idx) => {
          if (idx === currentTokenIdx) {
            return {
              ...tok,
              charItems: generateTypewriterCorruptWord(tok.raw),
            };
          }
          return {
            ...tok,
            charItems: tok.raw.split('').map((c) => ({ char: c, isCorrupted: false })),
          };
        })
      );

      // Live Katakana scramble every 65ms during this word's burst
      if (scrambleTimerRef.current) clearInterval(scrambleTimerRef.current);
      scrambleTimerRef.current = setInterval(() => {
        setTokens((prev) =>
          prev.map((tok, idx) => {
            if (idx === currentTokenIdx) {
              return {
                ...tok,
                charItems: generateTypewriterCorruptWord(tok.raw),
              };
            }
            return tok;
          })
        );
      }, 65);

      // Once word duration expires: snap word back and move immediately to next word
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
      waveTimerRef.current = setTimeout(() => {
        if (scrambleTimerRef.current) {
          clearInterval(scrambleTimerRef.current);
          scrambleTimerRef.current = null;
        }

        // Snap current word back to clean English
        setTokens((prev) =>
          prev.map((tok, idx) => {
            if (idx === currentTokenIdx) {
              return {
                ...tok,
                charItems: tok.raw.split('').map((c) => ({ char: c, isCorrupted: false })),
              };
            }
            return tok;
          })
        );

        // Walk to the next word
        step += 1;
        waveTimerRef.current = setTimeout(runStep, 35);
      }, wordDuration);
    };

    runStep();
  }, [initialTokens, onWaveComplete]);

  // Periodic wave cycle & reset
  useEffect(() => {
    setTokens(initialTokens);
    setActiveTokenIdx(-1);

    let initialTimer: ReturnType<typeof setTimeout>;
    let intervalTimer: ReturnType<typeof setInterval>;

    initialTimer = setTimeout(() => {
      startWalkingWave();
      intervalTimer = setInterval(() => {
        startWalkingWave();
      }, cycleMs);
    }, delayMs);

    return () => {
      clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
      if (scrambleTimerRef.current) clearInterval(scrambleTimerRef.current);
      isRunningRef.current = false;
    };
  }, [initialTokens, delayMs, cycleMs, startWalkingWave]);

  const handleMouseEnter = useCallback(() => {
    if (triggerOnHover && !isRunningRef.current) {
      startWalkingWave();
    }
  }, [triggerOnHover, startWalkingWave]);

  // Dynamically compute live text string (including active Katakana typewriter runes)
  // so that ::before and ::after pseudo-elements (attr(data-text)) receive the live corrupted text
  const currentFullText = useMemo(() => {
    return tokens.map((tok) => tok.charItems.map((c) => c.char).join('')).join('');
  }, [tokens]);

  return (
    <span
      className={`mg-corrupt-walking-text accent-${accent} ${activeTokenIdx >= 0 ? 'is-corrupting' : ''} ${className}`}
      data-text={currentFullText}
      data-original={fullOriginalText}
      onMouseEnter={handleMouseEnter}
      style={{ cursor: triggerOnHover ? 'pointer' : 'default' }}
      title="Hover untuk memicu korup typewriter berjalan"
    >
      {tokens.map((token, tIdx) => {
        if (token.isSpace) {
          return (
            <span key={tIdx} className="mg-space-char" aria-hidden="true">
              {token.raw.replace(/ /g, '\u00A0')}
            </span>
          );
        }
        const isWordActive = tIdx === activeTokenIdx;
        return (
          <span
            key={tIdx}
            className={`mg-corrupt-word ${isWordActive ? 'is-active-corrupt' : ''}`}
          >
            {token.charItems.map((item, cIdx) => (
              <span
                key={cIdx}
                className={item.isCorrupted ? `mg-corrupt-char ${accent}` : 'mg-plain-char'}
              >
                {item.char}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
};

export interface CyberCorruptTickerProps {
  items: string[];
  accent?: 'cyan' | 'green' | 'amber' | 'magenta';
  speedSec?: number;
  className?: string;
  glitchIntervalMs?: number;
}

/**
 * Continuous horizontal walking ticker tape of data streams (No //, clean dot separator)
 */
export const CyberCorruptTicker: React.FC<CyberCorruptTickerProps> = ({
  items,
  accent = 'cyan',
  speedSec = 28,
  className = '',
  glitchIntervalMs = 800,
}) => {
  const streamBase = useMemo(() => items.join('   ·   '), [items]);
  const [displayStream, setDisplayStream] = useState(streamBase);

  // Clean real-time character walk/morph
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() < 0.75) {
        const chars = streamBase.split('');
        const corruptCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < corruptCount; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          if (chars[idx] !== ' ' && chars[idx] !== '·') {
            chars[idx] = KATAKANA_GLYPHS[Math.floor(Math.random() * (KATAKANA_GLYPHS.length - 8))];
          }
        }
        setDisplayStream(chars.join(''));

        setTimeout(() => {
          setDisplayStream(streamBase);
        }, 180);
      }
    }, glitchIntervalMs);

    return () => clearInterval(timer);
  }, [streamBase, glitchIntervalMs]);

  return (
    <div className={`mg-corrupt-ticker accent-${accent} ${className}`} aria-hidden="true">
      <div
        className="mg-corrupt-ticker-track"
        style={{ animationDuration: `${speedSec}s` }}
      >
        <span className="mg-corrupt-ticker-item">
          {displayStream}
        </span>
        <span className="mg-corrupt-ticker-sep" aria-hidden="true">{'   ◆   '}</span>
        <span className="mg-corrupt-ticker-item">
          {displayStream}
        </span>
        <span className="mg-corrupt-ticker-sep" aria-hidden="true">{'   ◆   '}</span>
        <span className="mg-corrupt-ticker-item">
          {displayStream}
        </span>
      </div>
    </div>
  );
};

export interface CyberRunningJapaneseStreamProps {
  accent?: 'cyan' | 'green' | 'amber' | 'magenta';
  speedSec?: number;
  className?: string;
  leadLabel?: string;
}

const STREAM_KATAKANA_RUNS = [
  'テノック',
  'ネノオソ',
  'カセクソ',
  'システﾑ',
  'ハッシュ',
  'ネットﾜ',
  'サイバー',
  'マトリｸ',
  'オプティック',
];

/**
 * Dedicated Running Corrupted Japanese Text Stream (Teks Korup Jepang Berjalan)
 * Continuously scrolls horizontally while authentic Typewriter Katakana runs actively mutate in real-time.
 */
export const CyberRunningJapaneseStream: React.FC<CyberRunningJapaneseStreamProps> = ({
  accent = 'cyan',
  speedSec = 22,
  className = '',
  leadLabel,
}) => {
  const getRandomRun = useCallback(() => {
    return STREAM_KATAKANA_RUNS[Math.floor(Math.random() * STREAM_KATAKANA_RUNS.length)];
  }, []);

  const [streamText, setStreamText] = useState(() => {
    return `[STREAM 0x8F] テノック 844KB · DATA-AIR-GAP ネノオソ · ALLOC-14GB カセクソ · FP16-TENSORS システﾑ · DETERMINISTIC ハッシュ · 0.00MS-DMA ネットﾜ · RUNTIME サイバー`;
  });

  // Mutate authentic Katakana runs every 110ms in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setStreamText(
        `[STREAM 0x8F] ${getRandomRun()} 844KB · DATA-AIR-GAP ${getRandomRun()} · ALLOC-14GB ${getRandomRun()} · FP16-TENSORS ${getRandomRun()} · DETERMINISTIC ${getRandomRun()} · 0.00MS-DMA ${getRandomRun()} · RUNTIME ${getRandomRun()}`
      );
    }, 110);
    return () => clearInterval(timer);
  }, [getRandomRun]);

  return (
    <div className={`mg-corrupt-ticker accent-${accent} ${className}`} aria-hidden="true">
      {leadLabel && (
        <span className="mg-stream-lead-pill">
          {leadLabel}
        </span>
      )}
      <div
        className="mg-corrupt-ticker-track"
        style={{ animationDuration: `${speedSec}s` }}
      >
        <span className="mg-corrupt-ticker-item">{streamText}</span>
        <span className="mg-corrupt-ticker-sep">{'   ◆   '}</span>
        <span className="mg-corrupt-ticker-item">{streamText}</span>
        <span className="mg-corrupt-ticker-sep">{'   ◆   '}</span>
        <span className="mg-corrupt-ticker-item">{streamText}</span>
      </div>
    </div>
  );
};

export interface CyberLiveDecryptTextProps {
  label?: string;
  glyphCount?: number;
  suffix?: string;
  className?: string;
}

/**
 * Live inline deciphering text with real-time Katakana walking scramble
 */
export const CyberLiveDecryptText: React.FC<CyberLiveDecryptTextProps> = ({
  label = 'DECRYPT_STREAM',
  glyphCount = 6,
  suffix = '[PASSED · OK]',
  className = '',
}) => {
  const [glyphs, setGlyphs] = useState('テノック');

  useEffect(() => {
    const timer = setInterval(() => {
      const run = STREAM_KATAKANA_RUNS[Math.floor(Math.random() * STREAM_KATAKANA_RUNS.length)];
      setGlyphs(run);
    }, 85);
    return () => clearInterval(timer);
  }, [glyphCount]);

  return (
    <span className={`mg-live-decrypt-text ${className}`}>
      {label && <span className="mg-decrypt-label">{label}: </span>}
      <span className="mg-decrypt-glyphs" style={{ color: '#00ff9d', fontWeight: 800 }}>{glyphs}</span>
      {suffix && <span className="mg-decrypt-suffix"> {suffix}</span>}
    </span>
  );
};

export interface CyberSeparateGlitchProps {
  label?: string;
  className?: string;
}

/**
 * Separate glitch indicator that stays completely detached from the text
 */
export const CyberSeparateGlitch: React.FC<CyberSeparateGlitchProps> = ({
  label = '⚡ GLITCH',
  className = '',
}) => {
  return (
    <span className={`mg-separate-glitch-badge ${className}`} aria-hidden="true">
      {label}
    </span>
  );
};

export interface CyberGlitchBadgeProps {
  japaneseTag?: string;
  label: string;
  accent?: 'cyan' | 'green' | 'amber' | 'magenta';
  className?: string;
}

/**
 * Compact HUD badge with optional Japanese tag and English label
 */
export const CyberGlitchBadge: React.FC<CyberGlitchBadgeProps> = ({
  japaneseTag,
  label,
  accent = 'cyan',
  className = '',
}) => {
  return (
    <div className={`mg-glitch-badge accent-${accent} ${className}`}>
      {japaneseTag && (
        <>
          <span className="mg-gb-jp">{japaneseTag}</span>
          <span className="mg-gb-sep">·</span>
        </>
      )}
      <span className="mg-gb-label">{label}</span>
    </div>
  );
};

export default CyberCorruptWalkingText;
