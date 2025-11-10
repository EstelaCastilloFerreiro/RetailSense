import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MessageSquare, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: BarChart3,
      color: "bg-blue-500",
      title: t.features.analytics.title,
      description: t.features.analytics.description,
      features: t.features.analytics.features,
    },
    {
      icon: TrendingUp,
      color: "bg-purple-500",
      title: t.features.forecasting.title,
      description: t.features.forecasting.description,
      features: t.features.forecasting.features,
    },
    {
      icon: MessageSquare,
      color: "bg-pink-500",
      title: t.features.sentiment.title,
      description: t.features.sentiment.description,
      features: t.features.sentiment.features,
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-900" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.features.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t.features.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="p-8 h-full hover:shadow-xl transition-shadow duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                  <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
