import React, { useState, useEffect, useMemo } from 'react';
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
 * Transforms an image URL to a high-efficiency compressed thumbnail URL
 * when hosted on the backend storage.
 */
export function getOptimizedImageUrl(rawUrl: string, thumbnail: boolean = false): string {
    const resolved = resolveImageUrl(rawUrl);
    if (!thumbnail || !resolved) return resolved;

    // If served from backend storage /storage/images/, route through /storage/thumbnails/
    if (resolved.includes('/storage/images/')) {
        return resolved.replace('/storage/images/', '/storage/thumbnails/');
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

    const primaryUrl = useMemo(() => {
        if (useFallbackToOriginal) {
            return resolveImageUrl(src);
        }
        return getOptimizedImageUrl(src, thumbnail);
    }, [src, thumbnail, useFallbackToOriginal]);

    // Reset loading state when src changes
    useEffect(() => {
        setLoaded(false);
        setError(false);
        setUseFallbackToOriginal(false);
    }, [src, thumbnail]);

    const handleError = () => {
        // If thumbnail failed, attempt once to load original src
        if (thumbnail && !useFallbackToOriginal) {
            setUseFallbackToOriginal(true);
            return;
        }
        setError(true);
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
                    color: '#64748b',
                    gap: '6px',
                    fontSize: '11px',
                    ...wrapperStyle,
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>No preview</span>
            </div>
        );
    }

    return (
        <div
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
                    }}
                />
            )}

            <img
                src={primaryUrl}
                alt={alt}
                loading={loading}
                decoding={decoding}
                onLoad={() => setLoaded(true)}
                onError={handleError}
                className={className}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.22s ease-in-out',
                    ...style,
                }}
                {...rest}
            />

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
