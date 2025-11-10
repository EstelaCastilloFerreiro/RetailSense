import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { PricingSection } from "@/components/landing/PricingSection";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <DashboardPreview />
      <BenefitsSection />
      <PricingSection />
      
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            KLOB
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 KLOB. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
