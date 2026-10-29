import React from "react";

export type StudioTabKey = "studio" | "canvas" | "tokenizer" | "deconstructor" | "library" | "story";

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
        <div className="studio-tabs-container">
            {/* Mobile Workstation Switcher Dropdown (Visible on <= 768px) */}
            <div className="studio-mobile-switcher-bar">
                <div className="studio-mobile-switcher-header">
                    <span className="studio-mobile-label">Mode Workstation:</span>
                    <span className="studio-mobile-active-badge">
                        {activeTab === "studio" && `${activeCategoryCount}/10 Layer`}
                        {activeTab === "canvas" && (tokenCount > 0 ? `~${tokenCount} tok` : "Canvas")}
                        {activeTab === "tokenizer" && (tokenCount > 0 ? `${Math.ceil(tokenCount / 75)} Chunk` : "77-Tok")}
                        {activeTab === "deconstructor" && "Konverter"}
                        {activeTab === "library" && `${presetCount} preset`}
                        {activeTab === "story" && "Studio Lab"}
                    </span>
                </div>
                <div className="studio-mobile-select-wrapper">
                    <select
                        className="studio-mobile-select"
                        value={activeTab}
                        onChange={(e) => onSelectTab(e.target.value as StudioTabKey)}
                        aria-label="Pilih Mode Workstation Studio"
                    >
                        <option value="studio">1. 10-Layer Modular Studio ({activeCategoryCount}/10)</option>
                        <option value="canvas">2. Prompt Lab Canvas ({tokenCount > 0 ? `~${tokenCount} tok` : "Canvas"})</option>
                        <option value="tokenizer">3. CLIP 77-Token Chunks ({tokenCount > 0 ? `${Math.ceil(tokenCount / 75)} Chunk` : "77-Tok"})</option>
                        <option value="deconstructor">4. Transformer &amp; Deconstructor</option>
                        <option value="library">5. Character &amp; Presets ({presetCount} preset)</option>
                        <option value="story">6. Storyboard &amp; 16 Categories</option>
                    </select>
                    <div className="studio-mobile-select-arrow" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>

                {/* Quick 2-Pill Switcher for Primary Modes */}
                <div className="studio-mobile-quick-pills">
                    <button
                        type="button"
                        className={`studio-mobile-quick-btn ${activeTab === "studio" ? "active" : ""}`}
                        onClick={() => onSelectTab("studio")}
                    >
                        <span className="studio-quick-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 17 12 22 22 17" />
                                <polyline points="2 12 12 17 22 12" />
                            </svg>
                        </span>
                        <span>10-Layer Studio</span>
                        <span className="studio-quick-badge">{activeCategoryCount}/10</span>
                    </button>
                    <button
                        type="button"
                        className={`studio-mobile-quick-btn ${activeTab === "canvas" ? "active" : ""}`}
                        onClick={() => onSelectTab("canvas")}
                    >
                        <span className="studio-quick-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="21" x2="4" y2="14" />
                                <line x1="4" y1="10" x2="4" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12" y2="3" />
                                <line x1="20" y1="21" x2="20" y2="16" />
                                <line x1="20" y1="12" x2="20" y2="3" />
                            </svg>
                        </span>
                        <span>Canvas</span>
                        <span className="studio-quick-badge">{tokenCount > 0 ? `${tokenCount}t` : "Edit"}</span>
                    </button>
                </div>
            </div>

            {/* Horizontal Tabs Bar (Desktop) */}
            <div className="studio-mode-tab-bar" role="tablist" aria-label="Navigasi Studio Workstation">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "studio"}
                className={`studio-mode-tab-btn ${activeTab === "studio" ? "active" : ""}`}
                onClick={() => onSelectTab("studio")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                </span>
                <span className="studio-mode-title">10-Layer Modular Studio</span>
                <span className={`studio-tab-badge ${activeCategoryCount > 0 ? "active-layers" : ""}`}>
                    {activeCategoryCount}/10
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "canvas"}
                className={`studio-mode-tab-btn ${activeTab === "canvas" ? "active" : ""}`}
                onClick={() => onSelectTab("canvas")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
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
                <span className="studio-mode-title">Prompt Lab Canvas</span>
                <span className="studio-tab-badge tokens">
                    {tokenCount > 0 ? `~${tokenCount} tok` : "Canvas"}
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "tokenizer"}
                className={`studio-mode-tab-btn ${activeTab === "tokenizer" ? "active" : ""}`}
                onClick={() => onSelectTab("tokenizer")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                </span>
                <span className="studio-mode-title">CLIP 77-Token Chunks</span>
                <span className={`studio-tab-badge ${tokenCount > 75 ? "active-layers" : ""}`}>
                    {tokenCount > 0 ? `${Math.ceil(tokenCount / 75)} Chunk` : "77-Tok"}
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "deconstructor"}
                className={`studio-mode-tab-btn ${activeTab === "deconstructor" ? "active" : ""}`}
                onClick={() => onSelectTab("deconstructor")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <line x1="20" y1="4" x2="8.12" y2="15.88" />
                        <line x1="14.47" y1="14.48" x2="20" y2="20" />
                        <line x1="8.12" y1="8.12" x2="12" y2="12" />
                    </svg>
                </span>
                <span className="studio-mode-title">Transformer &amp; Deconstructor</span>
                <span className="studio-tab-badge parser">
                    Konverter
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "library"}
                className={`studio-mode-tab-btn ${activeTab === "library" ? "active" : ""}`}
                onClick={() => onSelectTab("library")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </span>
                <span className="studio-mode-title">Character &amp; Presets</span>
                <span className="studio-tab-badge presets">
                    {presetCount > 0 ? `${presetCount} preset` : "Pustaka"}
                </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={activeTab === "story"}
                className={`studio-mode-tab-btn ${activeTab === "story" ? "active" : ""}`}
                onClick={() => onSelectTab("story")}
            >
                <span className="studio-mode-tab-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                </span>
                <span className="studio-mode-title">Storyboard &amp; 16 Categories Editor</span>
                <span className="studio-tab-badge story">
                    Studio Lab
                </span>
            </button>
            </div>
        </div>
    );
};
