import { useCallback } from 'react';
import { HeroSection } from './HeroSection';
import { EditorialStatement } from './EditorialStatement';
import { ShowcaseSection } from './ShowcaseSection';
import { FeatureStorytelling } from './FeatureStorytelling';
import { TechnicalDetailsSection } from './TechnicalDetailsSection';
import { FinalCtaSection } from './FinalCtaSection';
import { LandingFooter } from './LandingFooter';
import '../../style/landing.css';

export function LandingPage() {
  const handleScrollToOverview = useCallback(() => {
    const target = document.getElementById('editorial-statement');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="mg-landing-root">
      {/* SECTION B: Cinematic Hero with Multi-Layered Rain */}
      <HeroSection onDiscoverClick={handleScrollToOverview} />

      {/* SECTION C: Introductory Editorial Statement */}
      <EditorialStatement />

      {/* SECTION D: Model Library Showcase */}
      <ShowcaseSection />

      {/* SECTION E & F: Feature Storytelling & Scroll-Driven Narrative */}
      <FeatureStorytelling />

      {/* SECTION G: Technical Details, VRAM Matrix & Sampling Baselines */}
      <TechnicalDetailsSection />

      {/* SECTION H: Final Call to Action */}
      <FinalCtaSection />

      {/* Compact Editorial Footer */}
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
