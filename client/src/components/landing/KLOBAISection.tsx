import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, BarChart3, MessageSquare } from "lucide-react";
import { useLanguage } from "@/i18n";

export function KLOBAISection() {
  const { t } = useLanguage();

  const aiFeatures = [
    {
      icon: TrendingUp,
      title: t.klobAI.features.klobAI.title,
      description: t.klobAI.features.klobAI.description,
      accentColor: "purple",
    },
    {
      icon: BarChart3,
      title: t.klobAI.features.talentInsight.title,
      description: t.klobAI.features.talentInsight.description,
      accentColor: "purple",
    },
    {
      icon: MessageSquare,
      title: t.klobAI.features.verified.title,
      description: t.klobAI.features.verified.description,
      accentColor: "purple",
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            {t.klobAI.title} <span className="italic font-normal">{t.klobAI.titleHighlight}</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 font-light leading-relaxed max-w-4xl">
            {t.klobAI.focus}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="border border-purple-200 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-800/50 p-8 hover:border-opacity-100 transition-all duration-300 bg-white dark:bg-gray-900 rounded-none h-full flex flex-col">
                  <div className="mb-6 w-16 h-16 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-4 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 font-light mb-6 flex-grow leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="flex items-center gap-2 group-hover:gap-3 transition-all text-purple-600 dark:text-purple-400">
                    <span className="text-sm font-medium">{t.klobAI.learnMore}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

