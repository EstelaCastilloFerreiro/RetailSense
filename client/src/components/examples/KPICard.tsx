import KPICard from "../KPICard";

export default function KPICardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <KPICard
        label="Projected Demand"
        value={12450}
        change={12.5}
        changeLabel="vs last month"
        trend="up"
        format="number"
      />
      <KPICard
        label="Optimal Price"
        value={84.99}
        change={-2.3}
        changeLabel="recommended"
        trend="down"
        format="currency"
      />
      <KPICard
        label="Inventory Status"
        value={87}
        change={5.2}
        trend="up"
        format="percentage"
      />
      <KPICard
        label="Margin"
        value={42.5}
        trend="neutral"
        format="percentage"
      />
    </div>
  );
}
