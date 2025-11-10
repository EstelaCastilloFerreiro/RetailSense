import {
  type UploadedFile,
  type InsertUploadedFile,
  type ClientConfig,
  type InsertClientConfig,
  type VentasData,
  type ProductosData,
  type TraspasosData,
  type ForecastJob,
  type InsertForecastJob,
  type SentimentData,
  type InsertSentiment,
  uploadedFiles,
  clientConfigs,
  ventasData,
  productosData,
  traspasosData,
  forecastJobs,
  sentimentsData,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Helper function to normalize database rows by converting null to undefined
// and removing technical columns (id, fileId)
function normalizeRow<T>(row: any, columnsToRemove: string[] = []): T {
  const normalized: any = {};
  for (const [key, value] of Object.entries(row)) {
    if (!columnsToRemove.includes(key)) {
      normalized[key] = value === null ? undefined : value;
    }
  }
  return normalized as T;
}

export interface IStorage {
  // File uploads
  saveUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFiles(clientId: string): Promise<UploadedFile[]>;
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;

  // Client configurations
  saveClientConfig(config: InsertClientConfig): Promise<ClientConfig>;
  getClientConfig(clientId: string): Promise<ClientConfig | undefined>;

  // Data storage
  saveVentasData(fileId: string, data: VentasData[]): Promise<void>;
  getVentasData(fileId: string, seasonType?: 'PV' | 'OI'): Promise<VentasData[]>;
  getUniqueSeasons(fileId: string): Promise<string[]>;
  
  saveProductosData(fileId: string, data: ProductosData[]): Promise<void>;
  getProductosData(fileId: string): Promise<ProductosData[]>;
  
  saveTraspasosData(fileId: string, data: TraspasosData[]): Promise<void>;
  getTraspasosData(fileId: string): Promise<TraspasosData[]>;

  // Forecast jobs
  saveForecastJob(job: InsertForecastJob): Promise<ForecastJob>;
  getForecastJob(id: string): Promise<ForecastJob | undefined>;
  getForecastJobsByFileId(fileId: string): Promise<ForecastJob[]>;
  updateForecastJob(id: string, updates: Partial<ForecastJob>): Promise<ForecastJob | undefined>;
  
  // Sentiment analysis
  saveSentimentData(data: InsertSentiment[]): Promise<void>;
  getSentimentData(clientId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    canal?: string;
    tema?: string;
  }): Promise<SentimentData[]>;
  deleteSentimentData(clientId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private uploadedFiles: Map<string, UploadedFile>;
  private clientConfigs: Map<string, ClientConfig>;
  private ventasData: Map<string, VentasData[]>;
  private productosData: Map<string, ProductosData[]>;
  private traspasosData: Map<string, TraspasosData[]>;
  private forecastJobs: Map<string, ForecastJob>;
  private sentimentsData: Map<string, SentimentData[]>;

  constructor() {
    this.uploadedFiles = new Map();
    this.clientConfigs = new Map();
    this.ventasData = new Map();
    this.productosData = new Map();
    this.traspasosData = new Map();
    this.forecastJobs = new Map();
    this.sentimentsData = new Map();
  }

  async saveUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const id = randomUUID();
    const uploadedFile: UploadedFile = { ...file, id };
    this.uploadedFiles.set(id, uploadedFile);
    return uploadedFile;
  }

  async getUploadedFiles(clientId: string): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values()).filter(
      (file) => file.clientId === clientId
    );
  }

  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async saveClientConfig(config: InsertClientConfig): Promise<ClientConfig> {
    this.clientConfigs.set(config.clientId, config);
    return config;
  }

  async getClientConfig(clientId: string): Promise<ClientConfig | undefined> {
    return this.clientConfigs.get(clientId);
  }

  async saveVentasData(fileId: string, data: VentasData[]): Promise<void> {
    this.ventasData.set(fileId, data);
  }

  async getVentasData(fileId: string, seasonType?: 'PV' | 'OI'): Promise<VentasData[]> {
    const allVentas = this.ventasData.get(fileId) || [];
    
    if (!seasonType) {
      return allVentas;
    }
    
    // Filter by season type
    return allVentas.filter(v => {
      if (!v.temporada) return false;
      
      // Support format 1: "24PV", "25OI"
      const match1 = v.temporada.match(/^(\d{2})(PV|OI)$/);
      if (match1 && match1[2] === seasonType) return true;
      
      // Support format 2: "V2025", "I2026"
      const match2 = v.temporada.match(/^(V|I)(\d{4})$/);
      if (match2) {
        const season = match2[1] === 'V' ? 'PV' : 'OI';
        return season === seasonType;
      }
      
      return false;
    });
  }

  async getUniqueSeasons(fileId: string): Promise<string[]> {
    const ventas = this.ventasData.get(fileId) || [];
    const seasons = new Set<string>();
    ventas.forEach(v => {
      if (v.temporada) seasons.add(v.temporada);
    });
    return Array.from(seasons);
  }

  async saveProductosData(fileId: string, data: ProductosData[]): Promise<void> {
    this.productosData.set(fileId, data);
  }

  async getProductosData(fileId: string): Promise<ProductosData[]> {
    return this.productosData.get(fileId) || [];
  }

  async saveTraspasosData(fileId: string, data: TraspasosData[]): Promise<void> {
    this.traspasosData.set(fileId, data);
  }

  async getTraspasosData(fileId: string): Promise<TraspasosData[]> {
    return this.traspasosData.get(fileId) || [];
  }

  async saveForecastJob(job: InsertForecastJob): Promise<ForecastJob> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const forecastJob: ForecastJob = { ...job, id, createdAt };
    this.forecastJobs.set(id, forecastJob);
    return forecastJob;
  }

  async getForecastJob(id: string): Promise<ForecastJob | undefined> {
    return this.forecastJobs.get(id);
  }

  async getForecastJobsByFileId(fileId: string): Promise<ForecastJob[]> {
    return Array.from(this.forecastJobs.values()).filter(
      (job) => job.fileId === fileId
    );
  }

  async updateForecastJob(id: string, updates: Partial<ForecastJob>): Promise<ForecastJob | undefined> {
    const existingJob = this.forecastJobs.get(id);
    if (!existingJob) return undefined;

    const updatedJob = { ...existingJob, ...updates };
    this.forecastJobs.set(id, updatedJob);
    return updatedJob;
  }

  async saveSentimentData(data: InsertSentiment[]): Promise<void> {
    if (data.length === 0) return;
    
    const clientId = data[0].clientId;
    const existing = this.sentimentsData.get(clientId) || [];
    const newData = data.map(item => ({
      ...item,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    
    this.sentimentsData.set(clientId, [...existing, ...newData]);
  }

  async getSentimentData(clientId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    canal?: string;
    tema?: string;
  }): Promise<SentimentData[]> {
    let data = this.sentimentsData.get(clientId) || [];
    
    if (filters) {
      if (filters.dateFrom) {
        data = data.filter(d => d.fecha >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        data = data.filter(d => d.fecha <= filters.dateTo!);
      }
      if (filters.canal) {
        data = data.filter(d => d.canal === filters.canal);
      }
      if (filters.tema) {
        data = data.filter(d => d.tema === filters.tema);
      }
    }
    
    return data;
  }

  async deleteSentimentData(clientId: string): Promise<void> {
    this.sentimentsData.delete(clientId);
  }
}

// DatabaseStorage implementation using Drizzle ORM with PostgreSQL
export class DatabaseStorage implements IStorage {
  // File uploads
  async saveUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const id = randomUUID();
    const [uploadedFile] = await db
      .insert(uploadedFiles)
      .values({ ...file, id })
      .returning();
    return normalizeRow<UploadedFile>(uploadedFile);
  }

  async getUploadedFiles(clientId: string): Promise<UploadedFile[]> {
    const files = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.clientId, clientId));
    return files.map(file => normalizeRow<UploadedFile>(file));
  }

  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    const [file] = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, id));
    return file ? normalizeRow<UploadedFile>(file) : undefined;
  }

  // Client configurations
  async saveClientConfig(config: InsertClientConfig): Promise<ClientConfig> {
    const [savedConfig] = await db
      .insert(clientConfigs)
      .values(config)
      .onConflictDoUpdate({
        target: clientConfigs.clientId,
        set: {
          columnMappings: config.columnMappings,
          lastUpdated: config.lastUpdated,
        },
      })
      .returning();
    return normalizeRow<ClientConfig>(savedConfig);
  }

  async getClientConfig(clientId: string): Promise<ClientConfig | undefined> {
    const [config] = await db
      .select()
      .from(clientConfigs)
      .where(eq(clientConfigs.clientId, clientId));
    return config ? normalizeRow<ClientConfig>(config) : undefined;
  }

  // Ventas data
  async saveVentasData(fileId: string, data: VentasData[]): Promise<void> {
    if (data.length === 0) return;

    // Delete existing data for this file
    await db.delete(ventasData).where(eq(ventasData.fileId, fileId));

    // Insert new data in batches
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(item => ({
        id: randomUUID(),
        fileId,
        ...item,
      }));
      await db.insert(ventasData).values(batch);
    }
  }

  async getVentasData(fileId: string, seasonType?: 'PV' | 'OI'): Promise<VentasData[]> {
    let query = db
      .select()
      .from(ventasData)
      .where(eq(ventasData.fileId, fileId));
    
    // Apply season filter if provided (dramatically reduces data loaded)
    if (seasonType) {
      const results = await query;
      
      // Filter by season type in memory (DB doesn't have regex)
      const filtered = results.filter(v => {
        if (!v.temporada) return false;
        
        // Support format 1: "24PV", "25OI"
        const match1 = v.temporada.match(/^(\d{2})(PV|OI)$/);
        if (match1 && match1[2] === seasonType) return true;
        
        // Support format 2: "V2025", "I2026"
        const match2 = v.temporada.match(/^(V|I)(\d{4})$/);
        if (match2) {
          const season = match2[1] === 'V' ? 'PV' : 'OI';
          return season === seasonType;
        }
        
        return false;
      });
      
      return filtered.map(row => normalizeRow<VentasData>(row, ['id', 'fileId']));
    }
    
    const results = await query;
    return results.map(row => normalizeRow<VentasData>(row, ['id', 'fileId']));
  }

  async getUniqueSeasons(fileId: string): Promise<string[]> {
    const results = await db
      .selectDistinct({ temporada: ventasData.temporada })
      .from(ventasData)
      .where(eq(ventasData.fileId, fileId));
    
    return results
      .map(r => r.temporada)
      .filter((t): t is string => t !== null && t !== undefined);
  }

  // Productos data
  async saveProductosData(fileId: string, data: ProductosData[]): Promise<void> {
    if (data.length === 0) return;

    // Delete existing data for this file
    await db.delete(productosData).where(eq(productosData.fileId, fileId));

    // Insert new data in batches
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(item => ({
        id: randomUUID(),
        fileId,
        ...item,
      }));
      await db.insert(productosData).values(batch);
    }
  }

  async getProductosData(fileId: string): Promise<ProductosData[]> {
    const results = await db
      .select()
      .from(productosData)
      .where(eq(productosData.fileId, fileId));
    
    return results.map(row => normalizeRow<ProductosData>(row, ['id', 'fileId']));
  }

  // Traspasos data
  async saveTraspasosData(fileId: string, data: TraspasosData[]): Promise<void> {
    if (data.length === 0) return;

    // Delete existing data for this file
    await db.delete(traspasosData).where(eq(traspasosData.fileId, fileId));

    // Insert new data in batches
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(item => ({
        id: randomUUID(),
        fileId,
        ...item,
      }));
      await db.insert(traspasosData).values(batch);
    }
  }

  async getTraspasosData(fileId: string): Promise<TraspasosData[]> {
    const results = await db
      .select()
      .from(traspasosData)
      .where(eq(traspasosData.fileId, fileId));
    
    return results.map(row => normalizeRow<TraspasosData>(row, ['id', 'fileId']));
  }

  // Forecast jobs
  async saveForecastJob(job: InsertForecastJob): Promise<ForecastJob> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const [forecastJob] = await db
      .insert(forecastJobs)
      .values({ ...job, id, createdAt })
      .returning();
    return normalizeRow<ForecastJob>(forecastJob);
  }

  async getForecastJob(id: string): Promise<ForecastJob | undefined> {
    const [job] = await db
      .select()
      .from(forecastJobs)
      .where(eq(forecastJobs.id, id));
    return job ? normalizeRow<ForecastJob>(job) : undefined;
  }

  async getForecastJobsByFileId(fileId: string): Promise<ForecastJob[]> {
    const jobs = await db
      .select()
      .from(forecastJobs)
      .where(eq(forecastJobs.fileId, fileId));
    return jobs.map(job => normalizeRow<ForecastJob>(job));
  }

  async updateForecastJob(id: string, updates: Partial<ForecastJob>): Promise<ForecastJob | undefined> {
    const [updatedJob] = await db
      .update(forecastJobs)
      .set(updates)
      .where(eq(forecastJobs.id, id))
      .returning();
    return updatedJob ? normalizeRow<ForecastJob>(updatedJob) : undefined;
  }

  // Sentiment analysis data
  async saveSentimentData(data: InsertSentiment[]): Promise<void> {
    if (data.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(item => ({
        id: randomUUID(),
        ...item,
        createdAt: new Date().toISOString(),
      }));
      await db.insert(sentimentsData).values(batch);
    }
  }

  async getSentimentData(clientId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    canal?: string;
    tema?: string;
  }): Promise<SentimentData[]> {
    let query = db
      .select()
      .from(sentimentsData)
      .where(eq(sentimentsData.clientId, clientId));
    
    const results = await query;
    
    let filtered = results;
    if (filters) {
      if (filters.dateFrom) {
        filtered = filtered.filter(d => d.fecha >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(d => d.fecha <= filters.dateTo!);
      }
      if (filters.canal) {
        filtered = filtered.filter(d => d.canal === filters.canal);
      }
      if (filters.tema) {
        filtered = filtered.filter(d => d.tema === filters.tema);
      }
    }
    
    return filtered.map(row => normalizeRow<SentimentData>(row));
  }

  async deleteSentimentData(clientId: string): Promise<void> {
    await db.delete(sentimentsData).where(eq(sentimentsData.clientId, clientId));
  }
}

// Export DatabaseStorage for production use with Easypanel PostgreSQL
export const storage = new DatabaseStorage();
