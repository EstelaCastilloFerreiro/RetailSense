import { motion } from "framer-motion";
import { ArrowRight, XCircle, CheckCircle, BarChart3, Brain, Database, Zap, MessageSquare, DollarSign } from "lucide-react";
import { useLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";

export function CompanyTypesSection() {
  const { t } = useLanguage();

  const aiCapabilities = [
    {
      icon: BarChart3,
      title: t.companyTypes.aiCapabilities.analytical.title,
      description: t.companyTypes.aiCapabilities.analytical.description,
    },
    {
      icon: Brain,
      title: t.companyTypes.aiCapabilities.aiModels.title,
      description: t.companyTypes.aiCapabilities.aiModels.description,
    },
    {
      icon: Database,
      title: t.companyTypes.aiCapabilities.dataIntegration.title,
      description: t.companyTypes.aiCapabilities.dataIntegration.description,
    },
    {
      icon: Zap,
      title: t.companyTypes.aiCapabilities.implementation.title,
      description: t.companyTypes.aiCapabilities.implementation.description,
    },
    {
      icon: MessageSquare,
      title: t.companyTypes.aiCapabilities.support.title,
      description: t.companyTypes.aiCapabilities.support.description,
    },
    {
      icon: DollarSign,
      title: t.companyTypes.aiCapabilities.pricing.title,
      description: t.companyTypes.aiCapabilities.pricing.description,
    },
  ];

  // Imágenes para el collage del "antes"
  const beforeImages = [
    "/images/before-1.jpg",
    "/images/before-2.jpg",
    "/images/before-3.jpg",
    "/images/before-4.jpg",
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-stone-50/30 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t.companyTypes.title} <span className="italic font-normal">{t.companyTypes.titleHighlight}</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-light max-w-3xl">
            {t.companyTypes.subtitle}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Lado izquierdo: Antes con collage de imágenes */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 border-2 border-red-200 dark:border-red-900/30 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {t.companyTypes.before.title}
                </h3>
              </div>
              
              {/* Collage de imágenes */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {beforeImages.map((img, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="relative h-32 rounded-lg overflow-hidden border-2 border-red-100 dark:border-red-900/20"
                  >
                    <img 
                      src={img}
                      alt={`Antes ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.className = parent.className + " bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20";
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              <p className="text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                {t.companyTypes.before.description}
              </p>
            </div>
          </motion.div>

          {/* Lado derecho: Con KLOB y capacidades de IA */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 border-2 border-purple-200 dark:border-purple-900/30 shadow-lg mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {t.companyTypes.after.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-light leading-relaxed mb-6">
                {t.companyTypes.after.description}
              </p>
            </div>

            {/* Capacidades de IA */}
            <div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t.companyTypes.aiCapabilities.title}
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {aiCapabilities.map((capability, index) => {
                  const Icon = capability.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-purple-100 dark:border-purple-900/20 hover:border-purple-300 dark:hover:border-purple-800/50 transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">
                            {capability.title}
                          </h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-light leading-relaxed mb-3">
                            {capability.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-0 h-auto text-xs font-medium"
                          >
                            {t.companyTypes.seeMore}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
