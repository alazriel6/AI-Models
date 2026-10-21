import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  type WorkflowBridgeData,
  getWorkflowBridge,
  clearWorkflowBridge,
  bridgeToPromptLab,
  bridgeToCalculator,
  bridgeToLoraStack,
  bridgeToNegativeVault,
  bridgeToSamplerGuide,
} from "../../utils/workflowBridge";

interface WorkflowBridgeBannerProps {
  currentTool: "prompt-lab" | "calculator" | "lora-stack" | "negative-vault" | "sampler-guide";
  onApply?: (data: WorkflowBridgeData) => void;
}

export function WorkflowBridgeBanner({ currentTool, onApply }: WorkflowBridgeBannerProps) {
  const [bridge, setBridge] = useState<WorkflowBridgeData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const active = getWorkflowBridge();
    if (active && active.source) {
      setBridge(active);
      onApply?.(active);
    }
  }, [onApply]);

  if (!bridge) return null;

  const handleDismiss = () => {
    clearWorkflowBridge();
    setBridge(null);
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case "gallery":
        return "Galeri Seni";
      case "inspector":
        return "Metadata Inspector";
      case "prompt-lab":
        return "Prompt Studio & Lab";
      case "calculator":
        return "Resolution Calculator";
      case "lora-stack":
        return "LoRA Stack Studio";
      case "negative-vault":
        return "Negative Vault";
      case "sampler-guide":
        return "Sampler & Scheduler Guide";
      default:
        return "Alat Generator";
    }
  };

  return (
    <div
      style={{
        background: "#121215",
        border: "1px solid #27272a",
        borderLeft: "3px solid #2563eb",
        borderRadius: "6px",
        padding: "10px 14px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        color: "#f4f4f5",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            background: "#2563eb",
            color: "#ffffff",
            padding: "2px 6px",
            borderRadius: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Workflow Bridge
        </span>
        <span style={{ fontSize: "12.5px", color: "#f4f4f5" }}>
          Metadata diimpor dari <strong>{getSourceLabel(bridge.source)}</strong>
          {bridge.title ? ` (${bridge.title})` : ""}
        </span>

        {/* Quick specs pill */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {bridge.width && bridge.height && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#34d399",
                padding: "1px 6px",
                borderRadius: "3px",
              }}
            >
              {bridge.width}×{bridge.height}
            </span>
          )}
          {bridge.baseModel && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#60a5fa",
                padding: "1px 6px",
                borderRadius: "3px",
              }}
            >
              {bridge.baseModel}
            </span>
          )}
          {bridge.loras && bridge.loras.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#fbbf24",
                padding: "1px 6px",
                borderRadius: "3px",
              }}
            >
              {bridge.loras.length} LoRA
            </span>
          )}
        </div>
      </div>

      {/* Quick Hop to companion tools */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {currentTool !== "prompt-lab" && bridge.positivePrompt && (
          <button
            type="button"
            onClick={() => bridgeToPromptLab(navigate, bridge)}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Lompat ke Prompt Lab dengan data yang sama"
          >
            Buka di Prompt Lab
          </button>
        )}

        {currentTool !== "calculator" && bridge.width && bridge.height && (
          <button
            type="button"
            onClick={() => bridgeToCalculator(navigate, bridge)}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Lompat ke Calculator dengan resolusi ini"
          >
            Buka di Calculator
          </button>
        )}

        {currentTool !== "lora-stack" && bridge.loras && bridge.loras.length > 0 && (
          <button
            type="button"
            onClick={() => bridgeToLoraStack(navigate, bridge)}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Lompat ke LoRA Stack dengan LoRA ini"
          >
            Buka di LoRA Stack
          </button>
        )}

        {currentTool !== "negative-vault" && bridge.negativePrompt && (
          <button
            type="button"
            onClick={() => bridgeToNegativeVault(navigate, bridge)}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Lompat ke Negative Vault untuk analisis"
          >
            Buka di Negative Vault
          </button>
        )}

        {currentTool !== "sampler-guide" && (
          <button
            type="button"
            onClick={() => bridgeToSamplerGuide(navigate, bridge)}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Lompat ke Visual Sampler & Scheduler Guide"
          >
            Buka di Sampler Guide
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: "#27272a",
            border: "1px solid #3f3f46",
            color: "#d4d4d8",
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "4px",
          }}
          title="Tutup banner bridge"
        >
          Selesai ✕
        </button>
      </div>
    </div>
  );
}
