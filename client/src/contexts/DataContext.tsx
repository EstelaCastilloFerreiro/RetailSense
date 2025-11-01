import { createContext, useContext, useState, ReactNode } from 'react';

interface DataContextType {
  fileId: string | null;
  setFileId: (id: string | null) => void;
  filters: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
    fechaInicio?: string;
    fechaFin?: string;
    modoTienda?: string;
  };
  setFilters: (filters: DataContextType['filters']) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [fileId, setFileId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DataContextType['filters']>({});

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <DataContext.Provider value={{ 
      fileId, 
      setFileId, 
      filters, 
      setFilters, 
      updateFilter,
      clearFilters 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
