import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";

export function FocusSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-to-br from-stone-50/30 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-light leading-relaxed">
            {t.focus.description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

