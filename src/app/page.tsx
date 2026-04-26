import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import { PainSection } from "@/components/home/pain-section";
import { FeaturesSection } from "@/components/home/features-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { MoroccoSection } from "@/components/home/morocco-section";
import { PricingSection } from "@/components/home/pricing-section";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { SiteFooter } from "@/components/home/site-footer";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <PainSection />
        <FeaturesSection />
        <HowItWorks />
        <MoroccoSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
