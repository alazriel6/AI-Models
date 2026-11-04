import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { ModelsResponse, Model } from '../../api/models';
import { CyberSectionNavigator } from './CyberSectionNavigator';
import { CyberCorruptWalkingText, CyberSeparateGlitch, generateTypewriterCorruptWord } from './CyberCorruptWalkingText';
import { SamuraiEmblem } from '../common/SamuraiEmblem';

interface TacticalChassisUnit {
  id: string;
  tabLabel: string;
  unitCode: string;
  name: string;
  slug: string;
  vramBadge: string;
  vramGb: number;
  prediction: string;
  nativeRes: string;
  samplerStack: string;
  cfgScale: string;
  allocText: string;
  thumbnailUrl: string;
  flowerAccentText: string;
  activeTargetPct: string;
  tags: string[];
}

interface SafeTensorsDemoFile {
  id: string;
  fileName: string;
  label: string;
  format: string;
  tensors: string;
  headerSize: string;
  hash: string;
  audit: string;
  architecture: string;
}

const SAFETENSORS_DEMO_FILES: SafeTensorsDemoFile[] = [
  {
    id: 'hassaku',
    fileName: 'HASSAKU_XL_v13.safetensors',
    label: 'Hassaku.safetensors',
    format: 'FP16',
    tensors: '2,512',
    headerSize: '44.2 KB',
    hash: '0x8F9A...E41C',
    audit: 'PASSED (ZERO PYTHON PICKLE)',
    architecture: 'ILLUSTRIOUS XL',
  },
  {
    id: 'noobai',
    fileName: 'NOOBAI_XL_EPSILON.safetensors',
    label: 'NoobAI.safetensors',
    format: 'FP16 (V-PRED)',
    tensors: '2,840',
    headerSize: '52.8 KB',
    hash: '0x3C4D...901B',
    audit: 'PASSED (ZERO PYTHON PICKLE)',
    architecture: 'NOOBAI V-PRED',
  },
  {
    id: 'flux',
    fileName: 'FLUX1_DEV_FP8.safetensors',
    label: 'Flux1.safetensors',
    format: 'BF16 / FP8',
    tensors: '3,120',
    headerSize: '68.4 KB',
    hash: '0x7E1F...A225',
    audit: 'PASSED (ZERO PYTHON PICKLE)',
    architecture: 'FLUX.1 DEV',
  },
];

interface GpuOption {
  id: '3060' | '4070' | '4090';
  name: string;
  vramTotal: number;
  vramLabel: string;
  busWidth: string;
  accentColor: 'cyan' | 'green' | 'amber';
}

const GPU_OPTIONS: GpuOption[] = [
  { id: '3060', name: 'RTX 3060', vramTotal: 12, vramLabel: '12 GB GDDR6', busWidth: '192-bit', accentColor: 'cyan' },
  { id: '4070', name: 'RTX 4070 Ti', vramTotal: 16, vramLabel: '16 GB GDDR6X', busWidth: '256-bit', accentColor: 'green' },
  { id: '4090', name: 'RTX 4090', vramTotal: 24, vramLabel: '24 GB GDDR6X', busWidth: '384-bit', accentColor: 'amber' },
];

const TACTICAL_ANIME_CHASSIS: TacticalChassisUnit[] = [
  {
    id: '01',
    tabLabel: '01 // ILLUSTRIOUS',
    unitCode: '01 · ILLUSTRIOUS',
    name: 'HASSAKU XL (ILLUSTRIOUS)',
    slug: 'wai-illustrious-sdxl',
    vramBadge: '6.5 GB FP16',
    vramGb: 6.5,
    prediction: 'EPSILON (v1.1)',
    nativeRes: '832 × 1216 PX',
    samplerStack: 'EULER A + KARRAS',
    cfgScale: '5.5 - 7.0',
    allocText: 'VRAM: 6.46 GB ALLOC',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/width=600/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
    flowerAccentText: '✿ TARGET LOCK',
    activeTargetPct: 'TGT_LOCK 100%',
    tags: ['#masterpiece', '#score_9', '#detailed_anime_eyes', '#clean_lineart', '#highres'],
  },
  {
    id: '02',
    tabLabel: '02 // NOOBAI',
    unitCode: '02 · NOOBAI',
    name: 'NOOBAI-XL EPSILON',
    slug: 'wai-shuffle-noob',
    vramBadge: '7.2 GB FP16',
    vramGb: 7.2,
    prediction: 'V-PREDICTION',
    nativeRes: '1024 × 1360 PX',
    samplerStack: 'EULER A + SGM UNIFORM',
    cfgScale: '4.5 - 6.0',
    allocText: 'VRAM: 7.18 GB ALLOC',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/width=600/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
    flowerAccentText: '⚡ OPTIC LOCK',
    activeTargetPct: 'TGT_LOCK 100%',
    tags: ['#v_prediction', '#score_9_up', '#source_anime', '#cinematic_lighting', '#masterpiece'],
  },
  {
    id: '03',
    tabLabel: '03 // SDXL',
    unitCode: '03 · ILLUSTRIOUS',
    name: 'WAI-ILLUSTRIOUS V14',
    slug: 'raehoshi-illust-xl',
    vramBadge: '6.0 GB FP16',
    vramGb: 6.0,
    prediction: 'EPSILON (v1.0)',
    nativeRes: '832 × 1216 PX',
    samplerStack: 'DPM++ 2M KARRAS',
    cfgScale: '5.0 - 6.5',
    allocText: 'VRAM: 5.92 GB ALLOC',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/width=600/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
    flowerAccentText: '◈ TARGET LOCK',
    activeTargetPct: 'TGT_LOCK 100%',
    tags: ['#masterpiece', '#anime_aesthetic', '#crisp_linework', '#rating:general', '#soft_glow'],
  },
];

function scrambleText(text: string): string {
  return generateTypewriterCorruptWord(text)
    .map((item) => item.char)
    .join('');
}

let sharedAudioCtx: AudioContext | null = null;

/**
 * Procedural Web Audio Sound Generator for mechanical blast gate events:
 * - 'slam': Heavy hydraulic sub-bass collision + metallic impact
 * - 'unseal': Pressurized pneumatic air release hiss
 * - 'latch': Hydraulic damper arrest thud
 */
function playGateSound(type: 'slam' | 'unseal' | 'latch') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
      return;
    }

    const now = sharedAudioCtx.currentTime;

    if (type === 'slam') {
      // Sub-bass heavy metallic slam
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.42);

      // High metal clank transient
      const clank = sharedAudioCtx.createOscillator();
      const clankGain = sharedAudioCtx.createGain();
      clank.type = 'sine';
      clank.frequency.setValueAtTime(420, now);
      clank.frequency.exponentialRampToValueAtTime(110, now + 0.14);

      clankGain.gain.setValueAtTime(0.18, now);
      clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      clank.connect(clankGain);
      clankGain.connect(sharedAudioCtx.destination);
      clank.start(now);
      clank.stop(now + 0.16);
    } else if (type === 'unseal') {
      // Pressurized pneumatic hiss release
      const bufferSize = Math.floor(sharedAudioCtx.sampleRate * 0.22);
      const buffer = sharedAudioCtx.createBuffer(1, bufferSize, sharedAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sharedAudioCtx.sampleRate * 0.07));
      }
      const noise = sharedAudioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = sharedAudioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
      filter.Q.value = 2.5;

      const gain = sharedAudioCtx.createGain();
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      noise.start(now);
    } else if (type === 'latch') {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.20);
    }
  } catch {
    // Fail silently on restricted autoplay policy
  }
}

export function EditorialStatement() {
  const navigate = useNavigate();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const leftGateRef = useRef<HTMLDivElement | null>(null);
  const rightGateRef = useRef<HTMLDivElement | null>(null);
  const payloadRef = useRef<HTMLDivElement | null>(null);

  // Screen Trauma Shake & Collision Flash Refs
  const screenShakeRef = useRef<HTMLDivElement | null>(null);
  const slamFlashRef = useRef<HTMLDivElement | null>(null);

  // Cyberpunk 2077 HUD Center Overlay Refs
  const centerHudRef = useRef<HTMLDivElement | null>(null);
  const ladderFillRef = useRef<HTMLDivElement | null>(null);
  const loadingTextRef = useRef<HTMLSpanElement | null>(null);

  // Parallax Layer Refs
  const bgGridRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Chassis Units state
  const [chassisUnits, setChassisUnits] = useState<TacticalChassisUnit[]>(TACTICAL_ANIME_CHASSIS);
  const [activeChassisIdx, setActiveChassisIdx] = useState<number>(0);
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  const [glitchDisplayName, setGlitchDisplayName] = useState<string>(TACTICAL_ANIME_CHASSIS[0].name);

  // Interactive state for Cockpit Deck
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [selectedGpuId, setSelectedGpuId] = useState<'3060' | '4070' | '4090'>('4070');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopyTag = useCallback((tag: string) => {
    const clean = tag.replace(/^#/, '');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean);
    }
    setCopiedTag(tag);
    setTimeout(() => {
      setCopiedTag((curr) => (curr === tag ? null : curr));
    }, 1800);
  }, []);

  // Fetch real database models if backend is online
  useEffect(() => {
    let isMounted = true;
    apiFetch<ModelsResponse>('/models?limit=6')
      .then((res) => {
        if (!isMounted || !res || !res.data || res.data.length === 0) return;
        const mapped = res.data.slice(0, 3).map((m: Model, idx: number): TacticalChassisUnit => {
          const fallback = TACTICAL_ANIME_CHASSIS[idx % TACTICAL_ANIME_CHASSIS.length];
          const baseTag = (m.base_model || '').toUpperCase();
          const parsedVram = m.vram_min ? parseFloat(m.vram_min) || fallback.vramGb : fallback.vramGb;
          return {
            id: `dynamic-${m.id}`,
            tabLabel: fallback.tabLabel,
            unitCode: fallback.unitCode,
            name: m.name.toUpperCase(),
            slug: m.slug || String(m.id),
            vramBadge: m.vram_min ? `${m.vram_min} FP16` : fallback.vramBadge,
            vramGb: parsedVram,
            prediction: baseTag.includes('NOOB') ? 'V-PREDICTION' : 'EPSILON (v1.1)',
            nativeRes: fallback.nativeRes,
            samplerStack: fallback.samplerStack,
            cfgScale: fallback.cfgScale,
            allocText: fallback.allocText,
            thumbnailUrl: m.thumbnail_url || fallback.thumbnailUrl,
            flowerAccentText: fallback.flowerAccentText,
            activeTargetPct: 'TGT_LOCK 100%',
            tags: fallback.tags,
          };
        });
        if (mapped.length > 0) {
          setChassisUnits(mapped);
          setGlitchDisplayName(mapped[0].name);
        }
      })
      .catch(() => {
        // Fallback array remains active
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChassisTabSwitch = useCallback((targetIdx: number) => {
    if (targetIdx === activeChassisIdx) return;
    const targetUnit = chassisUnits[targetIdx] || TACTICAL_ANIME_CHASSIS[targetIdx];
    if (!targetUnit) return;

    setIsGlitching(true);
    setGlitchDisplayName(scrambleText(targetUnit.name));

    const scrambleInterval = setInterval(() => {
      setGlitchDisplayName(scrambleText(targetUnit.name));
    }, 32);

    setTimeout(() => {
      clearInterval(scrambleInterval);
      setActiveChassisIdx(targetIdx);
      setGlitchDisplayName(targetUnit.name);
      setIsGlitching(false);
    }, 150);
  }, [activeChassisIdx, chassisUnits]);

  // Interactive Click-to-Unlock handler
  const handleUnlockClick = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollable = Math.max(1, rect.height - vh);
    const targetScroll = window.scrollY + rect.top + Math.max(240, scrollable * 0.70);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  // 120FPS Ultra-Smooth Hydraulic Parallax (360vh Track + Perlin Smootherstep + Frame-Rate Independent Exponential Smoothing)
  useEffect(() => {
    let rafId: number;
    let currentP = 0;
    let lastP = 0;
    let lastEaseOpen = 0;
    let lastTime = performance.now();

    // Game-feel Trauma & Shake state variables
    let impactTrauma = 0;
    let unsealTrauma = 0;
    let impactStartTime = 0;
    let unsealStartTime = 0;
    let slamFlashTimer = 0;

    // Perlin Smootherstep (6t^5 - 15t^4 + 10t^3) for zero-jerk acceleration/deceleration
    const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrollable = Math.max(1, rect.height - vh);

        // Responsive scroll progress: Pre-engaging buffer (vh * 0.12)
        const scrolled = -rect.top + vh * 0.12;
        const targetP = Math.max(0, Math.min(1, scrolled / (scrollable + vh * 0.12)));

        // Frame-rate independent exponential damping (~5.8 factor)
        const smoothFactor = 1 - Math.exp(-5.8 * dt);
        currentP += (targetP - currentP) * smoothFactor;

        // Velocity of gate progress
        const gateVelocity = (currentP - lastP) / dt;
        lastP = currentP;

        // Gate separation across 76% of track
        const rawOpen = Math.max(0, Math.min(1, (currentP - 0.10) / 0.78));
        const easeOpen = smootherstep(rawOpen);
        const isFullyOpen = easeOpen >= 0.995;

        // -------------------------------------------------------------
        // GAME-FEEL EVENT DETECTIONS (Impact Slam, Unseal Shudder, Latch)
        // -------------------------------------------------------------
        // 1. CLOSING IMPACT SLAM: Gates collide shut at the center
        if (lastEaseOpen > 0.015 && easeOpen <= 0.008 && gateVelocity < -0.01) {
          const slamForce = Math.min(1.0, 0.45 + Math.abs(gateVelocity) * 1.8);
          impactTrauma = slamForce;
          impactStartTime = now;
          slamFlashTimer = now + 160; // 160ms electromagnetic spark flash
          playGateSound('slam');
        }

        // 2. OPENING UNSEAL BREAKAWAY: Hydraulic vacuum seal breaks open
        if (lastEaseOpen <= 0.005 && easeOpen > 0.005 && gateVelocity > 0.01) {
          unsealTrauma = Math.min(1.0, 0.5 + Math.abs(gateVelocity) * 1.4);
          unsealStartTime = now;
          playGateSound('unseal');
        }

        // 3. FULL OPEN ARREST LATCH: Hydraulic dampers arrest the door at maximum stroke
        if (lastEaseOpen < 0.985 && easeOpen >= 0.99 && gateVelocity > 0.01) {
          impactTrauma = 0.35;
          impactStartTime = now;
          playGateSound('latch');
        }

        lastEaseOpen = easeOpen;

        // -------------------------------------------------------------
        // PHYSICAL DISPLACEMENT & SHOCKWAVE CALCULATIONS
        // -------------------------------------------------------------
        let shockX = 0;
        let shockY = 0;
        let shockRot = 0;
        let gateBounce = 0;

        // Impact Shockwave (Exponentially decaying multi-harmonic vibration + elastic gate bounce)
        if (impactTrauma > 0.001) {
          const dtImpact = (now - impactStartTime) / 1000;
          if (dtImpact < 0.55) {
            const envelope = Math.exp(-dtImpact * 9.0) * impactTrauma;
            const wave = Math.sin(dtImpact * 34 * Math.PI * 2);
            shockY = wave * 7.5 * envelope;
            shockX = Math.cos(dtImpact * 26 * Math.PI * 2) * 4.2 * envelope;
            shockRot = wave * 0.35 * envelope;
            // Physical rebound: massive steel doors bounce slightly outward before sealing
            gateBounce = Math.max(0, Math.sin(dtImpact * 20 * Math.PI) * 2.2 * envelope);
          } else {
            impactTrauma = 0;
          }
        }

        // Unseal Breakaway Shudder (High-frequency pneumatic vibration)
        let unsealX = 0;
        let unsealY = 0;
        if (unsealTrauma > 0.001) {
          const dtUnseal = (now - unsealStartTime) / 1000;
          if (dtUnseal < 0.35) {
            const envelope = Math.exp(-dtUnseal * 11.0) * unsealTrauma;
            const wave = Math.sin(dtUnseal * 48 * Math.PI * 2);
            unsealY = wave * 5.0 * envelope;
            unsealX = Math.cos(dtUnseal * 38 * Math.PI * 2) * 3.5 * envelope;
          } else {
            unsealTrauma = 0;
          }
        }

        // Continuous Industrial Motor Rumble (while sliding actively)
        const isMoving = Math.abs(gateVelocity) > 0.012 && easeOpen > 0.005 && easeOpen < 0.995;
        const rumbleIntensity = isMoving ? Math.min(1.0, Math.abs(gateVelocity) * 1.5) : 0;
        const rumbleY = isMoving ? (Math.sin(now * 0.042) * 1.6 + Math.sin(now * 0.088) * 0.8) * rumbleIntensity : 0;
        const rumbleX = isMoving ? (Math.cos(now * 0.036) * 1.1 + Math.sin(now * 0.074) * 0.5) * rumbleIntensity : 0;
        const gateMicroTilt = isMoving ? Math.sin(now * 0.028) * 0.15 * rumbleIntensity : 0;

        // Apply Camera / Screen Trauma Shake to entire sticky stage:
        const totalScreenX = shockX + unsealX + rumbleX * 0.5;
        const totalScreenY = shockY + unsealY + rumbleY * 0.5;
        const totalScreenRot = shockRot;

        if (screenShakeRef.current) {
          screenShakeRef.current.style.transform = `translate3d(${totalScreenX.toFixed(2)}px, ${totalScreenY.toFixed(2)}px, 0) rotate(${totalScreenRot.toFixed(3)}deg)`;
        }

        // Slam Electric Arc Flash on the center seam:
        if (slamFlashRef.current) {
          const isFlashing = now < slamFlashTimer;
          slamFlashRef.current.style.opacity = isFlashing ? '0.92' : '0';
        }

        // Blast Gate Assembly Separation:
        // Left Assembly slides to far left (-105%)
        // Right Assembly slides to far right (+105%)
        // Plus mechanical rebound bounce, vertical rumble, and micro-tilt
        if (leftGateRef.current && rightGateRef.current) {
          const txLeft = Math.max(0, easeOpen * 105 + gateBounce).toFixed(3);
          const txRight = Math.max(0, easeOpen * 105 + gateBounce).toFixed(3);

          const gateLeftY = (rumbleY + shockY * 0.7).toFixed(2);
          const gateRightY = (-rumbleY - shockY * 0.7).toFixed(2);
          const rotLeft = (-gateMicroTilt + shockRot * 0.5).toFixed(3);
          const rotRight = (gateMicroTilt - shockRot * 0.5).toFixed(3);

          leftGateRef.current.style.transform = `translate3d(-${txLeft}%, ${gateLeftY}px, 0) rotate(${rotLeft}deg)`;
          rightGateRef.current.style.transform = `translate3d(${txRight}%, ${gateRightY}px, 0) rotate(${rotRight}deg)`;
          leftGateRef.current.style.visibility = isFullyOpen ? 'hidden' : 'visible';
          rightGateRef.current.style.visibility = isFullyOpen ? 'hidden' : 'visible';
          leftGateRef.current.style.pointerEvents = isFullyOpen ? 'none' : 'auto';
          rightGateRef.current.style.pointerEvents = isFullyOpen ? 'none' : 'auto';
        }

        // Lock unsealing progress during first 20% of scroll (0.0 to 0.20)
        const lockEase = Math.max(0, Math.min(1, currentP / 0.20));
        const lockPct = Math.round(lockEase * 100);

        // Cyberpunk / ROG Center Glitch Core HUD (Stationary, zero wobble)
        if (centerHudRef.current) {
          const hudOpacity = Math.max(0, 1 - easeOpen * 2.8);
          centerHudRef.current.style.opacity = hudOpacity.toFixed(3);
          centerHudRef.current.style.transform = 'translate(-50%, -50%)';
          centerHudRef.current.style.pointerEvents = hudOpacity <= 0.05 ? 'none' : 'auto';
        }

        if (ladderFillRef.current) {
          ladderFillRef.current.style.width = `${lockPct}%`;
          if (loadingTextRef.current) {
            if (lockPct >= 100) {
              loadingTextRef.current.textContent = isFullyOpen ? 'SYSTEM ONLINE 100%' : 'ACCESS GRANTED 100%';
            } else {
              loadingTextRef.current.textContent = `INITIALIZING ${lockPct}%`;
            }
          }
        }

        // Parallax Layer: 3D Perspective Cyber-Grid Floor
        if (bgGridRef.current) {
          const gridY = (easeOpen * 40).toFixed(2);
          const gridOpacity = (0.20 + easeOpen * 0.60).toFixed(3);
          bgGridRef.current.style.transform = `perspective(600px) rotateX(60deg) scale(2) translate3d(0, ${gridY}px, 0)`;
          bgGridRef.current.style.opacity = gridOpacity;
        }

        // Parallax Layer 3: Payload (EditorialStatement Content)
        if (payloadRef.current) {
          const scale = (0.90 + easeOpen * 0.10).toFixed(4);
          const opacity = Math.min(1, 0.20 + easeOpen * 0.80).toFixed(3);
          payloadRef.current.style.transform = `scale3d(${scale}, ${scale}, 1)`;
          payloadRef.current.style.opacity = opacity;
          payloadRef.current.style.pointerEvents = isFullyOpen ? 'auto' : 'none';
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const activeChassis = chassisUnits[activeChassisIdx] || chassisUnits[0] || TACTICAL_ANIME_CHASSIS[0];
  const activeDemoFile = SAFETENSORS_DEMO_FILES[selectedFileIdx] || SAFETENSORS_DEMO_FILES[0];
  const activeGpu = GPU_OPTIONS.find((g) => g.id === selectedGpuId) || GPU_OPTIONS[1];

  // Dynamic VRAM calculations based on selected GPU & active model
  const baseVram = activeChassis.vramGb || 6.5;
  const contextBuffer = 1.2;
  const loraBuffer = 0.4;
  const totalVramNeeded = baseVram + contextBuffer + loraBuffer;
  const vramPercent = Math.min(100, Math.round((totalVramNeeded / activeGpu.vramTotal) * 100));
  const vramHeadroom = Math.max(0, activeGpu.vramTotal - totalVramNeeded);
  const activeSegments = Math.round((vramPercent / 100) * 12);

  return (
    <section className="mg-shutter-track" id="editorial-statement" ref={trackRef}>
      <div className="mg-shutter-sticky">
        {/* Screen / Camera Trauma Shake Stage (Game-feel Mechanical Physics) */}
        <div ref={screenShakeRef} className="mg-shutter-shake-stage">
          {/* Mechanical Seam Slam Electromagnetic Flash */}
          <div ref={slamFlashRef} className="mg-gate-slam-flash" aria-hidden="true" />

          {/* ===================================================================
            PARALLAX LAYER: 3D PERSPECTIVE CYBER-GRID FLOOR (bgGridRef)
            =================================================================== */}
        <div ref={bgGridRef} className="mg-shutter-bg-grid" aria-hidden="true" />

        {/* ===================================================================
            HIGH-OCTANE CYBERPUNK BACKGROUND LAYERS & WATERMARK
            =================================================================== */}
        {/* CRT Scanline Overlay */}
        <div className="mg-hud-scanlines" aria-hidden="true" />

        {/* Cyber Horizon Glow & High-Tech Cyber Atmosphere (Circular Radar Sweep Removed) */}
        <div className="mg-hud-ambient-glow" aria-hidden="true" />
        <div className="mg-hud-horizon-beam" aria-hidden="true" />

        {/* Giant Outline Typography Watermark: MODELS GUIDE */}
        <div className="mg-hud-watermark" aria-hidden="true">
          <span>MODELS GUIDE</span>
        </div>

        {/* Architectural Corner Reticles */}
        <div className="mg-corner-reticle top-left" aria-hidden="true"><span>+</span></div>
        <div className="mg-corner-reticle top-right" aria-hidden="true"><span>+</span></div>
        <div className="mg-corner-reticle bottom-left" aria-hidden="true"><span>+</span></div>
        <div className="mg-corner-reticle bottom-right" aria-hidden="true"><span>+</span></div>

        {/* ===================================================================
            PARALLAX LAYER 3: INNER PAYLOAD (payloadRef)
            Revealed Local Sovereignty & Architecture Telemetry Vault
            =================================================================== */}
        <div ref={payloadRef} className="mg-shutter-inner-payload">
          <div className="mg-statement-core mg-hud-tactical-dashboard mg-gpu">
            {/* -------------------------------------------------------------
                TOP HEADER BAR:
                Left: Highlighted cyan badge "SEC 01", monospace title, green status pill
                Right: 3 tactical action buttons with chamfered corners
                ------------------------------------------------------------- */}
            <header className="mg-hud-top-bar">
              <div className="mg-hud-top-left">
                <span className="mg-hud-sec-badge mg-chamfer-xs">SEC 01</span>
                <span className="mg-hud-top-sep" aria-hidden="true">·</span>
                <h2 className="mg-hud-top-title">
                  <CyberCorruptWalkingText
                    text="LOCAL SOVEREIGNTY & ARCHITECTURE SUITE"
                    accent="yellow"
                    delayMs={500}
                    cycleMs={4600}
                  />
                </h2>
                <div className="mg-hud-status-pill mg-chamfer-xs" title="Zero-API browser deserialization; zero telemetry packets sent.">
                  <span className="mg-hud-pulse-dot green" aria-hidden="true" />
                  <span>ZERO-API · AIR-GAPPED · 0.00 MS</span>
                </div>
              </div>

              <div className="mg-hud-top-right">
                <div className="mg-hud-action-btns">
                  <button
                    type="button"
                    className="mg-hud-action-btn cyan mg-chamfer-xs"
                    onClick={() => navigate('/models')}
                    title="Buka direktori model AI"
                  >
                    <span className="btn-icon">❖</span>
                    <span>[ ❖ MODELS CATALOG ]</span>
                  </button>
                  <button
                    type="button"
                    className="mg-hud-action-btn green mg-chamfer-xs"
                    onClick={() => navigate('/inspector')}
                    title="Buka SafeTensors Header Inspector"
                  >
                    <span className="btn-icon">◈</span>
                    <span>[ ◈ INSPECTOR ]</span>
                  </button>
                  <button
                    type="button"
                    className="mg-hud-action-btn amber mg-chamfer-xs"
                    onClick={() => navigate('/vram-profiler')}
                    title="Buka GPU Profiler &amp; Kalkulator VRAM"
                  >
                    <span className="btn-icon">⚙</span>
                    <span>[ ⚙ PROFILER ]</span>
                  </button>
                </div>
              </div>
            </header>

            {/* -------------------------------------------------------------
                ROW 1: INTEGRATED AVIONICS TELEMETRY RIBBON
                Slim, high-density diagnostic interconnect (No generic KPI cards)
                ------------------------------------------------------------- */}
            <div className="mg-hud-telemetry-ribbon mg-chamfer-xs">
              <div className="mg-ribbon-nodes">
                <div className="mg-ribbon-node">
                  <span className="node-tag cyan">DMA-01</span>
                  <span className="node-val cyan">0.00 MS</span>
                  <span className="node-sub">ZERO LATENCY MEMORY DESERIALIZATION</span>
                </div>
                <div className="mg-ribbon-sep" aria-hidden="true" />
                <div className="mg-ribbon-node">
                  <span className="node-tag green">AUDIT-02</span>
                  <span className="node-val green">100% IMMUTABLE</span>
                  <span className="node-sub">PICKLE-FREE AIR-GAPPED CODE SAFETY</span>
                </div>
                <div className="mg-ribbon-sep" aria-hidden="true" />
                <div className="mg-ribbon-node">
                  <span className="node-tag amber">ARSENAL-03</span>
                  <span className="node-val amber">14 UNITS</span>
                  <span className="node-sub">VERIFIED MODEL ARCHITECTURES</span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                ROW 2: ASYMMETRIC DUAL-WING COCKPIT CONSOLE
                Wing 1: Master Optic Chassis & Inference Stage (~58% width)
                Wing 2: Tactical Diagnostic & Hardware Deck (~42% width)
                ------------------------------------------------------------- */}
            <div className="mg-hud-cockpit-grid">
              {/* =========================================================
                  WING 1 (LEFT): MASTER OPTIC CHASSIS & INFERENCE STAGE
                  ========================================================= */}
              <div className="mg-cockpit-stage-card mg-chamfer-sm">
                <div className="mg-card-reticles" aria-hidden="true">
                  <span className="reticle tl">┌</span>
                  <span className="reticle tr">┐</span>
                  <span className="reticle bl">└</span>
                  <span className="reticle br">┘</span>
                </div>

                {/* Stage Header: Architecture Switcher Tabs */}
                <div className="mg-stage-head">
                  <div className="mg-stage-head-left">
                    <span className="mg-hud-pulse-dot cyan" aria-hidden="true" />
                    <span className="mg-stage-unit-tag">CHASSIS STAGE // {activeChassis.tabLabel}</span>
                  </div>
                  <div className="mg-stage-head-right">
                    <div className="mg-hud-tabs" role="tablist" aria-label="Switch Active Chassis">
                      {chassisUnits.slice(0, 3).map((chassis, idx) => (
                        <button
                          key={chassis.id}
                          type="button"
                          role="tab"
                          aria-selected={activeChassisIdx === idx}
                          className={`mg-hud-tab-btn mg-chamfer-xs ${activeChassisIdx === idx ? 'is-active' : ''}`}
                          onClick={() => handleChassisTabSwitch(idx)}
                          title={`Beralih ke ${chassis.name}`}
                        >
                          [{chassis.tabLabel}]
                        </button>
                      ))}
                    </div>
                    <span className="mg-vram-badge cyan mg-chamfer-xs">
                      {activeChassis.vramBadge}
                    </span>
                  </div>
                </div>

                {/* Model Title Row */}
                <div className="mg-card-title-row">
                  <h3 className="mg-card-title cyan">
                    {isGlitching ? (
                      <span>{glitchDisplayName}</span>
                    ) : (
                      <CyberCorruptWalkingText
                        text={activeChassis.name}
                        accent="cyan"
                        cycleMs={5200}
                        delayMs={1200}
                      />
                    )}
                  </h3>
                  {isGlitching && <CyberSeparateGlitch label="⚡ GLITCH 0x8F" />}
                </div>

                {/* Large Character Viewport Stage */}
                <div
                  className="mg-stage-media-viewport mg-chamfer-sm"
                  onClick={() => navigate(`/models?model=${activeChassis.slug}`)}
                  role="button"
                  tabIndex={0}
                  title="Klik untuk membuka detail model"
                >
                  <div className="mg-banner-hud-crosshairs" aria-hidden="true">
                    <span className="reticle-ch tl">┌</span>
                    <span className="reticle-ch tr">┐</span>
                    <span className="reticle-ch bl">└</span>
                    <span className="reticle-ch br">┘</span>
                    <div className="mg-banner-hud-lock mg-chamfer-xs">
                      <span className="mg-hud-pulse-dot cyan" aria-hidden="true" />
                      <span className="mg-banner-lock-tag">{activeChassis.activeTargetPct}</span>
                    </div>
                  </div>

                  <div className="mg-stage-flower-accent mg-chamfer-xs" aria-hidden="true">
                    <span className="flower-icon">✿</span>
                    <span>{activeChassis.flowerAccentText}</span>
                  </div>

                  <div className="mg-banner-scanlines" aria-hidden="true" />
                  <div className="mg-banner-laser-sweep" aria-hidden="true" />

                  <img
                    src={activeChassis.thumbnailUrl}
                    alt={activeChassis.name}
                    className="mg-stage-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/preview-1.jpg';
                    }}
                  />

                  <div className="mg-stage-bottom-overlay">
                    <span className="mg-banner-vram-tag mg-chamfer-xs">
                      {activeChassis.allocText}
                    </span>
                    <span className="mg-banner-tensor-tag mg-chamfer-xs">
                      {activeChassis.prediction} · FP16
                    </span>
                  </div>
                </div>

                {/* Click-to-Copy Danbooru Prompt Tokens Rack */}
                <div className="mg-stage-prompt-dock">
                  <div className="mg-prompt-dock-head">
                    <span className="mg-prompt-dock-label">CLICK-TO-COPY QUALITY TOKENS:</span>
                    {copiedTag && (
                      <span className="mg-prompt-copied-alert mg-chamfer-xs">
                        ✓ COPIED: &quot;{copiedTag}&quot;
                      </span>
                    )}
                  </div>
                  <div className="mg-prompt-chips-row">
                    {activeChassis.tags?.map((tag) => {
                      const isCopied = copiedTag === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`mg-prompt-chip mg-chamfer-xs ${isCopied ? 'is-copied' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTag(tag);
                          }}
                          title={`Klik untuk menyalin token ${tag} ke clipboard`}
                        >
                          <span className="chip-hash">{isCopied ? '✓' : '#'}</span>
                          <span>{tag.replace(/^#/, '')}</span>
                          <span className="chip-copy-icon">⎘</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Technical Specs Grid */}
                <div className="mg-card-specs-grid mg-chamfer-xs">
                  <div className="mg-spec-mini-col">
                    <span className="mg-spec-mini-k">PREDICTION</span>
                    <span className="mg-spec-mini-v cyan">{activeChassis.prediction}</span>
                  </div>
                  <div className="mg-spec-mini-col">
                    <span className="mg-spec-mini-k">NATIVE RES</span>
                    <span className="mg-spec-mini-v">{activeChassis.nativeRes}</span>
                  </div>
                  <div className="mg-spec-mini-col">
                    <span className="mg-spec-mini-k">SAMPLER</span>
                    <span className="mg-spec-mini-v amber">{activeChassis.samplerStack}</span>
                  </div>
                  <div className="mg-spec-mini-col">
                    <span className="mg-spec-mini-k">CFG SCALE</span>
                    <span className="mg-spec-mini-v">{activeChassis.cfgScale || '5.5 - 7.0'}</span>
                  </div>
                </div>

                {/* Stage CTA Button */}
                <button
                  type="button"
                  className="mg-card-action-btn cyan mg-chamfer-xs"
                  onClick={() => navigate(`/prompt-lab`)}
                  title="Buka Prompt Lab untuk model ini"
                >
                  <span className="btn-icon">⌖</span>
                  <span>[ ⌖ TEST IN PROMPT LAB &amp; WORKFLOWS ]</span>
                </button>
              </div>

              {/* =========================================================
                  WING 2 (RIGHT): TACTICAL DIAGNOSTIC & HARDWARE DECK
                  ========================================================= */}
              <div className="mg-cockpit-deck-col">
                {/* -------------------------------------------------------
                    SUB-MODULE A: SAFETENSORS AIR-GAPPED HEADER INSPECTOR
                    ------------------------------------------------------- */}
                <div className="mg-deck-card mg-chamfer-sm">
                  <div className="mg-card-reticles" aria-hidden="true">
                    <span className="reticle tl">┌</span>
                    <span className="reticle tr">┐</span>
                    <span className="reticle bl">└</span>
                    <span className="reticle br">┘</span>
                  </div>

                  <div className="mg-deck-card-head">
                    <div className="mg-deck-head-left">
                      <span className="mg-hud-pulse-dot green" aria-hidden="true" />
                      <span className="mg-card-unit-title" style={{ color: '#00ff9d' }}>
                        ● SAFETENSORS HEADER PARSER
                      </span>
                    </div>
                    <div className="mg-deck-file-tabs">
                      {SAFETENSORS_DEMO_FILES.map((file, idx) => (
                        <button
                          key={file.id}
                          type="button"
                          className={`mg-file-tab-btn mg-chamfer-xs ${selectedFileIdx === idx ? 'is-active' : ''}`}
                          onClick={() => setSelectedFileIdx(idx)}
                          title={`Inspeksi header file ${file.fileName}`}
                        >
                          {file.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Window with dynamic file metadata */}
                  <div
                    className="mg-terminal-window compact mg-chamfer-xs"
                    onClick={() => navigate('/inspector')}
                    role="button"
                    tabIndex={0}
                    title="Klik untuk membuka SafeTensors Inspector lengkap"
                  >
                    <div className="mg-term-scanline" aria-hidden="true" />
                    <div className="mg-term-head">
                      <span className="term-dot r" />
                      <span className="term-dot y" />
                      <span className="term-dot g" />
                      <span className="term-title">
                        HEADER_DECODE // {activeDemoFile.fileName}
                      </span>
                    </div>
                    <pre className="mg-term-code-body">
                      <code>
                        <span className="c-cyan">{'> '}FILE: {activeDemoFile.fileName}</span>{'\n'}
                        <span className="c-dim">{'> '}FORMAT: {activeDemoFile.format} · TENSORS: {activeDemoFile.tensors} · HEADER: {activeDemoFile.headerSize}</span>{'\n'}
                        <span className="c-green">{'> '}AUDIT: {activeDemoFile.audit}</span>{'\n'}
                        <span className="c-mint">{'> '}ZERO-COPY DESERIALIZE: 0.00 MS MEMORY-MAP</span>{'\n'}
                        <span className="c-amber">{'> '}SHA256: {activeDemoFile.hash} [DETERMINISTIC]</span>
                        <span className="mg-term-cursor" aria-hidden="true" />
                      </code>
                    </pre>
                  </div>

                  <button
                    type="button"
                    className="mg-card-action-btn green mg-chamfer-xs"
                    onClick={() => navigate('/inspector')}
                    title="Buka SafeTensors Header Inspector"
                  >
                    <span className="btn-icon">⌘</span>
                    <span>[ ⌘ LAUNCH IN-BROWSER INSPECTOR ]</span>
                  </button>
                </div>

                {/* -------------------------------------------------------
                    SUB-MODULE B: HARDWARE SOVEREIGNTY & REAL-TIME VRAM PROFILER
                    ------------------------------------------------------- */}
                <div className="mg-deck-card mg-chamfer-sm">
                  <div className="mg-card-reticles" aria-hidden="true">
                    <span className="reticle tl">┌</span>
                    <span className="reticle tr">┐</span>
                    <span className="reticle bl">└</span>
                    <span className="reticle br">┘</span>
                  </div>

                  <div className="mg-deck-card-head">
                    <div className="mg-deck-head-left">
                      <span className="mg-hud-pulse-dot amber" aria-hidden="true" />
                      <span className="mg-card-unit-title" style={{ color: '#fcee0a' }}>
                        ● HARDWARE LAB // VRAM ALLOCATION
                      </span>
                    </div>
                    <div className="mg-deck-file-tabs">
                      {GPU_OPTIONS.map((gpu) => (
                        <button
                          key={gpu.id}
                          type="button"
                          className={`mg-gpu-tab-btn mg-chamfer-xs ${selectedGpuId === gpu.id ? 'is-active ' + gpu.accentColor : ''}`}
                          onClick={() => setSelectedGpuId(gpu.id)}
                          title={`Simulasi alokasi VRAM pada ${gpu.name}`}
                        >
                          {gpu.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Hardware Simulation Telemetry */}
                  <div
                    className="mg-gpu-telemetry-box mg-chamfer-xs"
                    onClick={() => navigate('/vram-profiler')}
                    role="button"
                    tabIndex={0}
                    title="Klik untuk membuka kalkulator VRAM lengkap"
                  >
                    <div className="mg-vram-dynamic-row">
                      <div className="mg-vram-metric">
                        <span className="vram-metric-k">SIMULATED GPU</span>
                        <span className="vram-metric-v">{activeGpu.name} ({activeGpu.vramLabel})</span>
                      </div>
                      <div className="mg-vram-metric text-right">
                        <span className="vram-metric-k">ALLOCATED / TOTAL</span>
                        <span className={`vram-metric-v ${activeGpu.accentColor}`}>
                          {totalVramNeeded.toFixed(2)} GB / {activeGpu.vramTotal} GB ({vramPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Segmented High-Tech LED Gauge */}
                    <div className={`mg-hud-segmented-meter large ${activeGpu.accentColor}`}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          className={`seg ${i < activeSegments ? 'active' : ''}`}
                        />
                      ))}
                    </div>

                    {/* Hardware Footprint Breakdown & Headroom */}
                    <div className="mg-vram-breakdown-row">
                      <span className="vram-chip">BASE: {(activeChassis.vramGb || 6.5).toFixed(1)} GB</span>
                      <span className="vram-chip">CTX: +1.2 GB</span>
                      <span className="vram-chip">LORA: +0.4 GB</span>
                      <span className="vram-headroom-tag">
                        HEADROOM: +{vramHeadroom.toFixed(1)} GB
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mg-card-action-btn amber mg-chamfer-xs"
                    onClick={() => navigate('/vram-profiler')}
                    title="Buka GPU Profiler &amp; Kalkulator VRAM"
                  >
                    <span className="btn-icon">⚙</span>
                    <span>[ ⚙ PROFILE HARDWARE VRAM ]</span>
                  </button>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                ROW 3: BOTTOM FULL-WIDTH SPECIFICATION BAR
                Balanced 4-column interconnected matrix
                ------------------------------------------------------------- */}
            <div className="mg-hud-specs-bar mg-chamfer-sm">
              <div className="mg-specs-bar-head">
                <div className="mg-specs-head-left">
                  <span className="icon">◈</span>
                  <span className="title">
                    <CyberCorruptWalkingText
                      text="STANDARDS SPECIFICATION · DETERMINISTIC AI PROTOCOL"
                      accent="cyan"
                      cycleMs={6800}
                      delayMs={3000}
                    />
                  </span>
                </div>
                <span className="mg-specs-head-right">OFFICIAL SPECIFICATION · CLIENT AIR-GAPPED</span>
              </div>
              <div className="mg-specs-cols-quad">
                <div className="mg-specs-col">
                  <span className="k">SAFETENSORS PROTOCOL</span>
                  <span className="v">Zero-Copy &amp; Read-Only Deserialization</span>
                </div>
                <div className="mg-specs-col">
                  <span className="k">HARDWARE COMPATIBILITY</span>
                  <span className="v">Optimized for 8GB, 12GB, 16GB &amp; 24GB GPUs</span>
                </div>
                <div className="mg-specs-col">
                  <span className="k">TOKEN TAXONOMY</span>
                  <span className="v">Danbooru Tagging &amp; V-Pred Matching</span>
                </div>
                <div className="mg-specs-col">
                  <span className="k">HASH INTEGRITY</span>
                  <span className="v">Deterministic AutoV2 &amp; SHA256 Checksums</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            LEFT CYBERPUNK CYBERDECK ASSEMBLY (.mg-mecha-gate-assembly--left)
            Slides to the far left edge (-105%) on scroll
            Carries Cyberdeck HUD, Cyan Seam & Anchored LATENT // CORE
            =================================================================== */}
        <div
          ref={leftGateRef}
          className="mg-mecha-gate-assembly--left"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock Latent Core Cyberdeck Gate"
        >
          <div className="mg-blast-gate--left mg-cp-cyberdeck-gate">
            {/* Dedicated Cyber.jpg Mecha Gate Background */}
            <div
              className="mg-gate-cyber-bg left"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 15, 0.65) 0%, rgba(7, 10, 15, 0.18) 30%, rgba(7, 10, 15, 0.18) 70%, rgba(7, 10, 15, 0.70) 100%), radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12), rgba(7, 10, 15, 0.30) 75%), url("/images/cyber.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* CRT Scanline & Dot Grid FX */}
            <div className="mg-cp-scanlines" aria-hidden="true" />
            <div className="mg-cp-grid-overlay" aria-hidden="true" />

            {/* Recessed Mechanical Armor Plates Overlay (opacity: 0.22) */}
            <svg className="mg-cp-armor-overlay left" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="mgHazardLeft" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#fcee0a" strokeWidth="2.5" opacity="0.45" />
                </pattern>
              </defs>
              {/* 45-degree angled structural panel seams */}
              <path
                d="M 280 80 L 460 80 L 490 110 L 490 320 L 440 370 L 280 370 Z"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 310 110 L 445 110 L 470 135 L 470 300 L 425 345 L 310 345 Z"
                stroke="rgba(56, 189, 248, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 280 630 L 440 630 L 490 680 L 490 890 L 460 920 L 280 920 Z"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 310 655 L 425 655 L 470 700 L 470 865 L 445 890 L 310 890 Z"
                stroke="rgba(56, 189, 248, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              {/* Diagonal connecting ribs across midsection */}
              <line x1="280" y1="225" x2="470" y2="225" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="280" y1="775" x2="470" y2="775" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="440" y1="370" x2="490" y2="420" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" />
              <line x1="440" y1="630" x2="490" y2="580" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" />

              {/* Diagonal hazard micro-stripes along angled center notch edge */}
              <path
                d="M 495 340 L 508 360 L 460 440 L 448 440 Z"
                fill="url(#mgHazardLeft)"
              />
              <path
                d="M 448 560 L 460 560 L 508 640 L 495 660 Z"
                fill="url(#mgHazardLeft)"
              />

              {/* Corner crosshair registration marks (+) */}
              <text x="320" y="145" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="145" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="325" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="325" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="685" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="685" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="865" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="865" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>

              {/* Micro hex codes along inner door ribs */}
              <text x="340" y="143" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0x7F_UNET_BLK</text>
              <text x="340" y="863" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0xA4_VAE_DEC</text>
              <text x="415" y="475" fill="#38bdf8" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CHASSIS_RIB // A-01</text>
              <text x="415" y="525" fill="#38bdf8" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">HYDRAULIC_SEAL // OK</text>
            </svg>

            {/* Giant Horizontal Hollow Watermark Typography: MODELS GUIDE (Left Gate Half) */}
            <div className="mg-cp-watermark-text left" aria-hidden="true">
              <span>MODELS GUIDE</span>
            </div>

            {/* Top Telemetry Header Bar (Left Half): Brand & Serial */}
            <div className="mg-cp-topbar left">
              <div className="mg-cp-kanji-wrap">
                <span className="mg-cp-kanji mg-cp-glitch-text" data-text="MODELS">MODELS</span>
                <span className="mg-cp-bracket-code">[ &middot; &middot; G &middot; &middot; U &middot; &middot; I &middot; &middot; D &middot; &middot; E &middot; ]</span>
              </div>
              <div className="mg-cp-serial-text">
                LOCAL RUNTIME V2.4 // HARDWARE BUS VERIFIED
              </div>
            </div>

            {/* Sub-Header Angled Notch: MODELS GUIDE // SAFETENSORS WORKSTATION v2.4 */}
            <div className="mg-cp-sub-notch">
              <span className="mg-cp-notch-label">MODELS GUIDE // SAFETENSORS WORKSTATION v2.4</span>
              <span className="mg-cp-notch-sub">[LOCAL_GPU_RUNTIME // 14_CREATOR_TOOLS]</span>
              <svg width="120" height="12" viewBox="0 0 120 12" fill="#38bdf8" opacity="0.85" aria-hidden="true">
                <rect x="0" y="0" width="2" height="12" />
                <rect x="4" y="0" width="1" height="12" />
                <rect x="7" y="0" width="3" height="12" />
                <rect x="12" y="0" width="1" height="12" />
                <rect x="15" y="0" width="2" height="12" />
                <rect x="19" y="0" width="4" height="12" />
                <rect x="25" y="0" width="1" height="12" />
                <rect x="28" y="0" width="3" height="12" />
                <rect x="33" y="0" width="2" height="12" />
                <rect x="37" y="0" width="1" height="12" />
                <rect x="40" y="0" width="4" height="12" />
                <rect x="46" y="0" width="2" height="12" />
                <rect x="50" y="0" width="1" height="12" />
                <rect x="53" y="0" width="3" height="12" />
                <rect x="58" y="0" width="2" height="12" />
                <rect x="62" y="0" width="1" height="12" />
                <rect x="65" y="0" width="4" height="12" />
                <rect x="71" y="0" width="1" height="12" />
                <rect x="74" y="0" width="3" height="12" />
                <rect x="79" y="0" width="2" height="12" />
                <rect x="83" y="0" width="1" height="12" />
                <rect x="86" y="0" width="4" height="12" />
                <rect x="92" y="0" width="2" height="12" />
                <rect x="96" y="0" width="1" height="12" />
                <rect x="100" y="0" width="3" height="12" />
                <rect x="105" y="0" width="2" height="12" />
                <rect x="110" y="0" width="1" height="12" />
                <rect x="114" y="0" width="4" height="12" />
              </svg>
              <div className="mg-cp-scan-chip">
                <span className="mg-cp-scan-badge mg-cp-glitch-text" data-text="SCANNING 79%">SCANNING 79%</span>
                <span className="mg-cp-scan-files">663 / 1440 FILES</span>
              </div>
            </div>

            {/* Vertical Ruler Ticks on Left Border */}
            <div className="mg-cp-ruler left" aria-hidden="true">
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
            </div>

            {/* Corner Reticle ┌ SCANNING */}
            <div className="mg-cp-corner-reticle top-left" aria-hidden="true">
              <span className="mg-cp-reticle-bracket">&lceil;</span>
              <span>SCANNING</span>
            </div>

            {/* Status / Notification Chip (Top Left) */}
            <div className="mg-cp-notice-card">
              <div className="mg-cp-notice-num">02</div>
              <div className="mg-cp-notice-body">
                <span className="mg-cp-notice-title">STAGE [02-A] // UNET INFERENCE</span>
                <span className="mg-cp-notice-sub">DETERMINISTIC LATENT CORE &bull; FP16</span>
              </div>
              <div className="mg-cp-notice-plus">+</div>
            </div>

            {/* Vertical Ribbon Tab: WEIGHT MATRIX PROTOCOL 01 */}
            <div className="mg-cp-vertical-tab" aria-hidden="true">
              <span className="mg-cp-tab-indicator" />
              <span>WEIGHT MATRIX PROTOCOL 01</span>
            </div>

            {/* ==============================================================
                MANDATORY: LATENT // CORE ANCHORED AT FAR LEFT EDGE
                ============================================================== */}
            <div className="mg-cp-edge-statement left">
              <div className="mg-cp-statement-badge cyan">
                <span>UNET // ATTENTION</span>
                <span className="mg-cp-badge-divider" />
                <span>STAGE [02-A]</span>
              </div>

              <h2 className="mg-cp-main-title cyan">
                <CyberCorruptWalkingText text="LATENT CORE" accent="cyan" cycleMs={5400} delayMs={1500} />
              </h2>

              <div className="mg-cp-sub-telemetry cyan">
                [UNET_ATTENTION_BLOCKS // FP16]
              </div>

              <div className="mg-cp-hazard-stripe cyan" />

              {/* Chamfered ARCHITECTURE WEIGHT MATRIX panel */}
              <div className="mg-cp-matrix-panel">
                {/* Header */}
                <div className="mg-cp-matrix-header">
                  <span className="mg-cp-matrix-title">
                    <CyberCorruptWalkingText text="BASE CHECKPOINT MATRIX SAFETENSORS" accent="cyan" cycleMs={6200} delayMs={2200} />
                  </span>
                  <span className="mg-cp-matrix-live-dot" aria-hidden="true" />
                </div>

                {/* Coordinate Readout (Amber/Cyan) */}
                <div className="mg-cp-matrix-coords">
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">RES</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 1024x1024_NATIVE &gt;&gt;&gt;</span>
                  </div>
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">CFG</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 5.5_SCALE // EULER_A &gt;&gt;&gt;</span>
                  </div>
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">VRAM</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 8.42_GB_ALLOCATED &gt;&gt;&gt;</span>
                  </div>
                </div>

                {/* Sub-Header: WEIGHT MATRICES */}
                <div className="mg-cp-matrix-sub-title">
                  TENSOR WEIGHT ALLOCATION // FP16
                </div>

                {/* Progress Bar Rows (keep segmented diagonal bar style) */}
                <div className="mg-cp-matrix-props">
                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">ILLUSTRIOUS_XL</span>
                      <span className="mg-cp-row-tag">[98%] // DANBOORU_CORE</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '98%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">NOOBAI_V_PRED</span>
                      <span className="mg-cp-row-tag">[95%] // ZERO_SNR_FP16</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '95%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">FLUX.1_DEV_FP8</span>
                      <span className="mg-cp-row-tag">[92%] // 12B_FLOW_MATCH</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">SDXL_1.0_BASE</span>
                      <span className="mg-cp-row-tag">[88%] // DUAL_CLIP_ENC</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">LORA_STACK_WT</span>
                      <span className="mg-cp-row-tag">[96%] // MULTIPLIER_1.0</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '96%' }} />
                    </div>
                  </div>
                </div>

                {/* Bottom Footer */}
                <div className="mg-cp-matrix-footer">
                  <span className="mg-cp-matrix-hash">[0x00F8_TENSOR_HASH // ZERO_CLOUD_LOCK]</span>
                </div>

                {/* Telemetry Running Text Marquee */}
                <div className="mg-cp-holomap-ticker">
                  <div className="mg-cp-holomap-ticker-track">
                    <span>SAFETENSORS RUNTIME &bull; <em>RES: 1024x1024</em> &bull; <em>CFG: 5.5 // EULER_A</em> &bull; <em>VRAM: 8.42_GB</em> &bull; ILLUSTRIOUS_XL <em>[98%]</em> &bull; NOOBAI_V_PRED <em>[95%]</em> &bull; FLUX.1_DEV <em>[92%]</em> &bull; SDXL_BASE <em>[88%]</em> &bull; LORA_STACK <em>[96%]</em> &bull;</span>
                    <span aria-hidden="true">SAFETENSORS RUNTIME &bull; <em>RES: 1024x1024</em> &bull; <em>CFG: 5.5 // EULER_A</em> &bull; <em>VRAM: 8.42_GB</em> &bull; ILLUSTRIOUS_XL <em>[98%]</em> &bull; NOOBAI_V_PRED <em>[95%]</em> &bull; FLUX.1_DEV <em>[92%]</em> &bull; SDXL_BASE <em>[88%]</em> &bull; LORA_STACK <em>[96%]</em> &bull;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left Authorization & Barcode */}
            <div className="mg-cp-bottom-sec">
              {/* Secondary Running Feed Ribbon */}
              <div className="mg-cp-gate-ticker-ribbon" aria-hidden="true">
                <span className="mg-cp-ribbon-badge">AI RUNTIME</span>
                <div className="mg-cp-ribbon-track-wrap">
                  <div className="mg-cp-ribbon-track">
                    <span className="mg-cp-ribbon-item">SAFETENSORS WEIGHT MATRIX // <em>RES: 1024x1024</em> // <em>CFG: 5.5 EULER_A</em> // <em>VRAM: 8.42 GB</em> // ILLUSTRIOUS 98% // NOOBAI 95% // FLUX.1 92% // ZERO_CLOUD_LOCK</span>
                    <span className="mg-cp-ribbon-item" aria-hidden="true">SAFETENSORS WEIGHT MATRIX // <em>RES: 1024x1024</em> // <em>CFG: 5.5 EULER_A</em> // <em>VRAM: 8.42 GB</em> // ILLUSTRIOUS 98% // NOOBAI 95% // FLUX.1 92% // ZERO_CLOUD_LOCK</span>
                  </div>
                </div>
              </div>
              <div className="mg-cp-auth-notice">
                LOCAL HARDWARE SOVEREIGNTY ENFORCED &bull; DETERMINISTIC SAFETENSORS EXECUTION &bull; ZERO CLOUD TELEMETRY
              </div>
              <div className="mg-cp-bottom-barcode-row">
                <svg width="220" height="14" viewBox="0 0 220 14" fill="#38bdf8" opacity="0.8" aria-hidden="true">
                  <rect x="0" y="0" width="2" height="14" />
                  <rect x="4" y="0" width="1" height="14" />
                  <rect x="7" y="0" width="3" height="14" />
                  <rect x="12" y="0" width="2" height="14" />
                  <rect x="16" y="0" width="4" height="14" />
                  <rect x="22" y="0" width="1" height="14" />
                  <rect x="25" y="0" width="3" height="14" />
                  <rect x="30" y="0" width="2" height="14" />
                  <rect x="34" y="0" width="1" height="14" />
                  <rect x="38" y="0" width="4" height="14" />
                  <rect x="44" y="0" width="2" height="14" />
                  <rect x="48" y="0" width="1" height="14" />
                  <rect x="52" y="0" width="3" height="14" />
                  <rect x="57" y="0" width="2" height="14" />
                  <rect x="61" y="0" width="1" height="14" />
                  <rect x="65" y="0" width="4" height="14" />
                  <rect x="71" y="0" width="2" height="14" />
                  <rect x="75" y="0" width="1" height="14" />
                  <rect x="78" y="0" width="3" height="14" />
                  <rect x="83" y="0" width="2" height="14" />
                  <rect x="87" y="0" width="1" height="14" />
                  <rect x="91" y="0" width="4" height="14" />
                  <rect x="97" y="0" width="2" height="14" />
                  <rect x="101" y="0" width="1" height="14" />
                  <rect x="105" y="0" width="3" height="14" />
                  <rect x="110" y="0" width="2" height="14" />
                  <rect x="114" y="0" width="1" height="14" />
                  <rect x="118" y="0" width="4" height="14" />
                  <rect x="124" y="0" width="2" height="14" />
                  <rect x="128" y="0" width="1" height="14" />
                  <rect x="132" y="0" width="3" height="14" />
                  <rect x="137" y="0" width="2" height="14" />
                  <rect x="142" y="0" width="4" height="14" />
                  <rect x="148" y="0" width="1" height="14" />
                  <rect x="152" y="0" width="3" height="14" />
                  <rect x="157" y="0" width="2" height="14" />
                  <rect x="162" y="0" width="4" height="14" />
                  <rect x="168" y="0" width="1" height="14" />
                  <rect x="172" y="0" width="3" height="14" />
                  <rect x="177" y="0" width="2" height="14" />
                  <rect x="182" y="0" width="4" height="14" />
                  <rect x="188" y="0" width="2" height="14" />
                  <rect x="193" y="0" width="3" height="14" />
                  <rect x="198" y="0" width="1" height="14" />
                  <rect x="202" y="0" width="4" height="14" />
                  <rect x="208" y="0" width="2" height="14" />
                  <rect x="213" y="0" width="3" height="14" />
                  <rect x="218" y="0" width="2" height="14" />
                </svg>
                <span className="mg-cp-terminal-prompt">GPU0@RTX_4090 : ~ # SAFETENSORS_LOAD</span>
              </div>
              <div className="mg-cp-app-pill">
                <span>&#9776;</span>
                <span>APPLICATIONS</span>
              </div>
            </div>

            {/* Glowing Cyan Interlocking Mechanical Seam Polyline */}
            <svg className="mg-gate-seam-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="mgSeamGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#mgSeamGlowCyan)"
                opacity="0.85"
              />
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Hydraulic Clamp Bar (Left): 140px piston arm bridging to center vault core */}
          <div className="mg-cp-hydraulic-clamp left" aria-hidden="true">
            <div className="mg-clamp-housing">
              <div className="mg-clamp-piston-body">
                <span className="mg-clamp-serial">ACT-L1 // 3.2kPSI</span>
              </div>
              <div className="mg-clamp-cylinder">
                <div className="mg-clamp-rod" />
                <div className="mg-clamp-fluid-line" />
              </div>
              <div className="mg-clamp-jaw">
                <div className="mg-clamp-teeth" />
                <div className="mg-clamp-status-led cyan" />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT CYBERPUNK CYBERDECK ASSEMBLY (.mg-mecha-gate-assembly--right)
            Slides to the far right edge (+105%) on scroll
            Carries Quickhack Menu, Emerald Seam & Anchored NEURAL // ENGINE
            =================================================================== */}
        <div
          ref={rightGateRef}
          className="mg-mecha-gate-assembly--right"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock Neural Engine Cyberdeck Gate"
        >
          <div className="mg-blast-gate--right mg-cp-cyberdeck-gate right">
            {/* Dedicated Cyber.jpg Mecha Gate Background */}
            <div
              className="mg-gate-cyber-bg right"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 15, 0.65) 0%, rgba(7, 10, 15, 0.18) 30%, rgba(7, 10, 15, 0.18) 70%, rgba(7, 10, 15, 0.70) 100%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12), rgba(7, 10, 15, 0.30) 75%), url("/images/cyber.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* CRT Scanline & Dot Grid FX */}
            <div className="mg-cp-scanlines" aria-hidden="true" />
            <div className="mg-cp-grid-overlay" aria-hidden="true" />

            {/* Recessed Mechanical Armor Plates Overlay (Right Gate, Emerald Accent, opacity: 0.22) */}
            <svg className="mg-cp-armor-overlay right" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="mgHazardRight" width="10" height="10" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#fcee0a" strokeWidth="2.5" opacity="0.45" />
                </pattern>
              </defs>
              {/* 45-degree angled structural panel seams */}
              <path
                d="M 720 80 L 540 80 L 510 110 L 510 320 L 560 370 L 720 370 Z"
                stroke="rgba(16, 185, 129, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 690 110 L 555 110 L 530 135 L 530 300 L 575 345 L 690 345 Z"
                stroke="rgba(16, 185, 129, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 720 630 L 560 630 L 510 680 L 510 890 L 540 920 L 720 920 Z"
                stroke="rgba(16, 185, 129, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 690 655 L 575 655 L 530 700 L 530 865 L 555 890 L 690 890 Z"
                stroke="rgba(16, 185, 129, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              {/* Connecting ribs */}
              <line x1="530" y1="225" x2="720" y2="225" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="530" y1="775" x2="720" y2="775" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="560" y1="370" x2="510" y2="420" stroke="rgba(16, 185, 129, 0.22)" strokeWidth="1" />
              <line x1="560" y1="630" x2="510" y2="580" stroke="rgba(16, 185, 129, 0.22)" strokeWidth="1" />

              {/* Diagonal hazard micro-stripes along angled center notch edge */}
              <path
                d="M 505 340 L 492 360 L 540 440 L 552 440 Z"
                fill="url(#mgHazardRight)"
              />
              <path
                d="M 552 560 L 540 560 L 492 640 L 505 660 Z"
                fill="url(#mgHazardRight)"
              />

              {/* Corner crosshair registration marks (+) */}
              <text x="560" y="145" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="145" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="325" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="325" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="685" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="685" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="865" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="865" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>

              {/* Micro hex codes along inner door ribs */}
              <text x="560" y="143" fill="#10b981" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0xB8_CLIP_ENC</text>
              <text x="560" y="863" fill="#10b981" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0x2C_ATTN_QKV</text>
              <text x="525" y="475" fill="#10b981" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CHASSIS_RIB // B-02</text>
              <text x="525" y="525" fill="#10b981" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CLAMP_PRESSURE // 3200PSI</text>
            </svg>

            {/* Giant Horizontal Hollow Watermark Typography: MODELS GUIDE (Right Gate Half) */}
            <div className="mg-cp-watermark-text right" aria-hidden="true">
              <span>MODELS GUIDE</span>
            </div>


            {/* Top Cyberdeck Header Bar (Right Half): Settings Gear, Status */}
            <div className="mg-cp-topbar right">
              <div className="mg-cp-topbar-right-meta">
                <span className="mg-cp-top-meta-badge">BUS // AIR-GAPPED &bull; CVE-SAFE</span>
                <span className="mg-cp-settings-icon" aria-hidden="true">&#9881;</span>
              </div>
            </div>

            {/* Corner Reticle with Binary Stream ┐ */}
            <div className="mg-cp-corner-reticle top-right" aria-hidden="true">
              <div className="mg-cp-reticle-binary">
                <div>01000001</div>
                <div>01001101</div>
                <div>01010010</div>
                <div>01010101</div>
                <div>01000001</div>
                <div>01001001</div>
              </div>
              <span className="mg-cp-reticle-bracket">&rceil;</span>
            </div>

            {/* Vertical Ruler Ticks on Right Border */}
            <div className="mg-cp-ruler right" aria-hidden="true">
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
            </div>

            {/* ==============================================================
                MANDATORY: NEURAL // ENGINE ANCHORED AT FAR RIGHT EDGE
                ============================================================== */}
            <div className="mg-cp-edge-statement right">
              <div className="mg-cp-statement-badge emerald">
                <span>LOCAL RUNTIME</span>
                <span className="mg-cp-badge-divider" />
                <span>STAGE [02-B]</span>
              </div>

              <h2 className="mg-cp-main-title emerald">
                <CyberCorruptWalkingText text="NEURAL ENGINE" accent="green" cycleMs={5400} delayMs={1700} />
              </h2>

              <div className="mg-cp-sub-telemetry emerald">
                [SAFETENSORS_LOCAL_RUNTIME]
              </div>

              <div className="mg-cp-hazard-stripe emerald" />

              {/* Cyberpunk Quickhack Container: Flyout Submenu + Action Stack */}
              <div className="mg-cp-quickhack-container">
                {/* Flyout Submenu */}
                <div className="mg-cp-sub-flyout">
                  <div className="mg-cp-flyout-item">ILLUSTRIOUS</div>
                  <div className="mg-cp-flyout-item">NOOBAI</div>
                  <div className="mg-cp-flyout-item">FLUX.1</div>
                  <div className="mg-cp-flyout-item">SDXL 1.0</div>
                  <div className="mg-cp-flyout-item">COMFYUI</div>
                  <div className="mg-cp-flyout-item">DANBOORU</div>
                  <div className="mg-cp-flyout-subtext">
                    LOCAL RUNTIME ENGINES<br />V 201 391 162 978
                  </div>
                </div>

                {/* 7 CORE CREATOR WORKSTATIONS Stack */}
                <div className="mg-cp-quickhack-stack">
                  <div className="mg-cp-hack-btn primary">
                    <span className="mg-cp-btn-arrow">&uarr;&darr;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">SAFETENSORS INSPECTOR</span>
                      <span className="mg-cp-btn-sub">BINARY HEADER &amp; METADATA PARSER</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#10022;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">ANIME PROMPT STUDIO</span>
                      <span className="mg-cp-btn-sub">DANBOORU TAG &amp; WEIGHT ENGINE</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8865;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">MODEL COMPARISON</span>
                      <span className="mg-cp-btn-sub">SIDE-BY-SIDE RENDER SPLIT LOUPE</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#9638;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">VRAM PROFILER LAB</span>
                      <span className="mg-cp-btn-sub">4GB TO 24GB MULTI-GPU SIMULATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8801;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">LORA STACK BUILDER</span>
                      <span className="mg-cp-btn-sub">INTERFERENCE &amp; WEIGHT CALCULATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#9741;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">COMFYUI JSON BRIDGE</span>
                      <span className="mg-cp-btn-sub">ONE-CLICK NODE GRAPH GENERATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8982;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">PROMPT DECONSTRUCTOR</span>
                      <span className="mg-cp-btn-sub">REVERSE EXIF &amp; SEED EXTRACTOR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Right Samurai Oni Skull Tactical Badge */}
            <div className="mg-cp-bottom-sec right" aria-label="Cyberpunk Samurai Emblem">
              <div className="mg-cp-samurai-deck">
                <div className="mg-cp-samurai-badge-slot">
                  <SamuraiEmblem size={72} glow={false} className="mg-cp-samurai-decal" />
                </div>
                <div className="mg-cp-samurai-telemetry">
                  <div className="mg-cp-samurai-title-row">
                    <span className="mg-cp-samurai-code">CHIP // RELIC-2.0</span>
                    <span className="mg-cp-samurai-pill">SAMURAI</span>
                  </div>
                  <div className="mg-cp-samurai-auth-notice">
                    WAKE UP SAMURAI &bull; NIGHT CITY RELIC ARCH &bull; NEVER FADE AWAY
                  </div>
                  <div className="mg-cp-samurai-barcode-row">
                    <span className="mg-cp-samurai-terminal-prompt">SAMURAI@SILVERHAND : ~ # OVERRIDE_OK</span>
                    <svg width="180" height="12" viewBox="0 0 180 12" fill="#e51b24" opacity="0.85" aria-hidden="true">
                      <rect x="0" y="0" width="2" height="12" />
                      <rect x="4" y="0" width="1" height="12" />
                      <rect x="7" y="0" width="3" height="12" />
                      <rect x="12" y="0" width="2" height="12" />
                      <rect x="16" y="0" width="4" height="12" />
                      <rect x="22" y="0" width="1" height="12" />
                      <rect x="25" y="0" width="3" height="12" />
                      <rect x="30" y="0" width="2" height="12" />
                      <rect x="34" y="0" width="1" height="12" />
                      <rect x="38" y="0" width="4" height="12" />
                      <rect x="44" y="0" width="2" height="12" />
                      <rect x="48" y="0" width="1" height="12" />
                      <rect x="52" y="0" width="3" height="12" />
                      <rect x="57" y="0" width="2" height="12" />
                      <rect x="61" y="0" width="1" height="12" />
                      <rect x="66" y="0" width="3" height="12" />
                      <rect x="72" y="0" width="2" height="12" />
                      <rect x="77" y="0" width="4" height="12" />
                      <rect x="83" y="0" width="1" height="12" />
                      <rect x="86" y="0" width="3" height="12" />
                      <rect x="91" y="0" width="2" height="12" />
                      <rect x="95" y="0" width="4" height="12" />
                      <rect x="101" y="0" width="2" height="12" />
                      <rect x="105" y="0" width="1" height="12" />
                      <rect x="108" y="0" width="3" height="12" />
                      <rect x="113" y="0" width="2" height="12" />
                      <rect x="117" y="0" width="4" height="12" />
                      <rect x="123" y="0" width="2" height="12" />
                      <rect x="127" y="0" width="1" height="12" />
                      <rect x="130" y="0" width="3" height="12" />
                      <rect x="135" y="0" width="2" height="12" />
                      <rect x="140" y="0" width="4" height="12" />
                      <rect x="146" y="0" width="1" height="12" />
                      <rect x="150" y="0" width="3" height="12" />
                      <rect x="155" y="0" width="2" height="12" />
                      <rect x="160" y="0" width="4" height="12" />
                      <rect x="166" y="0" width="2" height="12" />
                      <rect x="171" y="0" width="3" height="12" />
                      <rect x="176" y="0" width="2" height="12" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing Emerald Interlocking Mechanical Seam Polyline */}
            <svg className="mg-gate-seam-svg emerald" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="mgSeamGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#mgSeamGlowEmerald)"
                opacity="0.85"
              />
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Hydraulic Clamp Bar (Right): 140px piston arm bridging to center vault core */}
          <div className="mg-cp-hydraulic-clamp right" aria-hidden="true">
            <div className="mg-clamp-housing">
              <div className="mg-clamp-jaw">
                <div className="mg-clamp-status-led emerald" />
                <div className="mg-clamp-teeth" />
              </div>
              <div className="mg-clamp-cylinder">
                <div className="mg-clamp-rod" />
                <div className="mg-clamp-fluid-line" />
              </div>
              <div className="mg-clamp-piston-body">
                <span className="mg-clamp-serial">ACT-R2 // 3.2kPSI</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            CENTER OVERLAY: SHARP 45-DEGREE CHAMFERED OCTAGONAL ROG GLITCH CORE
            =================================================================== */}
        <div
          ref={centerHudRef}
          className="mg-cp-center-hud"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock AI Creator Workstations Vault"
        >
          {/* Cyberpunk 2077 Outer Chamfered Housing SVG Frame with 45° Corner Brackets */}
          <svg className="mg-cp-housing-frame-svg" viewBox="0 0 490 260" preserveAspectRatio="none" aria-hidden="true">
            {/* Outer chamfered contour */}
            <polygon
              points="24,1 480,1 489,10 489,236 466,259 10,259 1,250 1,24"
              fill="none"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1.5"
            />
            {/* Inner chamfered accent line */}
            <polygon
              points="28,5 476,5 485,14 485,232 462,255 14,255 5,246 5,28"
              fill="none"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            {/* Corner Bracket: Top-Left (24px chamfer, Cyan #38bdf8) */}
            <path d="M 0 32 L 0 24 L 24 0 L 32 0" fill="none" stroke="#38bdf8" strokeWidth="3" />
            {/* Corner Bracket: Top-Right (10px chamfer, Cyberpunk Yellow #fcee0a) */}
            <path d="M 458 0 L 480 0 L 490 10 L 490 18" fill="none" stroke="#fcee0a" strokeWidth="3" />
            {/* Corner Bracket: Bottom-Right (24px chamfer, Cyan #38bdf8) */}
            <path d="M 490 228 L 490 236 L 466 260 L 458 260" fill="none" stroke="#38bdf8" strokeWidth="3" />
            {/* Corner Bracket: Bottom-Left (10px chamfer, Cyberpunk Yellow #fcee0a) */}
            <path d="M 32 260 L 10 260 L 0 250 L 0 242" fill="none" stroke="#fcee0a" strokeWidth="3" />
            
            {/* Left and Right Hydraulic Clamp Sockets */}
            <rect x="0" y="112" width="12" height="36" fill="rgba(56, 189, 248, 0.18)" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="6" cy="120" r="1.5" fill="#38bdf8" />
            <circle cx="6" cy="140" r="1.5" fill="#38bdf8" />

            <rect x="478" y="112" width="12" height="36" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="484" cy="120" r="1.5" fill="#10b981" />
            <circle cx="484" cy="140" r="1.5" fill="#10b981" />
          </svg>

          {/* Top Telemetry Strip */}
          <div className="mg-cp-telemetry-strip">
            <span className="mg-cp-strip-icon">&#9889;</span>
            <span className="mg-cp-strip-text">LATENT DENOISING OVERRIDE // STEP 28/28</span>
          </div>

          {/* Main Glitch Title */}
          <div className="mg-cp-vault-heading-group">
            <div className="mg-cp-warning-title">
              <CyberCorruptWalkingText text="LOCAL MODEL ARCHITECTURE SUITE" accent="yellow" cycleMs={4800} delayMs={600} />
            </div>
            <div className="mg-cp-warning-subtitle">
              <CyberCorruptWalkingText text="14 AI CREATOR WORKSTATIONS READY" accent="cyan" cycleMs={5200} delayMs={1100} />
            </div>
          </div>

          {/* Segmented Cyan/Emerald Progress Bar (/// blocks) that fills dynamically from 0% to 100% */}
          <div className="mg-cp-ladder-progress-wrap mg-cp-rog-ladder">
            <div ref={ladderFillRef} className="mg-cp-ladder-progress-fill mg-cp-rog-ladder-fill" style={{ width: '0%' }} />
            <div className="mg-cp-ladder-stripes" />
          </div>

          {/* Progress Telemetry Readout */}
          <div className="mg-cp-progress-footer">
            <span className="mg-cp-proto-tag">LOCAL_SAFE_TENSORS</span>
            <span ref={loadingTextRef} className="mg-cp-loading-label">INITIALIZING 0%</span>
            <span className="mg-cp-proto-tag">FP16 // EULER_A</span>
          </div>

          {/* Sub-status Row */}
          <div className="mg-cp-substatus-row">
            <span className="mg-cp-substatus-tag">LOCAL_GPU_SOVEREIGNTY</span>
            <span className="mg-cp-substatus-sep">|</span>
            <span className="mg-cp-substatus-tag">0ms TELEMETRY</span>
            <span className="mg-cp-substatus-sep">|</span>
            <span className="mg-cp-substatus-tag pulse">SCROLL TO EXPLORE ARCHITECTURE</span>
          </div>
        </div>

        {/* ===================================================================
            DOWNWARD SHORTCUT NAVIGATOR (Paling Ujung Bawah Section)
            =================================================================== */}
        <CyberSectionNavigator
          targetId="model-showcase"
          direction="down"
          label="MODEL SHOWCASE"
          className="mg-dock-edge bottom"
        />
        </div>
      </div>
    </section>
  );
}

export default EditorialStatement;
