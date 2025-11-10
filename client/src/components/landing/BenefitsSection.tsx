import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";

export function BenefitsSection() {
  const { t } = useLanguage();

  const stats = [
    {
      title: t.benefits.reduction.title,
      description: t.benefits.reduction.description,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: t.benefits.accuracy.title,
      description: t.benefits.accuracy.description,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: t.benefits.time.title,
      description: t.benefits.time.description,
      color: "from-orange-500 to-red-500",
    },
    {
      title: t.benefits.coverage.title,
      description: t.benefits.coverage.description,
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.benefits.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t.benefits.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
                <div className="relative">
                  <div className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                    {stat.title}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {stat.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
