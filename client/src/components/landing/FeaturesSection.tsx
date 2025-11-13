import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MessageSquare, ArrowRight, Brain, Database, Zap, DollarSign, X, CheckCircle2, Sparkles, TrendingDown, Users, BarChart, Filter, Zap as ZapIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function FeaturesSection() {
  const { t } = useLanguage();
  const [openModal, setOpenModal] = useState<number | null>(null);

  const features = [
    {
      icon: BarChart3,
      category: "Function",
      title: t.features.analytics.title,
      description: t.features.analytics.description,
      features: t.features.analytics.features,
      accentColor: "purple",
      color: "purple",
      detailedInfo: {
        title: t.features.analytics.title,
        description: t.features.analytics.detailedDescription || t.features.analytics.description,
        highlights: [
          { icon: Filter, text: t.features.analytics.highlights?.filters || "Filtros dinámicos multidimensionales", color: "purple" },
          { icon: BarChart, text: t.features.analytics.highlights?.visualizations || "Visualizaciones interactivas expandibles", color: "emerald" },
          { icon: ZapIcon, text: t.features.analytics.highlights?.detection || "Detección automática de estructura Excel", color: "amber" },
          { icon: TrendingUp, text: t.features.analytics.highlights?.kpis || "KPIs de retail listos para usar", color: "blue" },
        ],
      },
    },
    {
      icon: TrendingUp,
      category: "Function",
      title: t.features.forecasting.title,
      description: t.features.forecasting.description,
      features: t.features.forecasting.features,
      accentColor: "purple",
      color: "emerald",
      detailedInfo: {
        title: t.features.forecasting.title,
        description: t.features.forecasting.detailedDescription || t.features.forecasting.description,
        highlights: [
          { icon: Brain, text: t.features.forecasting.highlights?.ensemble || "Ensemble de 4 algoritmos de ML", color: "purple" },
          { icon: Sparkles, text: t.features.forecasting.highlights?.season || "Detección automática de temporada", color: "emerald" },
          { icon: CheckCircle2, text: t.features.forecasting.highlights?.plan || "Plan de compras personalizado", color: "blue" },
          { icon: TrendingDown, text: t.features.forecasting.highlights?.metrics || "Métricas de confianza (MAPE, MAE, RMSE)", color: "amber" },
        ],
      },
    },
    {
      icon: MessageSquare,
      category: "Function",
      title: t.features.sentiment.title,
      description: t.features.sentiment.description,
      features: t.features.sentiment.features,
      accentColor: "purple",
      color: "blue",
      detailedInfo: {
        title: t.features.sentiment.title,
        description: t.features.sentiment.detailedDescription || t.features.sentiment.description,
        highlights: [
          { icon: Brain, text: t.features.sentiment.highlights?.classification || "Clasificación de sentimiento con OpenAI", color: "purple" },
          { icon: Sparkles, text: t.features.sentiment.highlights?.topics || "Detección automática de temas", color: "emerald" },
          { icon: Users, text: t.features.sentiment.highlights?.integration || "Integración con redes sociales", color: "blue" },
          { icon: TrendingDown, text: t.features.sentiment.highlights?.alerts || "Alertas de comentarios negativos", color: "red" },
        ],
      },
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight max-w-4xl">
            {t.features.title} <span className="italic font-normal">{t.features.subtitle}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isPurple = feature.accentColor === "purple";
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <Card className={`p-8 h-full border transition-all duration-300 bg-white dark:bg-gray-900 rounded-none hover:shadow-lg ${
                  isPurple 
                    ? "border-purple-200 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-800/50" 
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                }`}>
                  <div className={`mb-6 w-14 h-14 rounded-lg flex items-center justify-center ${
                    isPurple 
                      ? "bg-purple-100 dark:bg-purple-900/20" 
                      : "bg-stone-100 dark:bg-stone-900/20"
                  }`}>
                    <Icon className={`h-7 w-7 ${
                      isPurple 
                        ? "text-purple-600 dark:text-purple-400" 
                        : "text-stone-600 dark:text-stone-400"
                    }`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 tracking-tight text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 font-light leading-relaxed text-base">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3 mb-6">
                    {feature.features.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className={`mt-1 ${
                          isPurple 
                            ? "text-purple-500 dark:text-purple-500" 
                            : "text-stone-500 dark:text-stone-500"
                        }`}>•</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-light">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setOpenModal(index)}
                    className="flex items-center gap-2 group-hover:gap-3 transition-all text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer"
                  >
                    <span className="text-sm font-medium">{t.features.learnMore}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Capacidades de IA incluidas - Subsección */}
        <div className="mt-24 pt-24 border-t border-gray-200 dark:border-gray-800">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              {t.companyTypes.aiCapabilities.title}
            </h3>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
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
            ].map((capability, index) => {
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
                    <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-gray-900 dark:text-white mb-2">
                        {capability.title}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-light leading-relaxed mb-4">
                        {capability.description}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-0 h-auto text-sm font-medium"
                      >
                        {t.companyTypes.seeMore}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal detallado */}
      <Dialog open={openModal !== null} onOpenChange={(open) => !open && setOpenModal(null)}>
        {openModal !== null && (
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-8">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-4">
                {features[openModal] && (() => {
                  const FeatureIcon = features[openModal].icon;
                  return (
                    <>
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                        features[openModal].color === "purple" 
                          ? "bg-purple-100 dark:bg-purple-900/20" 
                          : features[openModal].color === "emerald"
                          ? "bg-emerald-100 dark:bg-emerald-900/20"
                          : "bg-blue-100 dark:bg-blue-900/20"
                      }`}>
                        {FeatureIcon && (
                          <FeatureIcon className={`h-8 w-8 ${
                            features[openModal].color === "purple"
                              ? "text-purple-600 dark:text-purple-400"
                              : features[openModal].color === "emerald"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`} />
                        )}
                      </div>
                      <div>
                        <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                          {features[openModal].detailedInfo.title}
                        </DialogTitle>
                      </div>
                    </>
                  );
                })()}
              </div>
              <DialogDescription className="text-lg text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                {features[openModal]?.detailedInfo.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {features[openModal]?.detailedInfo.highlights.map((highlight, idx) => {
                const HighlightIcon = highlight.icon;
                const colorClasses = {
                  purple: "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                  emerald: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
                  amber: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
                  blue: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
                  red: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
                };
                const iconColorClasses = {
                  purple: "text-purple-600 dark:text-purple-400",
                  emerald: "text-emerald-600 dark:text-emerald-400",
                  amber: "text-amber-600 dark:text-amber-400",
                  blue: "text-blue-600 dark:text-blue-400",
                  red: "text-red-600 dark:text-red-400",
                };

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${colorClasses[highlight.color as keyof typeof colorClasses] || colorClasses.purple}`}
                  >
                    <div className="flex items-start gap-3">
                      <HighlightIcon className={`h-6 w-6 mt-0.5 flex-shrink-0 ${iconColorClasses[highlight.color as keyof typeof iconColorClasses] || iconColorClasses.purple}`} />
                      <p className="font-medium leading-relaxed">{highlight.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
