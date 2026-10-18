import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { resolveImageUrl } from '../../api/client';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    thumbnail?: boolean;
    aspectRatio?: string;
    fallbackPlaceholder?: React.ReactNode;
    wrapperClassName?: string;
    wrapperStyle?: React.CSSProperties;
}

/**
 * Transforms an image URL to a high-efficiency compressed thumbnail URL.
 * - Backend /storage/images/ is routed through /storage/thumbnails/
 * - Civitai CDN /original=true/ is swapped for /width=450/ to avoid 10MB+ payload freezes
 */
export function getOptimizedImageUrl(rawUrl: string, thumbnail: boolean = false): string {
    const resolved = resolveImageUrl(rawUrl);
    if (!thumbnail || !resolved) return resolved;

    // If served from backend storage /storage/images/, route through /storage/thumbnails/
    if (resolved.includes('/storage/images/')) {
        return resolved.replace('/storage/images/', '/storage/thumbnails/');
    }

    // Civitai image optimization: swap /original=true/ with compressed thumbnail /width=450/
    if (resolved.includes('image.civitai.com') && resolved.includes('/original=true/')) {
        return resolved.replace('/original=true/', '/width=450/');
    }

    return resolved;
}

export function OptimizedImage({
    src,
    alt,
    thumbnail = false,
    aspectRatio,
    className = '',
    style,
    fallbackPlaceholder,
    wrapperClassName = '',
    wrapperStyle,
    loading = 'lazy',
    decoding = 'async',
    ...rest
}: OptimizedImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [useFallbackToOriginal, setUseFallbackToOriginal] = useState(false);
    const [isInView, setIsInView] = useState(() => loading === 'eager');
    const [retryCount, setRetryCount] = useState(0);

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const timeoutRef = useRef<number | null>(null);

    const primaryUrl = useMemo(() => {
        if (useFallbackToOriginal) {
            return resolveImageUrl(src);
        }
        return getOptimizedImageUrl(src, thumbnail);
    }, [src, thumbnail, useFallbackToOriginal]);

    // Reset loading state when src, thumbnail, or user triggers retry
    useEffect(() => {
        setLoaded(false);
        setError(false);
        setUseFallbackToOriginal(false);
    }, [src, thumbnail, retryCount]);

    // IntersectionObserver for reliable viewport lazy-loading across all layout types
    useEffect(() => {
        if (loading === 'eager' || isInView) return;

        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            setIsInView(true);
            return;
        }

        const el = wrapperRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry && entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '300px 0px', threshold: 0.01 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [loading, isInView]);

    const handleError = useCallback(() => {
        // If thumbnail failed, attempt once to load original full-res src
        if (thumbnail && !useFallbackToOriginal) {
            setUseFallbackToOriginal(true);
            setLoaded(false);
            return;
        }
        setError(true);
        setLoaded(false);
    }, [thumbnail, useFallbackToOriginal]);

    const handleLoad = useCallback(() => {
        setLoaded(true);
        setError(false);
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Check cached images: when browser has image in memory, onLoad event might NOT fire!
    useEffect(() => {
        if (!isInView) return;

        const img = imgRef.current;
        if (img && img.complete) {
            if (img.naturalWidth > 0) {
                handleLoad();
            } else if (img.src) {
                handleError();
            }
        }
    }, [isInView, primaryUrl, handleLoad, handleError]);

    // Safety timeout: Never allow infinite loading/shimmering (> 9 seconds)
    useEffect(() => {
        if (!isInView || loaded || error || !primaryUrl) return;

        timeoutRef.current = window.setTimeout(() => {
            if (!loaded) {
                if (thumbnail && !useFallbackToOriginal) {
                    setUseFallbackToOriginal(true);
                } else {
                    setError(true);
                }
            }
        }, 9000);

        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isInView, primaryUrl, loaded, error, thumbnail, useFallbackToOriginal]);

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setError(false);
        setLoaded(false);
        setUseFallbackToOriginal(false);
        setRetryCount((c) => c + 1);
    };

    if (error || !src) {
        if (fallbackPlaceholder) {
            return <>{fallbackPlaceholder}</>;
        }
        return (
            <div
                className={`optimized-img-error-placeholder ${wrapperClassName}`}
                style={{
                    width: '100%',
                    height: '100%',
                    aspectRatio,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#121417',
                    border: '1px solid #1E232B',
                    color: '#64748b',
                    gap: '6px',
                    fontSize: '11px',
                    padding: '12px',
                    textAlign: 'center',
                    ...wrapperStyle,
                }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Image unavailable</span>
                {src && (
                    <button
                        type="button"
                        onClick={handleRetry}
                        style={{
                            background: '#1E2530',
                            border: '1px solid #2C3545',
                            color: '#38BDF8',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '2px',
                        }}
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            ref={wrapperRef}
            className={`optimized-img-wrapper ${wrapperClassName}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                aspectRatio,
                overflow: 'hidden',
                backgroundColor: '#0f1114',
                ...wrapperStyle,
            }}
        >
            {/* Shimmer skeleton while loading */}
            {!loaded && (
                <div
                    className="optimized-img-shimmer"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#16191e',
                        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'optImgShimmer 1.5s infinite linear',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                />
            )}

            {isInView && (
                <img
                    ref={imgRef}
                    src={primaryUrl}
                    alt={alt}
                    loading={loading}
                    decoding={decoding}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={className}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.24s ease-out',
                        ...style,
                    }}
                    {...rest}
                />
            )}

            <style>{`
                @keyframes optImgShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
}

export default OptimizedImage;
