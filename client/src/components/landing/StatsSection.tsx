import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";

export function StatsSection() {
  const { t } = useLanguage();
  
  const stats = [
    {
      number: t.stats.freelancers.number,
      label: t.stats.freelancers.label,
    },
    {
      number: t.stats.companies.number,
      label: t.stats.companies.label,
    },
    {
      number: t.stats.experience.number,
      label: t.stats.experience.label,
    },
    {
      number: t.stats.active.number,
      label: t.stats.active.label,
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-bold text-purple-600 dark:text-purple-400 mb-4">
                {stat.number}
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-light">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

