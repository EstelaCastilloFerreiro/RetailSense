import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";

export function TrustedCompaniesSection() {
  const { t } = useLanguage();
  
  const companies = [
    { name: "Trucco", logo: "/logos/trucco.svg" },
    { name: "Naelle", logo: "/logos/naelle.svg" },
    { name: "Byniumaal", logo: "/logos/byniumaal.svg" },
    { name: "Cinzia Cortesi", logo: "/logos/cinzia-cortesi.svg" },
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
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-12 tracking-tight text-center">
            {t.trustedCompanies.newTitle}
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
          {companies.map((company, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-center justify-center"
            >
              <div className="w-full max-w-[180px] h-20 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center p-4 hover:scale-105 transition-all duration-300">
                <img 
                  src={company.logo} 
                  alt={`${company.name} logo`}
                  className="max-h-full w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-sm text-gray-400">${company.name}</span>`;
                    }
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

