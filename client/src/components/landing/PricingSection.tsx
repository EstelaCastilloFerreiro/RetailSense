import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n";

export function PricingSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-to-b from-stone-50/50 to-white dark:from-gray-900 dark:to-gray-950 relative overflow-hidden" id="pricing">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            <span className="italic font-normal">{t.pricing.title}</span> {t.pricing.titleHighlight}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-light mb-8">
            {t.pricing.description}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {[1, 2, 3].map((item, i) => {
            const isPurple = i === 0 || i === 2;
            return (
              <div
                key={i}
                className={`border p-8 hover:border-opacity-100 transition-all duration-300 bg-white dark:bg-gray-950 rounded-none cursor-pointer group ${
                  isPurple 
                    ? "border-purple-200 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-800/50" 
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                }`}
              >
                <div className={`aspect-video mb-6 flex items-center justify-center ${
                  isPurple 
                    ? "bg-purple-50 dark:bg-purple-900/10" 
                    : "bg-stone-50 dark:bg-stone-900/10"
                }`}>
                  <div className={`text-sm font-light ${
                    isPurple 
                      ? "text-purple-400 dark:text-purple-600" 
                      : "text-stone-400 dark:text-stone-600"
                  }`}>Resource Image</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                  {t.pricing.resourceTitle} {item}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-light mb-6">
                  {t.pricing.resourceDescription}
                </p>
                <div className={`flex items-center gap-2 group-hover:gap-3 transition-all ${
                  isPurple 
                    ? "text-purple-600 dark:text-purple-400" 
                    : "text-stone-600 dark:text-stone-400"
                }`}>
                  <span className="text-sm font-medium">{t.pricing.readMore}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg h-auto font-medium rounded-none"
              data-testid="button-pricing-cta"
            >
              {t.pricing.getStarted}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
