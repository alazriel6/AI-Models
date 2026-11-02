import React, { useState, useEffect } from 'react';
import { isBackendOffline } from '../../api/client';
import { getIsDemoMode } from '../../api/models';

export interface BackendStatusBannerProps {
  message?: string;
  badgeText?: string;
  onRetry?: () => void;
  style?: React.CSSProperties;
  className?: string;
  forceShow?: boolean;
}

export function BackendStatusBanner({
  message = "Tak terhubung ke BE / Mode Frontend Aktif — Berjalan dengan dataset kurasi lokal.",
  badgeText = "MODE FE AKTIF",
  onRetry,
  style,
  className = "",
  forceShow,
}: BackendStatusBannerProps) {
  const [offline, setOffline] = useState<boolean>(() => {
    if (forceShow !== undefined) return forceShow;
    return isBackendOffline() || getIsDemoMode();
  });

  useEffect(() => {
    if (forceShow !== undefined) {
      setOffline(forceShow);
      return;
    }

    const check = () => {
      setOffline(isBackendOffline() || getIsDemoMode());
    };

    check();

    window.addEventListener('mg-backend-status', check);
    return () => {
      window.removeEventListener('mg-backend-status', check);
    };
  }, [forceShow]);

  if (!offline) return null;

  return (
    <div className={`catalog-demo-banner ${className}`} role="status" style={style}>
      <div className="demo-banner-content">
        <span className="demo-live-dot" aria-hidden="true" />
        <span className="demo-tag">{badgeText}</span>
        <span className="demo-message">{message}</span>
      </div>
      <button
        type="button"
        className="demo-reconnect-btn"
        onClick={() => {
          if (onRetry) {
            onRetry();
          } else {
            window.location.reload();
          }
        }}
        title="Periksa koneksi backend (localhost:8080)"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span>Cek Backend</span>
      </button>
    </div>
  );
}

