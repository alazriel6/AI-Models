import React from "react";

export type StudioTabKey = "studio" | "canvas" | "deconstructor" | "library";

interface PromptStudioTabsProps {
    activeTab: StudioTabKey;
    onSelectTab: (tab: StudioTabKey) => void;
    tokenCount?: number;
    activeCategoryCount?: number;
    presetCount?: number;
}

export const PromptStudioTabs: React.FC<PromptStudioTabsProps> = ({
    activeTab,
    onSelectTab,
    tokenCount = 0,
    activeCategoryCount = 0,
    presetCount = 0,
}) => {
    return (
        <div className="studio-mode-tab-bar" role="tablist" aria-label="Studio Workstation Views">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "studio"}
                className={`studio-mode-tab-btn ${activeTab === "studio" ? "active" : ""}`}
                onClick={() => onSelectTab("studio")}
            >
                <span className="studio-mode-icon-box" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                </span>
                <span className="studio-mode-label-group">
                    <span className="studio-mode-title">10-Layer Modular Studio</span>
                    <span className="studio-mode-sub">Visual prompt builder</span>
                </span>
                {activeCategoryCount > 0 && (
                    <span className="studio-tab-badge active-layers">
                        {activeCategoryCount}/10
                    </span>
                )}
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "canvas"}
                className={`studio-mode-tab-btn ${activeTab === "canvas" ? "active" : ""}`}
                onClick={() => onSelectTab("canvas")}
            >
                <span className="studio-mode-icon-box" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14" />
                        <line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" />
                        <line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                </span>
                <span className="studio-mode-label-group">
                    <span className="studio-mode-title">Prompt Lab Canvas</span>
                    <span className="studio-mode-sub">Tokenizer &amp; Matrix</span>
                </span>
                {tokenCount > 0 && (
                    <span className="studio-tab-badge tokens">
                        ~{tokenCount} tok
                    </span>
                )}
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "deconstructor"}
                className={`studio-mode-tab-btn ${activeTab === "deconstructor" ? "active" : ""}`}
                onClick={() => onSelectTab("deconstructor")}
            >
                <span className="studio-mode-icon-box" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <line x1="20" y1="4" x2="8.12" y2="15.88" />
                        <line x1="14.47" y1="14.48" x2="20" y2="20" />
                        <line x1="8.12" y1="8.12" x2="12" y2="12" />
                    </svg>
                </span>
                <span className="studio-mode-label-group">
                    <span className="studio-mode-title">Transformer &amp; Deconstructor</span>
                    <span className="studio-mode-sub">Cross-model format converter</span>
                </span>
                <span className="studio-tab-badge parser">
                    Converter
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "library"}
                className={`studio-mode-tab-btn ${activeTab === "library" ? "active" : ""}`}
                onClick={() => onSelectTab("library")}
            >
                <span className="studio-mode-icon-box" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </span>
                <span className="studio-mode-label-group">
                    <span className="studio-mode-title">Character &amp; Presets</span>
                    <span className="studio-mode-sub">Database library</span>
                </span>
                {presetCount > 0 && (
                    <span className="studio-tab-badge presets">
                        {presetCount} items
                    </span>
                )}
            </button>
        </div>
    );
};
