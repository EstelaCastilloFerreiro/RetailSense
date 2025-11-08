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
  uploadedFiles,
  clientConfigs,
  ventasData,
  productosData,
  traspasosData,
  forecastJobs,
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
  getVentasData(fileId: string): Promise<VentasData[]>;
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
}

export class MemStorage implements IStorage {
  private uploadedFiles: Map<string, UploadedFile>;
  private clientConfigs: Map<string, ClientConfig>;
  private ventasData: Map<string, VentasData[]>;
  private productosData: Map<string, ProductosData[]>;
  private traspasosData: Map<string, TraspasosData[]>;
  private forecastJobs: Map<string, ForecastJob>;

  constructor() {
    this.uploadedFiles = new Map();
    this.clientConfigs = new Map();
    this.ventasData = new Map();
    this.productosData = new Map();
    this.traspasosData = new Map();
    this.forecastJobs = new Map();
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

  async getVentasData(fileId: string): Promise<VentasData[]> {
    return this.ventasData.get(fileId) || [];
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

  async getVentasData(fileId: string): Promise<VentasData[]> {
    const results = await db
      .select()
      .from(ventasData)
      .where(eq(ventasData.fileId, fileId));
    
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
}

// Export DatabaseStorage for production use with Easypanel PostgreSQL
export const storage = new DatabaseStorage();
