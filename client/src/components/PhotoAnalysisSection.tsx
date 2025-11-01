import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import VisualizationCard from "./VisualizationCard";
import { Card } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";

interface PhotoAnalysisData {
  topMasVendidos: Array<{
    codigoBase: string;
    familia: string;
    cantidad: number;
    urlImage: string | null;
  }>;
  topMenosVendidos: Array<{
    codigoBase: string;
    familia: string;
    cantidad: number;
    urlImage: string | null;
  }>;
}

export default function PhotoAnalysisSection() {
  const { fileId, filters } = useData();
  const [familiaFilter, setFamiliaFilter] = useState<string>('all');

  // Fetch available families for the filter
  const { data: filtersData } = useQuery({
    queryKey: ['/api/filters', fileId],
    enabled: !!fileId,
  });

  const stableFilters = useMemo(() => {
    const cleaned: Record<string, any> = {};
    
    if (filters.temporada) cleaned.temporada = filters.temporada;
    if (filters.familia) cleaned.familia = filters.familia;
    if (filters.tiendas && filters.tiendas.length > 0) cleaned.tiendas = filters.tiendas;
    if (filters.fechaInicio) cleaned.fechaInicio = filters.fechaInicio;
    if (filters.fechaFin) cleaned.fechaFin = filters.fechaFin;
    if (familiaFilter && familiaFilter !== 'all') cleaned.familiaFilter = familiaFilter;
    
    return cleaned;
  }, [
    filters.temporada,
    filters.familia,
    filters.tiendas?.join(','),
    filters.fechaInicio,
    filters.fechaFin,
    familiaFilter,
  ]);

  const { data, isLoading, error } = useQuery<PhotoAnalysisData>({
    queryKey: ['/api/dashboard-photos', fileId, stableFilters],
    enabled: !!fileId,
  });

  if (!fileId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Sube un archivo Excel para comenzar</p>
      </div>
    );
  }

  const ImageCard = ({ item, index, testId }: { item: any, index: number, testId: string }) => (
    <Card className="p-4" data-testid={testId}>
      <div className="aspect-square mb-3 bg-muted rounded-md overflow-hidden flex items-center justify-center">
        {item.urlImage ? (
          <img
            src={item.urlImage}
            alt={item.codigoBase}
            className="w-full h-full object-cover"
            data-testid={`${testId}-image`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={item.urlImage ? 'hidden' : ''}>
          <Package className="h-12 w-12 text-muted-foreground" data-testid={`${testId}-placeholder`} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground" data-testid={`${testId}-codigo`}>{item.codigoBase}</p>
        <p className="text-sm font-medium" data-testid={`${testId}-familia`}>{item.familia}</p>
        <p className="text-xs" data-testid={`${testId}-cantidad`}>
          <span className="font-semibold">{formatNumber(item.cantidad)}</span>
          <span className="text-muted-foreground ml-1">unidades</span>
        </p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filtro adicional de familia */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label htmlFor="familia-filter" className="text-sm font-medium whitespace-nowrap">
            Filtrar por familia:
          </label>
          <Select value={familiaFilter} onValueChange={setFamiliaFilter}>
            <SelectTrigger id="familia-filter" className="w-full md:w-64" data-testid="select-familia-filter">
              <SelectValue placeholder="Todas las familias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="select-familia-all">Todas las familias</SelectItem>
              {filtersData?.familias?.map((familia: string, index: number) => (
                <SelectItem key={familia} value={familia} data-testid={`select-familia-${index}`}>
                  {familia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="p-6 max-w-md">
            <p className="text-destructive font-medium mb-2">Error al cargar datos</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Error desconocido"}
            </p>
          </Card>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">No hay datos disponibles</p>
        </div>
      ) : (
        <>
          {/* Top 20 Más Vendidos */}
          <VisualizationCard title="Top 20 Productos Más Vendidos" id="top-mas-vendidos">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="grid-mas-vendidos">
              {data.topMasVendidos.map((item, index) => (
                <ImageCard
                  key={item.codigoBase}
                  item={item}
                  index={index}
                  testId={`card-mas-vendido-${index}`}
                />
              ))}
            </div>
          </VisualizationCard>

          {/* Top 20 Menos Vendidos */}
          <VisualizationCard title="Top 20 Productos Menos Vendidos" id="top-menos-vendidos">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="grid-menos-vendidos">
              {data.topMenosVendidos.map((item, index) => (
                <ImageCard
                  key={item.codigoBase}
                  item={item}
                  index={index}
                  testId={`card-menos-vendido-${index}`}
                />
              ))}
            </div>
          </VisualizationCard>
        </>
      )}
    </div>
  );
}
