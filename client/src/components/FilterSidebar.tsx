import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface FilterGroup {
  label: string;
  options: string[];
}

interface FilterSidebarProps {
  onApplyFilters?: (filters: Record<string, string[]>) => void;
}

export default function FilterSidebar({ onApplyFilters }: FilterSidebarProps) {
  const filterGroups: FilterGroup[] = [
    {
      label: "Store",
      options: ["Madrid Central", "Barcelona Norte", "Valencia Sur", "Sevilla Este"],
    },
    {
      label: "Season",
      options: ["Spring 2024", "Summer 2024", "Fall 2024", "Winter 2024"],
    },
    {
      label: "Family",
      options: ["Apparel", "Footwear", "Accessories", "Home & Living"],
    },
    {
      label: "Product",
      options: ["T-Shirts", "Jeans", "Sneakers", "Bags", "Jackets"],
    },
  ];

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    {}
  );
  const [openSections, setOpenSections] = useState<string[]>(
    filterGroups.map((g) => g.label)
  );

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleCheckboxChange = (group: string, option: string) => {
    setSelectedFilters((prev) => {
      const current = prev[group] || [];
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [group]: updated };
    });
  };

  const handleApply = () => {
    console.log("Filters applied:", selectedFilters);
    onApplyFilters?.(selectedFilters);
  };

  const handleReset = () => {
    setSelectedFilters({});
    console.log("Filters reset");
  };

  const getSelectedCount = (group: string) => {
    return selectedFilters[group]?.length || 0;
  };

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Filters</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Refine your data view
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {filterGroups.map((group) => (
          <Collapsible
            key={group.label}
            open={openSections.includes(group.label)}
            onOpenChange={() => toggleSection(group.label)}
          >
            <CollapsibleTrigger className="w-full" data-testid={`button-toggle-${group.label.toLowerCase()}`}>
              <div className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium uppercase tracking-wide">
                    {group.label}
                  </span>
                  {getSelectedCount(group.label) > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      {getSelectedCount(group.label)}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openSections.includes(group.label) ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 pl-2">
              {group.options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`${group.label}-${option}`}
                    checked={selectedFilters[group.label]?.includes(option)}
                    onCheckedChange={() =>
                      handleCheckboxChange(group.label, option)
                    }
                    data-testid={`checkbox-${group.label.toLowerCase()}-${option.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <Label
                    htmlFor={`${group.label}-${option}`}
                    className="text-sm cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={handleApply}
          data-testid="button-apply-filters"
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleReset}
          data-testid="button-reset-filters"
        >
          Reset All
        </Button>
      </div>
    </div>
  );
}
