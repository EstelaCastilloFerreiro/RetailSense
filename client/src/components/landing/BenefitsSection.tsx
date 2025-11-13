import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";
import { ArrowRight } from "lucide-react";

export function BenefitsSection() {
  const { t } = useLanguage();

  const caseStudies = [
    {
      badge: t.caseStudies.biosmartdata.badge,
      title: t.caseStudies.biosmartdata.title,
      description: t.caseStudies.biosmartdata.description,
      image: "/case-studies/biosmartdata.jpg",
      accentColor: "purple",
    },
    {
      badge: t.caseStudies.civitatis.badge,
      title: t.caseStudies.civitatis.title,
      description: t.caseStudies.civitatis.description,
      image: "/case-studies/civitatis.jpg",
      accentColor: "purple",
    },
    {
      badge: t.caseStudies.crowdy.badge,
      title: t.caseStudies.crowdy.title,
      description: t.caseStudies.crowdy.description,
      image: "/case-studies/crowdy.jpg",
      accentColor: "purple",
    },
    {
      badge: t.caseStudies.telefonica.badge,
      title: t.caseStudies.telefonica.title,
      description: t.caseStudies.telefonica.description,
      image: "/case-studies/telefonica.jpg",
      accentColor: "purple",
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            <span className="italic font-normal">{t.caseStudies.title}</span> {t.caseStudies.titleHighlight}
          </h2>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer transition-colors mt-8">
            <span className="text-sm">{t.caseStudies.scrollText}</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {caseStudies.map((study, index) => {
            return (
              <motion.div
                key={index}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="border border-purple-200 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-800/50 overflow-hidden transition-all duration-300 bg-white dark:bg-gray-900 rounded-none h-full flex flex-col">
                  {/* Image placeholder - cuando subas las imágenes, reemplaza esto */}
                  <div className="aspect-video bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center">
                    <span className="text-sm text-purple-400 dark:text-purple-600">Imagen del caso de estudio</span>
                  </div>
                  {/* Cuando subas las imágenes, usa:
                  <img 
                    src={study.image} 
                    alt={study.title}
                    className="w-full h-48 object-cover"
                  />
                  */}
                  
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="mb-4">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        {study.badge}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                      {study.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 font-light mb-6 flex-grow">
                      {study.description}
                    </p>

                    <div className="flex items-center gap-2 group-hover:gap-3 transition-all text-purple-600 dark:text-purple-400">
                      <span className="text-sm font-medium">{t.caseStudies.readMore}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
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
