import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./comfy-viewer.css";

export interface ComfyNodeSlot {
  name: string;
  type: string;
  links?: number[];
  link?: number | null;
  slot_index?: number;
}

export interface ParsedComfyGroup {
  id: number | string;
  title: string;
  bounding: [number, number, number, number]; // [x, y, width, height]
  color?: string;
  font_size?: number;
}

export interface ParsedComfyNode {
  id: number | string;
  type: string;
  title?: string;
  pos: [number, number];
  size: [number, number];
  inputs: ComfyNodeSlot[];
  outputs: ComfyNodeSlot[];
  widgets_values?: unknown[];
  color?: string;
  bgcolor?: string;
}

export interface ParsedComfyLink {
  id: number;
  fromNode: number | string;
  fromSlot: number;
  toNode: number | string;
  toSlot: number;
  type: string;
}

interface ComfyNodeViewerProps {
  workflowJson: string;
  workflowTitle?: string;
  baseModel?: string;
  category?: string;
  height?: string | number;
  onOpenModelDetail?: (modelId: number) => void;
}

export const ComfyNodeViewer: React.FC<ComfyNodeViewerProps> = ({
  workflowJson,
  workflowTitle = "ComfyUI Workflow",
  baseModel,
  category,
  height = "720px"
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(0.75);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 60 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<number | string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Parse workflow JSON safely
  const { nodes, links, groups } = useMemo(() => {
    if (!workflowJson) {
      return { nodes: [] as ParsedComfyNode[], links: [] as ParsedComfyLink[], groups: [] as ParsedComfyGroup[] };
    }

    try {
      const data = typeof workflowJson === "string" ? JSON.parse(workflowJson) : workflowJson;

      // Parse groups
      const rawGroups: ParsedComfyGroup[] = [];
      if (data && Array.isArray(data.groups)) {
        data.groups.forEach((g: Record<string, unknown>, idx: number) => {
          if (Array.isArray(g.bounding) && g.bounding.length >= 4) {
            rawGroups.push({
              id: (g.id as number | string) ?? idx + 1,
              title: String(g.title || `Group ${idx + 1}`),
              bounding: [
                Number(g.bounding[0]) || 0,
                Number(g.bounding[1]) || 0,
                Number(g.bounding[2]) || 320,
                Number(g.bounding[3]) || 220
              ],
              color: typeof g.color === "string" ? g.color : "#2563eb",
              font_size: typeof g.font_size === "number" ? g.font_size : 14
            });
          }
        });
      }

      // Format 1: Standard ComfyUI web format { nodes: [...], links: [...] }
      if (data && Array.isArray(data.nodes)) {
        const rawNodes: ParsedComfyNode[] = data.nodes.map((n: Record<string, unknown>, idx: number) => {
          const rawPos = Array.isArray(n.pos) ? (n.pos as number[]) : [idx * 340, 100];
          const rawSize = Array.isArray(n.size) ? (n.size as number[]) : [280, 180];
          return {
            id: (n.id as number | string) ?? idx + 1,
            type: String(n.type || "Node"),
            title: typeof n.title === "string" && n.title.trim() ? n.title : undefined,
            pos: [Number(rawPos[0]) || 0, Number(rawPos[1]) || 0],
            size: [Math.max(Number(rawSize[0]) || 260, 220), Math.max(Number(rawSize[1]) || 140, 90)],
            inputs: Array.isArray(n.inputs) ? (n.inputs as ComfyNodeSlot[]) : [],
            outputs: Array.isArray(n.outputs) ? (n.outputs as ComfyNodeSlot[]) : [],
            widgets_values: Array.isArray(n.widgets_values) ? n.widgets_values : undefined,
            color: typeof n.color === "string" ? n.color : undefined,
            bgcolor: typeof n.bgcolor === "string" ? n.bgcolor : undefined
          };
        });

        const rawLinks: ParsedComfyLink[] = [];
        if (Array.isArray(data.links)) {
          data.links.forEach((linkItem: unknown) => {
            if (Array.isArray(linkItem) && linkItem.length >= 6) {
              rawLinks.push({
                id: Number(linkItem[0]),
                fromNode: linkItem[1] as number | string,
                fromSlot: Number(linkItem[2]),
                toNode: linkItem[3] as number | string,
                toSlot: Number(linkItem[4]),
                type: String(linkItem[5] || "other")
              });
            }
          });
        }

        return { nodes: rawNodes, links: rawLinks, groups: rawGroups };
      }

      // Format 2: ComfyUI API format { "1": { class_type, inputs } }
      if (data && typeof data === "object") {
        const generatedNodes: ParsedComfyNode[] = [];
        const generatedLinks: ParsedComfyLink[] = [];
        const keys = Object.keys(data);
        let linkCounter = 1;

        keys.forEach((key, index) => {
          const nodeData = data[key];
          if (!nodeData || typeof nodeData !== "object") return;
          const classType = String(nodeData.class_type || "Node");
          const inputsObj = nodeData.inputs || {};

          const inSlots: ComfyNodeSlot[] = [];
          const widgetsVals: unknown[] = [];

          Object.keys(inputsObj).forEach((paramName) => {
            const val = inputsObj[paramName];
            if (Array.isArray(val) && val.length === 2) {
              inSlots.push({ name: paramName, type: "link" });
              generatedLinks.push({
                id: linkCounter++,
                fromNode: val[0],
                fromSlot: val[1],
                toNode: key,
                toSlot: inSlots.length - 1,
                type: paramName.toUpperCase()
              });
            } else {
              widgetsVals.push(val);
            }
          });

          generatedNodes.push({
            id: key,
            type: classType,
            pos: [80 + (index % 4) * 360, 80 + Math.floor(index / 4) * 320],
            size: [300, 200],
            inputs: inSlots,
            outputs: [{ name: "OUT", type: "ANY" }],
            widgets_values: widgetsVals
          });
        });

        return { nodes: generatedNodes, links: generatedLinks, groups: rawGroups };
      }

      return { nodes: [], links: [], groups: [] };
    } catch {
      return { nodes: [], links: [], groups: [] };
    }
  }, [workflowJson]);

  // Fit all nodes & groups into screen view with smart min zoom
  const fitToView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Filter active processing nodes (exclude distant notes if they stretch bounding box unnaturally)
    const activeNodes = nodes.filter(
      (n) => n.type !== "MarkdownNote" && n.type !== "Note"
    );
    const targetNodes = activeNodes.length > 0 ? activeNodes : nodes;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    targetNodes.forEach((n) => {
      minX = Math.min(minX, n.pos[0]);
      minY = Math.min(minY, n.pos[1]);
      maxX = Math.max(maxX, n.pos[0] + n.size[0]);
      maxY = Math.max(maxY, n.pos[1] + n.size[1]);
    });

    if (minX === Infinity) return;

    const graphWidth = maxX - minX + 220;
    const graphHeight = maxY - minY + 220;

    const rect = containerRef.current.getBoundingClientRect();
    const availableWidth = rect.width > 100 ? rect.width : 1000;
    const availableHeight = rect.height > 100 ? rect.height : 700;

    const scaleX = availableWidth / graphWidth;
    const scaleY = availableHeight / graphHeight;
    // Keep minimum zoom at 0.55 so nodes don't shrink to unreadable specks!
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.55), 1.15);

    const centerX = (availableWidth - (maxX - minX) * newZoom) / 2 - minX * newZoom;
    const centerY = (availableHeight - (maxY - minY) * newZoom) / 2 - minY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(centerX), y: Math.round(centerY) });
  }, [nodes]);

  // Initial fit on load
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 120);
    return () => clearTimeout(timer);
  }, [fitToView]);

  // Native Non-Passive Wheel Event: Completely stops the main page from scrolling!
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;

      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(Number((prevZoom * zoomFactor).toFixed(2)), 0.25), 2.2);
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setPan((prevPan) => {
          const newPanX = mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom);
          const newPanY = mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom);
          return { x: Math.round(newPanX), y: Math.round(newPanY) };
        });

        return newZoom;
      });
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest(".comfy-node-card") ||
      (e.target as HTMLElement).closest(".comfy-floating-menu") ||
      (e.target as HTMLElement).closest(".comfy-side-inspector")
    ) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Copy workflow JSON for direct paste (Ctrl+V) in ComfyUI
  const handleCopyWorkflow = () => {
    try {
      navigator.clipboard.writeText(workflowJson);
      setToastMessage("Workflow disalin! Tekan Ctrl + V langsung di canvas ComfyUI kamu.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage("Gagal menyalin workflow ke clipboard.");
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Download JSON file
  const handleDownloadJson = () => {
    try {
      const blob = new Blob([workflowJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflowTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "workflow"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage("File JSON workflow berhasil diunduh!");
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      setToastMessage("Gagal mengunduh file JSON.");
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Slot socket color helper
  const getSlotColorClass = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes("model")) return "slot-model";
    if (t.includes("clip")) return "slot-clip";
    if (t.includes("vae")) return "slot-vae";
    if (t.includes("conditioning")) return "slot-conditioning";
    if (t.includes("latent")) return "slot-latent";
    if (t.includes("image")) return "slot-image";
    if (t.includes("bbox") || t.includes("segm") || t.includes("detector")) return "slot-detector";
    return "slot-other";
  };

  // Wire cable color class
  const getWireColorClass = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes("model")) return "wire-model";
    if (t.includes("clip")) return "wire-clip";
    if (t.includes("vae")) return "wire-vae";
    if (t.includes("conditioning")) return "wire-conditioning";
    if (t.includes("latent")) return "wire-latent";
    if (t.includes("image")) return "wire-image";
    if (t.includes("bbox") || t.includes("segm") || t.includes("detector")) return "wire-detector";
    return "wire-other";
  };

  // Header background color helper matching authentic ComfyUI LiteGraph palette
  const getNodeHeaderColor = (node: ParsedComfyNode): string => {
    if (node.color) return node.color;
    const t = node.type.toLowerCase();
    if (t.includes("cliptext") || t.includes("prompt")) {
      return (node.title || "").toLowerCase().includes("neg") ? "#382528" : "#253825"; // authentic dark maroon / dark olive
    }
    if (t.includes("checkpoint") || t.includes("loader")) return "#353535";
    if (t.includes("sampler")) return "#222222";
    if (t.includes("vae") || t.includes("latent")) return "#2c2c2c";
    if (t.includes("detailer") || t.includes("detector") || t.includes("upscale")) return "#2d2d2d";
    if (t.includes("note")) return "#111111";
    return "#333333";
  };

  // Helper to map slot index to exact (x, y) coordinates for cables
  const getNodeSlotCoord = (nodeId: number | string, isOutput: boolean, slotIndex: number): [number, number] => {
    const node = nodes.find((n) => String(n.id) === String(nodeId));
    if (!node) return [0, 0];

    const slotRowHeight = 24;
    const headerHeight = 34;
    const paddingOffset = 8;
    const topOffset = headerHeight + paddingOffset + slotIndex * slotRowHeight + 12;

    if (isOutput) {
      return [node.pos[0] + node.size[0], node.pos[1] + topOffset];
    } else {
      return [node.pos[0], node.pos[1] + topOffset];
    }
  };

  const selectedNode = nodes.find((n) => String(n.id) === String(selectedNodeId));

  return (
    <div
      className={`comfy-viewer-wrapper ${isFullscreen ? "fullscreen" : ""}`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      {/* 1. Top Information Toolbar */}
      <div className="comfy-toolbar">
        <div className="comfy-toolbar-left">
          <span className="comfy-brand-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="7" height="7" rx="1.5" />
              <rect x="15" y="3" width="7" height="7" rx="1.5" />
              <rect x="15" y="14" width="7" height="7" rx="1.5" />
              <rect x="2" y="14" width="7" height="7" rx="1.5" />
              <path d="M9 6.5h6" />
              <path d="M5.5 10v4" />
              <path d="M18.5 10v4" />
            </svg>
            ComfyUI
          </span>
          <span className="comfy-workflow-title">{workflowTitle}</span>
          {baseModel && <span className="comfy-meta-pill highlight">{baseModel}</span>}
          {category && <span className="comfy-meta-pill">{category.toUpperCase()}</span>}
          <span className="comfy-meta-pill">{nodes.length} Nodes</span>
          {groups.length > 0 && <span className="comfy-meta-pill">{groups.length} Groups</span>}
        </div>

        <div className="comfy-toolbar-right">
          <button
            type="button"
            className="comfy-tool-btn"
            onClick={fitToView}
            title="Pusatkan dan pas kan tampilan workflow"
          >
            Reset Tampilan
          </button>
          <button
            type="button"
            className="comfy-tool-btn icon-only"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6m-6 12h6v-6M9 21H3v-6M9 3H3v6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Canvas Area */}
      <div
        ref={containerRef}
        className={`comfy-canvas-container ${isPanning ? "grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="comfy-viewport"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          {/* Groups Layer */}
          {groups.map((group) => {
            const groupColor = group.color || "#2563eb";
            return (
              <div
                key={group.id}
                className="comfy-group-box"
                style={{
                  left: `${group.bounding[0]}px`,
                  top: `${group.bounding[1]}px`,
                  width: `${group.bounding[2]}px`,
                  height: `${group.bounding[3]}px`,
                  borderColor: groupColor,
                  backgroundColor: `${groupColor}14`
                }}
              >
                <div
                  className="comfy-group-header"
                  style={{
                    backgroundColor: groupColor
                  }}
                >
                  {group.title}
                </div>
              </div>
            );
          })}

          {/* SVG Cable Wires Layer */}
          <svg className="comfy-svg-layer">
            {links.map((link) => {
              const [x1, y1] = getNodeSlotCoord(link.fromNode, true, link.fromSlot);
              const [x2, y2] = getNodeSlotCoord(link.toNode, false, link.toSlot);

              if (x1 === 0 && y1 === 0) return null;
              if (x2 === 0 && y2 === 0) return null;

              // Smooth cubic bezier spline
              const dx = Math.max(Math.abs(x2 - x1) * 0.55, 45);
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const wireClass = getWireColorClass(link.type);

              return (
                <path
                  key={link.id}
                  d={pathD}
                  className={`comfy-wire ${wireClass}`}
                />
              );
            })}
          </svg>

          {/* Node Cards */}
          {nodes.map((node) => {
            const isSelected = String(node.id) === String(selectedNodeId);
            const isNote = node.type === "MarkdownNote" || node.type === "Note";
            const isClipText = node.type === "CLIPTextEncode";

            const headerBg = getNodeHeaderColor(node);
            const bodyBg = node.bgcolor ? node.bgcolor : isNote ? "#0f172a" : "#171f2e";
            const maxSlots = Math.max(node.inputs.length, node.outputs.length);

            return (
              <div
                key={node.id}
                className={`comfy-node-card ${isSelected ? "selected" : ""}`}
                style={{
                  left: `${node.pos[0]}px`,
                  top: `${node.pos[1]}px`,
                  width: `${node.size[0]}px`,
                  backgroundColor: bodyBg
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
              >
                {/* Header Bar */}
                <div
                  className="comfy-node-title-bar"
                  style={{ backgroundColor: headerBg }}
                >
                  <div className="node-title-left">
                    <span className="node-status-dot" />
                    <span title={node.title || node.type}>{node.title || node.type}</span>
                  </div>
                  <span className="node-id-tag">#{node.id}</span>
                </div>

                {/* Sockets Section */}
                {maxSlots > 0 && (
                  <div className="comfy-sockets-section">
                    {Array.from({ length: maxSlots }).map((_, sIdx) => {
                      const inputSlot = node.inputs[sIdx];
                      const outputSlot = node.outputs[sIdx];

                      return (
                        <div key={sIdx} className="socket-pair-row">
                          {inputSlot ? (
                            <div className="socket-input-side">
                              <span className={`socket-pin left-pin ${getSlotColorClass(inputSlot.type)}`} />
                              <span className="socket-label">{inputSlot.name}</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          {outputSlot ? (
                            <div className="socket-output-side">
                              <span className="socket-label">{outputSlot.name}</span>
                              <span className={`socket-pin right-pin ${getSlotColorClass(outputSlot.type)}`} />
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Widgets Section */}
                {isNote && node.widgets_values && node.widgets_values.length > 0 && (
                  <div className="comfy-widgets-section">
                    <div className="comfy-note-content">
                      {String(node.widgets_values[0] || "")}
                    </div>
                  </div>
                )}

                {isClipText && node.widgets_values && node.widgets_values.length > 0 && (
                  <div className="comfy-widgets-section">
                    <div className="comfy-prompt-box">
                      {String(node.widgets_values[0] || "")}
                    </div>
                  </div>
                )}

                {!isNote && !isClipText && node.widgets_values && node.widgets_values.length > 0 && (
                  <div className="comfy-widgets-section">
                    {node.widgets_values.slice(0, 4).map((wVal, wIdx) => {
                      const valStr = typeof wVal === "object" ? JSON.stringify(wVal) : String(wVal);
                      return (
                        <div key={wIdx} className="comfy-widget-bar">
                          <span className="widget-name-label">param {wIdx + 1}</span>
                          <span className="widget-value-text" title={valStr}>{valStr}</span>
                          <span className="widget-caret">▾</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. Floating ComfyUI Action Panel (Top Right) */}
        <div className="comfy-floating-menu">
          <div className="floating-menu-brand">
            <span className="floating-brand-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6">
                <circle cx="12" cy="12" r="10" />
              </svg>
              ComfyUI Action
            </span>
            <span className="floating-status-pill">Ready</span>
          </div>

          <button
            type="button"
            className="comfy-btn-queue"
            onClick={handleCopyWorkflow}
            title="Klik untuk menyalin workflow & gunakan di ComfyUI lokal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Queue Prompt
          </button>

          <button
            type="button"
            className="comfy-btn-secondary"
            onClick={handleCopyWorkflow}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Workflow (Ctrl+V)
          </button>

          <button
            type="button"
            className="comfy-btn-secondary"
            onClick={handleDownloadJson}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .json
          </button>

          <div className="comfy-menu-divider" />

          {/* Zoom controls */}
          <div className="floating-zoom-bar">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                className="zoom-mini-btn"
                onClick={() => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.25))}
                title="Zoom Out"
              >
                －
              </button>
              <button
                type="button"
                className="zoom-mini-btn"
                onClick={() => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.2))}
                title="Zoom In"
              >
                ＋
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <button
              type="button"
              className="comfy-btn-secondary"
              onClick={() => {
                setZoom(0.75);
              }}
              style={{ fontSize: "11px", padding: "5px" }}
            >
              75%
            </button>
            <button
              type="button"
              className="comfy-btn-secondary"
              onClick={() => {
                setZoom(1.0);
              }}
              style={{ fontSize: "11px", padding: "5px" }}
            >
              100%
            </button>
          </div>

          <button
            type="button"
            className="comfy-btn-secondary"
            onClick={fitToView}
            style={{ fontSize: "11px", padding: "6px" }}
          >
            Fit View
          </button>

          <div style={{ fontSize: "10px", color: "#64748b", textAlign: "center", marginTop: "2px" }}>
            Queue size: 0
          </div>
        </div>

        {/* 4. Left Side Node Inspector Drawer (Solid, Legible & High-Contrast) */}
        {selectedNode && (
          <div className="comfy-side-inspector">
            <div className="inspector-header">
              <div className="inspector-header-left">
                <span className="inspector-node-title">
                  {selectedNode.title || selectedNode.type}
                </span>
                <span className="inspector-node-badge">#{selectedNode.id}</span>
              </div>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => setSelectedNodeId(null)}
                title="Tutup Inspector"
              >
                ✕
              </button>
            </div>

            <div className="inspector-content">
              {/* General Metadata */}
              <div>
                <div className="inspector-section-title">Informasi Node</div>
                <table className="inspector-table">
                  <tbody>
                    <tr>
                      <td className="td-label">Tipe</td>
                      <td className="td-val">{selectedNode.type}</td>
                    </tr>
                    <tr>
                      <td className="td-label">Posisi Canvas</td>
                      <td className="td-val">
                        X: {selectedNode.pos[0]}, Y: {selectedNode.pos[1]}
                      </td>
                    </tr>
                    <tr>
                      <td className="td-label">Ukuran</td>
                      <td className="td-val">
                        {selectedNode.size[0]} × {selectedNode.size[1]} px
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Inputs */}
              {selectedNode.inputs.length > 0 && (
                <div>
                  <div className="inspector-section-title">
                    <span>Input Ports</span>
                    <span style={{ color: "#64748b" }}>({selectedNode.inputs.length})</span>
                  </div>
                  <table className="inspector-table">
                    <tbody>
                      {selectedNode.inputs.map((inp, idx) => (
                        <tr key={idx}>
                          <td className="td-label">{inp.name}</td>
                          <td className="td-val">
                            <span className="inspector-tag" style={{ backgroundColor: "#1e293b", color: "#38bdf8" }}>
                              {inp.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Outputs */}
              {selectedNode.outputs.length > 0 && (
                <div>
                  <div className="inspector-section-title">
                    <span>Output Ports</span>
                    <span style={{ color: "#64748b" }}>({selectedNode.outputs.length})</span>
                  </div>
                  <table className="inspector-table">
                    <tbody>
                      {selectedNode.outputs.map((out, idx) => (
                        <tr key={idx}>
                          <td className="td-label">{out.name}</td>
                          <td className="td-val">
                            <span className="inspector-tag" style={{ backgroundColor: "#1e293b", color: "#4ade80" }}>
                              {out.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Prompt Text Preview for CLIPTextEncode */}
              {selectedNode.type === "CLIPTextEncode" &&
                selectedNode.widgets_values &&
                selectedNode.widgets_values.length > 0 && (
                  <div>
                    <div className="inspector-section-title">Teks Prompt</div>
                    <div className="inspector-prompt-block">
                      {String(selectedNode.widgets_values[0] ?? "")}
                    </div>
                  </div>
                )}

              {/* Note Content */}
              {(selectedNode.type === "MarkdownNote" || selectedNode.type === "Note") &&
                selectedNode.widgets_values &&
                selectedNode.widgets_values.length > 0 && (
                  <div>
                    <div className="inspector-section-title">Isi Catatan Markdown</div>
                    <div className="inspector-prompt-block">
                      {String(selectedNode.widgets_values[0] ?? "")}
                    </div>
                  </div>
                )}

              {/* Widget Values */}
              {selectedNode.widgets_values &&
                selectedNode.widgets_values.length > 0 &&
                selectedNode.type !== "MarkdownNote" &&
                selectedNode.type !== "Note" &&
                selectedNode.type !== "CLIPTextEncode" && (
                  <div>
                    <div className="inspector-section-title">Parameter / Nilai Widget</div>
                    <table className="inspector-table">
                      <tbody>
                        {selectedNode.widgets_values.map((wVal, idx) => (
                          <tr key={idx}>
                            <td className="td-label">Parameter #{idx + 1}</td>
                            <td className="td-val">
                              {typeof wVal === "object" ? JSON.stringify(wVal) : String(wVal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMessage && (
          <div className="comfy-toast-notification">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toastMessage}
          </div>
        )}
      </div>

      {/* 5. Bottom Cable Legend Bar (Clean Horizontal Layout) */}
      <div className="comfy-legend-bar">
        <span className="legend-title">Kabel Tipe:</span>
        <div className="legend-item"><span className="legend-dot slot-model" /> MODEL</div>
        <div className="legend-item"><span className="legend-dot slot-clip" /> CLIP</div>
        <div className="legend-item"><span className="legend-dot slot-conditioning" /> CONDITIONING</div>
        <div className="legend-item"><span className="legend-dot slot-latent" /> LATENT</div>
        <div className="legend-item"><span className="legend-dot slot-vae" /> VAE</div>
        <div className="legend-item"><span className="legend-dot slot-image" /> IMAGE</div>
        <div className="legend-item"><span className="legend-dot slot-detector" /> DETECTOR</div>
        <span className="legend-tip">
          💡 Scroll mouse untuk zoom • Drag canvas untuk geser • Klik node untuk detail
        </span>
      </div>
    </div>
  );
};
