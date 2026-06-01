import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import { PainSection } from "@/components/home/pain-section";
import { ConvictionSection } from "@/components/home/conviction-section";
import { SpeakingGap } from "@/components/home/speaking-gap";
import { FeaturesSection } from "@/components/home/features-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { MoroccoSection } from "@/components/home/morocco-section";
import { PricingSection } from "@/components/home/pricing-section";
import { FounderOffer } from "@/components/home/founder-offer";
import { FaqSection } from "@/components/home/faq-section";
import { StakesSection } from "@/components/home/stakes-section";
import { FinalCta } from "@/components/home/final-cta";
import { SiteFooter } from "@/components/home/site-footer";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <PainSection />
        <ConvictionSection />
        <HowItWorks />
        {/*<SpeakingGap />*/}
        <FeaturesSection />
        {/*<MoroccoSection />*/}
        {/*<PricingSection />*/}
        <FaqSection />
        <FounderOffer />
        <StakesSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
