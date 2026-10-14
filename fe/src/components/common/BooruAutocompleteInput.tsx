import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    searchBooruTags,
    extractActiveToken,
    type BooruTagItem,
} from "../../data/booruTags";
import { getBooruTagsApi } from "../../api/models";
import "../../style/BooruAutocomplete.css";

export interface BooruAutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    as?: "input" | "textarea";
    rows?: number;
    layer?: string;
    customDbTags?: { name: string; category?: string; layer?: string }[];
    onKeyDown?: (e: React.KeyboardEvent<any>) => void;
    autoFocus?: boolean;
    id?: string;
    name?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export const BooruAutocompleteInput: React.FC<BooruAutocompleteInputProps> = ({
    value,
    onChange,
    placeholder,
    className = "",
    as = "input",
    rows = 3,
    layer,
    customDbTags = [],
    onKeyDown,
    autoFocus = false,
    id,
    name,
    disabled = false,
    style,
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [suggestions, setSuggestions] = useState<BooruTagItem[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [activeTokenInfo, setActiveTokenInfo] = useState<{
        token: string;
        startIndex: number;
        endIndex: number;
        prefix: string;
    } | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const debounceTimerRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const cacheRef = useRef<Map<string, BooruTagItem[]>>(new Map());

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Get current HTML element based on type
    const getInputElement = (): HTMLInputElement | HTMLTextAreaElement | null => {
        return as === "textarea" ? textareaRef.current : inputRef.current;
    };

    // Evaluate token at current cursor position (query PostgreSQL backend with debounce & cache)
    const evaluateCursorToken = useCallback(
        (currentText: string, cursorPos: number | null) => {
            if (cursorPos === null || cursorPos < 0) {
                setIsOpen(false);
                return;
            }

            const tokenData = extractActiveToken(currentText, cursorPos);
            if (!tokenData.token || tokenData.token.trim().length === 0) {
                setIsOpen(false);
                setActiveTokenInfo(null);
                return;
            }

            const rawToken = tokenData.token.trim();
            const query = rawToken.toLowerCase();
            setActiveTokenInfo(tokenData);

            const cacheKey = `${layer || "all"}:${query}`;

            // Fast path: check query cache
            if (cacheRef.current.has(cacheKey)) {
                const cached = cacheRef.current.get(cacheKey)!;
                if (cached.length > 0) {
                    setSuggestions(cached);
                    setActiveIndex(0);
                    setIsOpen(true);
                } else {
                    setIsOpen(false);
                }
                return;
            }

            // Cancel any pending timer
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }

            // Debounce API request (100ms) to prevent hammering PostgreSQL while typing
            debounceTimerRef.current = window.setTimeout(async () => {
                try {
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    abortControllerRef.current = new AbortController();

                    // Query PostgreSQL DB via backend API scoped to this layer if provided
                    const dbResults = await getBooruTagsApi(query, undefined, 8, layer);
                    const mapped: BooruTagItem[] = dbResults.map((t) => ({
                        name: t.name,
                        category: (t.category as any) || "general",
                        count: t.post_count,
                        desc: t.description,
                    }));

                    // Blend with any user custom tags if provided
                    let finalResults = mapped;
                    if (customDbTags.length > 0) {
                        const normQ = query.replace(/[\s_]+/g, "");
                        const customMatches = customDbTags
                            .filter((cd) => {
                                // Strictly filter by layer: if this input is for a specific layer,
                                // do NOT allow custom tags belonging to another layer!
                                if (layer && cd.layer && cd.layer.toLowerCase() !== layer.toLowerCase()) {
                                    return false;
                                }
                                return cd.name.toLowerCase().replace(/[\s_]+/g, "").includes(normQ);
                            })
                            .map((cd) => ({
                                name: cd.name,
                                category: (cd.category as any) || "general",
                                count: "Custom",
                                desc: "Custom Studio Layer Tag",
                            }));
                        finalResults = [
                            ...customMatches,
                            ...mapped.filter((m) => !customMatches.some((cm) => cm.name === m.name)),
                        ].slice(0, 8);
                    }

                    // Save to cache
                    cacheRef.current.set(cacheKey, finalResults);

                    if (finalResults.length > 0) {
                        setSuggestions(finalResults);
                        setActiveIndex(0);
                        setIsOpen(true);
                    } else {
                        setIsOpen(false);
                    }
                } catch (err: any) {
                    if (err.name === "AbortError") return;
                    // Fallback to local search if offline or transient server issue
                    const layerFilteredCustom = customDbTags.filter(
                        (cd) => !layer || !cd.layer || cd.layer.toLowerCase() === layer.toLowerCase()
                    );
                    const fallbackMatches = searchBooruTags(rawToken, layerFilteredCustom, 7);
                    if (fallbackMatches.length > 0) {
                        setSuggestions(fallbackMatches);
                        setActiveIndex(0);
                        setIsOpen(true);
                    } else {
                        setIsOpen(false);
                    }
                }
            }, 100);
        },
        [customDbTags, layer]
    );

    // Apply selected tag into the text
    const applySuggestion = useCallback(
        (selectedTag: BooruTagItem) => {
            if (!activeTokenInfo) return;

            const el = getInputElement();
            const { startIndex, endIndex } = activeTokenInfo;

            // Replace active token segment with chosen tag + comma separator
            const before = value.slice(0, startIndex);
            const after = value.slice(endIndex);

            // If there's already a comma after, don't duplicate comma
            const needsTrailingComma = !after.trimStart().startsWith(",");
            const replacement = selectedTag.name + (needsTrailingComma ? ", " : " ");
            const newText = before + replacement + after.replace(/^[\s,]+/, "");

            onChange(newText);
            setIsOpen(false);
            setActiveTokenInfo(null);

            // Re-focus and position cursor right after the newly inserted tag
            requestAnimationFrame(() => {
                if (el) {
                    el.focus();
                    const newCursor = (before + replacement).length;
                    el.setSelectionRange(newCursor, newCursor);
                }
            });
        },
        [activeTokenInfo, value, onChange, as]
    );

    // Text Change Handler
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        onChange(newVal);
        evaluateCursorToken(newVal, e.target.selectionStart);
    };

    // Click / Cursor Move Handler
    const handleSelectOrClick = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        evaluateCursorToken(target.value, target.selectionStart);
    };

    // Keyboard Navigation in Dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (isOpen && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                // If autocomplete is active and user presses enter/tab, select tag
                e.preventDefault();
                applySuggestion(suggestions[activeIndex]);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                return;
            }
        }

        // Forward to parent handler if not consumed
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    // Click outside listener to close popover
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Render Tag Name with highlighted match
    const renderHighlightedName = (name: string, query: string) => {
        if (!query) return name;
        const lowerName = name.toLowerCase();
        const querySpace = query.toLowerCase().replace(/_/g, " ");
        const queryUnder = query.toLowerCase().replace(/\s+/g, "_");

        let matchIdx = lowerName.indexOf(query.toLowerCase());
        let matchLen = query.length;

        if (matchIdx === -1) {
            matchIdx = lowerName.indexOf(querySpace);
            matchLen = querySpace.length;
        }
        if (matchIdx === -1) {
            matchIdx = lowerName.indexOf(queryUnder);
            matchLen = queryUnder.length;
        }

        if (matchIdx === -1) return name;

        return (
            <>
                {name.slice(0, matchIdx)}
                <span className="booru-tag-match">{name.slice(matchIdx, matchIdx + matchLen)}</span>
                {name.slice(matchIdx + matchLen)}
            </>
        );
    };

    return (
        <div className="booru-autocomplete-container" ref={containerRef} style={style}>
            {as === "textarea" ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onSelect={handleSelectOrClick}
                    onClick={handleSelectOrClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={className}
                    rows={rows}
                    autoFocus={autoFocus}
                    id={id}
                    name={name}
                    disabled={disabled}
                />
            ) : (
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onSelect={handleSelectOrClick}
                    onClick={handleSelectOrClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={className}
                    autoFocus={autoFocus}
                    id={id}
                    name={name}
                    disabled={disabled}
                />
            )}

            {/* Floating Autocomplete Popover */}
            {isOpen && suggestions.length > 0 && (
                <div className="booru-autocomplete-popover">
                    <div className="booru-autocomplete-header">
                        <div className="booru-autocomplete-title">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span>Danbooru Database (1000+ Tags)</span>
                        </div>
                        <span className="booru-autocomplete-shortcuts">
                            ↑↓ Navigasi • Enter/Tab Pilih • Esc Tutup
                        </span>
                    </div>

                    <ul className="booru-autocomplete-list">
                        {suggestions.map((item, idx) => {
                            const isSelected = idx === activeIndex;

                            return (
                                <li
                                    key={item.name}
                                    className={`booru-autocomplete-item ${isSelected ? "active" : ""}`}
                                    onMouseDown={(e) => {
                                        // prevent blur before click
                                        e.preventDefault();
                                        applySuggestion(item);
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                >
                                    <div className="booru-autocomplete-left">
                                        <span className={`booru-cat-badge ${item.category}`}>
                                            {item.category}
                                        </span>
                                        <div className="booru-tag-name-wrapper">
                                            <span className="booru-tag-name">
                                                {renderHighlightedName(item.name, activeTokenInfo?.token || "")}
                                            </span>
                                            {item.desc && (
                                                <span className="booru-tag-desc" title={item.desc}>
                                                    — {item.desc}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="booru-autocomplete-right">
                                        {item.count && (
                                            <span className="booru-tag-count">{item.count}</span>
                                        )}
                                        <span className="booru-enter-hint">↵ Tab</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
