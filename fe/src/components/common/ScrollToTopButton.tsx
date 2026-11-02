import React, { useState, useEffect, useRef } from 'react';
import './ScrollToTopButton.css';

/**
 * Universal Responsive Scroll-to-Top Button (High-Performance Hardware Composited)
 * Features:
 * - Dynamic scroll progress circular indicator directly updated on DOM via requestAnimationFrame (0 React re-renders during scroll)
 * - State update only on threshold transition (280px)
 * - Ultra-smooth cubic-bezier scale/fade transitions
 * - Mobile ergonomic touch target (min 48px hit area)
 * - Safe-area inset aware positioning
 */
export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);
  const indicatorRef = useRef<SVGCircleElement | null>(null);

  // SVG Progress Ring Calculations
  // Radius r = 18, Circumference = 2 * PI * 18 ≈ 113.097
  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

          // Only trigger React state change when crossing the 280px threshold!
          const shouldBeVisible = scrollTop > 280;
          if (shouldBeVisible !== isVisibleRef.current) {
            isVisibleRef.current = shouldBeVisible;
            setIsVisible(shouldBeVisible);
          }

          // Direct DOM style update for SVG progress ring - completely avoids React reconciliation on scroll!
          if (indicatorRef.current) {
            if (docHeight > 0) {
              const progress = Math.min(1, Math.max(0, scrollTop / docHeight));
              const offset = circumference - progress * circumference;
              indicatorRef.current.style.strokeDashoffset = `${offset}px`;
            } else {
              indicatorRef.current.style.strokeDashoffset = `${circumference}px`;
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [circumference]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      className={`scroll-to-top-btn ${isVisible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Kembali ke paling atas"
      title="Kembali ke paling atas"
    >
      <svg
        className="scroll-progress-ring"
        width="44"
        height="44"
        viewBox="0 0 44 44"
        aria-hidden="true"
      >
        {/* Background Track */}
        <circle
          className="scroll-progress-track"
          cx="22"
          cy="22"
          r={radius}
        />
        {/* Active Progress Line */}
        <circle
          ref={indicatorRef}
          className="scroll-progress-indicator"
          cx="22"
          cy="22"
          r={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference,
          }}
        />
      </svg>

      <span className="scroll-arrow-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </span>
    </button>
  );
};

export default ScrollToTopButton;

