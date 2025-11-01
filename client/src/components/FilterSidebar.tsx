import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useQuery } from "@tanstack/react-query";

interface FilterSidebarProps {
  onApplyFilters?: () => void;
}

export default function FilterSidebar({ onApplyFilters }: FilterSidebarProps) {
  const { fileId, filters, updateFilter, clearFilters } = useData();
  const [openSections, setOpenSections] = useState<string[]>(["Temporada", "Familia", "Tiendas"]);

  const { data: availableFilters, isLoading } = useQuery<{
    temporadas: string[];
    familias: string[];
    tiendas: string[];
    tiendasOnline: string[];
    tiendasNaelle: string[];
    tiendasItalia: string[];
  }>({
    queryKey: ["/api/filters", fileId],
    enabled: !!fileId,
  });

  const [selectedTiendas, setSelectedTiendas] = useState<string[]>([]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleTiendaToggle = (tienda: string) => {
    setSelectedTiendas(prev =>
      prev.includes(tienda) ? prev.filter(t => t !== tienda) : [...prev, tienda]
    );
  };

  const handleApply = () => {
    if (selectedTiendas.length > 0) {
      updateFilter('tiendas', selectedTiendas);
    }
    onApplyFilters?.();
  };

  const handleReset = () => {
    clearFilters();
    setSelectedTiendas([]);
  };

  if (!fileId) {
    return (
      <div className="w-64 h-full bg-sidebar border-r border-sidebar-border p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Sube un archivo para aplicar filtros
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-64 h-full bg-sidebar border-r border-sidebar-border p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Filtros</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Refina tu vista de datos
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium uppercase tracking-wide">Temporada</Label>
          <Select
            value={filters.temporada || ""}
            onValueChange={(value) => updateFilter('temporada', value === 'all' ? undefined : value)}
          >
            <SelectTrigger data-testid="select-temporada">
              <SelectValue placeholder="Todas las temporadas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las temporadas</SelectItem>
              {availableFilters?.temporadas.map((temp: string) => (
                <SelectItem key={temp} value={temp}>{temp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium uppercase tracking-wide">Familia</Label>
          <Select
            value={filters.familia || ""}
            onValueChange={(value) => updateFilter('familia', value === 'all' ? undefined : value)}
          >
            <SelectTrigger data-testid="select-familia">
              <SelectValue placeholder="Todas las familias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias</SelectItem>
              <SelectItem value="Todas sin GR.ART.FICTICIO">Todas sin GR.ART.FICTICIO</SelectItem>
              {availableFilters?.familias.map((fam: string) => (
                <SelectItem key={fam} value={fam}>{fam}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible
          open={openSections.includes("Tiendas")}
          onOpenChange={() => toggleSection("Tiendas")}
        >
          <CollapsibleTrigger className="w-full" data-testid="button-toggle-tiendas">
            <div className="flex items-center justify-between w-full py-2 hover-elevate rounded-md px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium uppercase tracking-wide">
                  Tiendas
                </span>
                {selectedTiendas.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    {selectedTiendas.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  openSections.includes("Tiendas") ? "rotate-180" : ""
                }`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 pl-2 max-h-64 overflow-y-auto">
            {availableFilters?.tiendas.slice(0, 20).map((tienda: string) => (
              <div key={tienda} className="flex items-center gap-2">
                <Checkbox
                  id={`tienda-${tienda}`}
                  checked={selectedTiendas.includes(tienda)}
                  onCheckedChange={() => handleTiendaToggle(tienda)}
                  data-testid={`checkbox-tienda-${tienda.toLowerCase().replace(/\s+/g, "-")}`}
                />
                <Label
                  htmlFor={`tienda-${tienda}`}
                  className="text-sm cursor-pointer"
                >
                  {tienda}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={handleApply}
          data-testid="button-apply-filters"
        >
          Aplicar Filtros
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleReset}
          data-testid="button-reset-filters"
        >
          Resetear
        </Button>
      </div>
    </div>
  );
}
