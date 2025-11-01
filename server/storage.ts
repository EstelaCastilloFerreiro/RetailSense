import {
  type UploadedFile,
  type InsertUploadedFile,
  type ClientConfig,
  type InsertClientConfig,
  type VentasData,
  type ProductosData,
  type TraspasosData,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
  
  saveProductosData(fileId: string, data: ProductosData[]): Promise<void>;
  getProductosData(fileId: string): Promise<ProductosData[]>;
  
  saveTraspasosData(fileId: string, data: TraspasosData[]): Promise<void>;
  getTraspasosData(fileId: string): Promise<TraspasosData[]>;
}

export class MemStorage implements IStorage {
  private uploadedFiles: Map<string, UploadedFile>;
  private clientConfigs: Map<string, ClientConfig>;
  private ventasData: Map<string, VentasData[]>;
  private productosData: Map<string, ProductosData[]>;
  private traspasosData: Map<string, TraspasosData[]>;

  constructor() {
    this.uploadedFiles = new Map();
    this.clientConfigs = new Map();
    this.ventasData = new Map();
    this.productosData = new Map();
    this.traspasosData = new Map();
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
}

export const storage = new MemStorage();
