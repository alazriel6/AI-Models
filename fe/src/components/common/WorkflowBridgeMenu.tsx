import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  type WorkflowBridgeData,
  bridgeToPromptLab,
  bridgeToCalculator,
  bridgeToLoraStack,
  bridgeToNegativeVault,
  bridgeToSamplerGuide,
  bridgeToVramProfiler,
  bridgeToControlNet,
  extractLorasFromPrompt,
} from "../../utils/workflowBridge";

interface WorkflowBridgeMenuProps {
  data: WorkflowBridgeData;
  buttonLabel?: string;
  variant?: "solid-blue" | "solid-dark" | "compact";
  align?: "left" | "right" | "center";
  direction?: "up" | "down" | "auto";
  buttonStyle?: React.CSSProperties;
  className?: string;
  onActionComplete?: () => void;
}

export function WorkflowBridgeMenu({
  data,
  buttonLabel = "Kirim ke Alat ▾",
  variant = "solid-blue",
  align = "right",
  direction = "auto",
  buttonStyle,
  className,
  onActionComplete,
}: WorkflowBridgeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [effectiveDirection, setEffectiveDirection] = useState<"up" | "down">(
    direction === "up" ? "up" : "down"
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Dynamically calculate effective direction (dropup vs dropdown)
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    if (direction === "up") {
      setEffectiveDirection("up");
      return;
    }
    if (direction === "down") {
      setEffectiveDirection("down");
      return;
    }

    // Auto-detect based on remaining viewport space
    const rect = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 380 && spaceAbove > spaceBelow) {
      setEffectiveDirection("up");
    } else {
      setEffectiveDirection("down");
    }
  }, [isOpen, direction]);

  // Compute LoRA count either from explicit resources or prompt regex
  const loras = data.loras && data.loras.length > 0 ? data.loras : extractLorasFromPrompt(data.positivePrompt);
  const enrichedData: WorkflowBridgeData = {
    ...data,
    loras,
  };

  const handleSendPromptLab = () => {
    bridgeToPromptLab(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendCalculator = () => {
    bridgeToCalculator(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendVramProfiler = () => {
    bridgeToVramProfiler(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendLoraStack = () => {
    bridgeToLoraStack(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendNegativeVault = () => {
    bridgeToNegativeVault(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendInspector = () => {
    setIsOpen(false);
    onActionComplete?.();
    if (data.imageId) {
      navigate(`/inspector?image_id=${data.imageId}`);
    } else {
      navigate("/inspector");
    }
  };

  const handleSendSamplerGuide = () => {
    bridgeToSamplerGuide(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  const handleSendControlNet = () => {
    bridgeToControlNet(navigate, enrichedData);
    setIsOpen(false);
    onActionComplete?.();
  };

  // Button styles based on variant (100% Solid)
  const getButtonClass = () => {
    const base: React.CSSProperties = {
      whiteSpace: "nowrap",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      boxSizing: "border-box",
      lineHeight: 1,
      height: "28px",
      padding: "0 10px",
      borderRadius: "6px",
      fontSize: "11.5px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      cursor: "pointer",
      transition: "all 0.12s ease",
      flexShrink: 0,
      ...buttonStyle,
    };

    if (variant === "solid-blue") {
      return {
        ...base,
        background: "#2563eb",
        border: "1px solid #1d4ed8",
        color: "#ffffff",
        fontWeight: "600",
      };
    }
    if (variant === "compact") {
      return {
        ...base,
        background: "#18181b",
        border: "1px solid #27272a",
        color: "#f4f4f5",
        fontWeight: "500",
        padding: "0 8px",
        height: "24px",
        fontSize: "11px",
      };
    }
    return {
      ...base,
      background: "#18181b",
      border: "1px solid #27272a",
      color: "#f4f4f5",
      fontWeight: "500",
    };
  };

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        className={className}
        style={getButtonClass() as React.CSSProperties}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Kirim metadata gambar ini langsung ke alat lain"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
        <span style={{ whiteSpace: "nowrap" }}>
          {effectiveDirection === "up" ? buttonLabel.replace("▾", "▴") : buttonLabel}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(effectiveDirection === "up"
              ? { bottom: "calc(100% + 8px)", top: "auto" }
              : { top: "calc(100% + 6px)", bottom: "auto" }),
            ...(align === "center"
              ? { left: "50%", transform: "translateX(-50%)" }
              : align === "right"
              ? { right: 0, left: "auto" }
              : { left: 0, right: "auto" }),
            width: "300px",
            background: "#121215",
            border: "1px solid #27272a",
            borderRadius: "8px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px #27272a",
            zIndex: 99999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              background: "#18181b",
              borderBottom: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#a1a1aa",
              }}
            >
              Workflow Bridge
            </span>
            <span
              style={{
                fontSize: "10px",
                background: "#27272a",
                color: "#60a5fa",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              {data.baseModel || "SDXL"}
            </span>
          </div>

          {/* Action List */}
          <div style={{ display: "flex", flexDirection: "column", padding: "6px", gap: "2px" }}>
            {/* 1. Prompt Lab */}
            <button
              type="button"
              onClick={handleSendPromptLab}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Prompt Studio &amp; Lab</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Bawa prompt &amp; parameter ke studio</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#d4d4d8",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Studio
              </span>
            </button>

            {/* 2. Resolution Calculator */}
            <button
              type="button"
              onClick={handleSendCalculator}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#10b981";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Resolution Calculator</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Aspect ratio &amp; bucket VAE latent</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#34d399",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                {data.width && data.height ? `${data.width}×${data.height}` : "1024×1024"}
              </span>
            </button>

            {/* 3. VRAM Profiler */}
            <button
              type="button"
              onClick={handleSendVramProfiler}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>VRAM Profiler</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Kalkulasi alokasi VRAM &amp; kecepatan</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #1e3a8a",
                  color: "#93c5fd",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Hardware
              </span>
            </button>

            {/* 4. Sampler & Scheduler Guide */}
            <button
              type="button"
              onClick={handleSendSamplerGuide}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#10b981";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Sampler &amp; Scheduler</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Konvergensi ODE &amp; kurva sigma</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #065f46",
                  color: "#34d399",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                {data.sampler || "Guide"}
              </span>
            </button>

            {/* 5. LoRA Stack */}
            <button
              type="button"
              onClick={handleSendLoraStack}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#f59e0b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>LoRA Stack</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Bawa {loras.length} LoRA ke mixer</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#fbbf24",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                {loras.length} LoRA
              </span>
            </button>

            {/* 6. Negative Vault */}
            {data.negativePrompt && (
              <button
                type="button"
                onClick={handleSendNegativeVault}
                style={{
                  background: "#121215",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  color: "#f4f4f5",
                  transition: "all 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#18181b";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#121215";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>Negative Vault</div>
                    <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Analisis token negatif &amp; slop</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    background: "#18181b",
                    border: "1px solid #7f1d1d",
                    color: "#f87171",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Negative
                </span>
              </button>
            )}

            {/* 7. ControlNet Studio */}
            <button
              type="button"
              onClick={handleSendControlNet}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#06b6d4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="5" r="3" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <path d="M7 11h10" />
                  <path d="M9 16l-3 5" />
                  <path d="M15 16l3 5" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>ControlNet Studio</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>OpenPose rig &amp; preprocessor</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #164e63",
                  color: "#67e8f9",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Control
              </span>
            </button>

            {/* 8. Metadata Inspector */}
            <button
              type="button"
              onClick={handleSendInspector}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "7px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                color: "#f4f4f5",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.borderColor = "#38bdf8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#121215";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Metadata Inspector</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Node graph &amp; raw chunks</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#38bdf8",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Inspect
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
