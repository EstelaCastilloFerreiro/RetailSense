import { motion } from "framer-motion";
import { useLanguage } from "@/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DashboardPreview() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.dashboard.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t.dashboard.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="aspect-video bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    {[
                      { label: "Ventas Netas", value: "€2.97M", color: "blue" },
                      { label: "Rotación", value: "15.2 días", color: "purple" },
                      { label: "Devoluciones", value: "8.2%", color: "pink" },
                      { label: "Stock", value: "5,165", color: "green" },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {stat.label}
                        </div>
                        <div className={`text-2xl font-bold text-${stat.color}-600`}>
                          {stat.value}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="forecasting">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="aspect-video bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
                  <div className="text-center space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Temporada PV27</div>
                    <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                      90.3% MAPE
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">
                      70,896 unidades predichas
                    </div>
                    <div className="flex gap-4 justify-center mt-6">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow">
                        <div className="text-xs text-gray-500">Modelo</div>
                        <div className="font-bold text-purple-600">CatBoost</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow">
                        <div className="text-xs text-gray-500">Cobertura</div>
                        <div className="font-bold text-green-600">99.8%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sentiment">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="aspect-video bg-gradient-to-br from-pink-50 via-white to-pink-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
                  <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">73%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Positivo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-600 mb-2">18%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Neutro</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600 mb-2">9%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Negativo</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </section>
  );
}
