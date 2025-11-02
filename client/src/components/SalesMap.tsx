import { useMemo, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CHART_COLORS, getValueColor } from '@/lib/colors';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPoint {
  tienda?: string;
  ciudad?: string;
  lat: number;
  lon: number;
  cantidad: number;
  beneficio: number;
}

interface SalesMapProps {
  points: MapPoint[];
  center: [number, number];
  zoom: number;
  title: string;
  type: 'espana' | 'italia';
}

export default function SalesMap({ points, center, zoom, title, type }: SalesMapProps) {
  // Normalize sizes for better visualization
  const maxCantidad = useMemo(() => {
    return Math.max(...points.map(p => p.cantidad), 1);
  }, [points]);

  const minCantidad = useMemo(() => {
    return Math.min(...points.map(p => p.cantidad), 1);
  }, [points]);

  // Get color based on value - solo máximo verde oscuro, mínimo granate, resto marrón clarito
  const getColor = (cantidad: number) => {
    return getValueColor(cantidad, minCantidad, maxCantidad);
  };

  // Calculate radius based on quantity
  const getRadius = (cantidad: number) => {
    const baseRadius = 20000; // Base radius in meters
    const ratio = Math.sqrt(cantidad / maxCantidad); // Use sqrt for better visual distribution
    return Math.max(10000, baseRadius * ratio);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No hay datos geográficos disponibles</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, index) => {
          const color = getColor(point.cantidad);
          const radius = getRadius(point.cantidad);
          const label = type === 'espana' ? point.tienda : point.ciudad;

          return (
            <Fragment key={index}>
              <Circle
                center={[point.lat, point.lon]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.6,
                  color: color,
                  weight: 2,
                }}
              />
              <Marker position={[point.lat, point.lon]}>
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-sm mb-2">{label || 'N/A'}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cantidad:</span>
                        <span className="font-mono font-semibold">{formatNumber(point.cantidad)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Beneficio:</span>
                        <span className="font-mono font-semibold">{formatCurrency(point.beneficio)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

