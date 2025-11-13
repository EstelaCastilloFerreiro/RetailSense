import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { KLOBAISection } from "@/components/landing/KLOBAISection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { TrustedCompaniesSection } from "@/components/landing/TrustedCompaniesSection";
import { useLanguage } from "@/i18n";
import { KLOBLogo } from "@/components/KLOBLogo";

export default function Landing() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <LandingNav />
      <HeroSection />
      <KLOBAISection />
      <FeaturesSection />
      <DashboardPreview />
      <TrustedCompaniesSection />
      
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            <div className="col-span-2">
              <KLOBLogo className="h-8 w-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-light mb-4">
                {t.footer.tagline}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t.footer.companies}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-light">
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.companiesLinks.hire}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.companiesLinks.manage}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.companiesLinks.payments}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t.footer.product}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-light">
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.productLinks.analytics}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.productLinks.forecasting}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.productLinks.sentiment}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t.footer.klob}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-light">
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.klobLinks.about}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.klobLinks.careers}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.klobLinks.faq}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.klobLinks.contact}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t.footer.resources}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-light">
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.resourcesLinks.guides}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.resourcesLinks.blog}</li>
                <li className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.resourcesLinks.cases}</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-500 text-center md:text-left font-light">
              {t.footer.rights}
            </p>
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500 font-light">
              <span className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.privacy}</span>
              <span className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.cookies}</span>
              <span className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors">{t.footer.terms}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
