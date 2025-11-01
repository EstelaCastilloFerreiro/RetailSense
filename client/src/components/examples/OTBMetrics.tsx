import OTBMetrics from "../OTBMetrics";

export default function OTBMetricsExample() {
  const metrics = [
    { label: "Options", value: 245 },
    { label: "Depth", value: "3.2" },
    { label: "Units", value: 12450 },
    { label: "Total PVP", value: "€184,500" },
    { label: "Total Cost", value: "€106,050" },
    { label: "Markdown", value: "18%", unit: "" },
  ];

  return (
    <div className="p-6">
      <OTBMetrics metrics={metrics} />
    </div>
  );
}
