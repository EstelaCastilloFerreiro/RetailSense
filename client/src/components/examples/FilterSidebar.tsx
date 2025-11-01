import FilterSidebar from "../FilterSidebar";

export default function FilterSidebarExample() {
  return (
    <div className="h-screen">
      <FilterSidebar
        onApplyFilters={(filters) => console.log("Filters:", filters)}
      />
    </div>
  );
}
