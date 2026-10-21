import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  type WorkflowBridgeData,
  bridgeToPromptLab,
  bridgeToCalculator,
  bridgeToLoraStack,
  bridgeToNegativeVault,
  bridgeToSamplerGuide,
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

    if (spaceBelow < 330 && spaceAbove > spaceBelow) {
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
        title="Kirim metadata gambar ini langsung ke alat lain (Prompt Lab, Calculator, LoRA Stack, Negative Vault)"
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
            width: "280px",
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
          <div style={{ display: "flex", flexDirection: "column", padding: "6px" }}>
            {/* 1. Prompt Lab */}
            <button
              type="button"
              onClick={handleSendPromptLab}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "8px 10px",
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
                <span style={{ color: "#3b82f6" }}>🚀</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600 }}>Prompt Lab</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Bawa prompt ke editor studio</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#d4d4d8",
                  padding: "2px 6px",
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
                padding: "8px 10px",
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
                <span style={{ color: "#10b981" }}>📐</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600 }}>Resolution Calculator</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Kalkulasi aspect ratio &amp; bucket</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#34d399",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {data.width && data.height ? `${data.width}×${data.height}` : "1024×1024"}
              </span>
            </button>

            {/* 3. LoRA Stack */}
            <button
              type="button"
              onClick={handleSendLoraStack}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "8px 10px",
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
                <span style={{ color: "#f59e0b" }}>🧩</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600 }}>LoRA Stack</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Bawa {loras.length} LoRA ke stack mixer</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#fbbf24",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {loras.length} LoRA
              </span>
            </button>

            {/* 4. Negative Vault */}
            {data.negativePrompt && (
              <button
                type="button"
                onClick={handleSendNegativeVault}
                style={{
                  background: "#121215",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  padding: "8px 10px",
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
                  <span style={{ color: "#ef4444" }}>🛡️</span>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600 }}>Negative Vault</div>
                    <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Analisis CLIP tokens &amp; slop</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    background: "#18181b",
                    border: "1px solid #7f1d1d",
                    color: "#f87171",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Negative
                </span>
              </button>
            )}

            {/* 5. Metadata Inspector */}
            <button
              type="button"
              onClick={handleSendInspector}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "8px 10px",
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
                <span style={{ color: "#38bdf8" }}>🔍</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600 }}>Metadata Inspector</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Node graph &amp; raw chunks</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#38bdf8",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                Inspect
              </span>
            </button>

            {/* 6. Sampler & Scheduler Guide */}
            <button
              type="button"
              onClick={handleSendSamplerGuide}
              style={{
                background: "#121215",
                border: "1px solid transparent",
                borderRadius: "6px",
                padding: "8px 10px",
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
                <span style={{ color: "#10b981" }}>📊</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600 }}>Sampler &amp; Scheduler</div>
                  <div style={{ fontSize: "11px", color: "#a1a1aa" }}>Analisis konvergensi &amp; sigma</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  background: "#18181b",
                  border: "1px solid #065f46",
                  color: "#34d399",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                Guide
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
