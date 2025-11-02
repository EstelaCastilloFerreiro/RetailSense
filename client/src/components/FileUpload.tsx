import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; records: any } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { setFileId, clearFilters } = useData();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', 'demo-client');

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        let errorMessage = 'Error uploading file';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.fullMessage || errorData.message || errorMessage;
          console.error('Server error response:', errorData);
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Validate response has required fields
      if (!data.fileId) {
        throw new Error('Respuesta del servidor inválida: falta fileId');
      }
      
      if (!data.recordCounts) {
        throw new Error('Respuesta del servidor inválida: falta recordCounts');
      }
      
      setUploadedFile({
        name: data.fileName || 'Archivo cargado',
        records: data.recordCounts,
      });

      setFileId(data.fileId);
      clearFilters();

      toast({
        title: "Archivo procesado correctamente",
        description: `${data.recordCounts.ventas || 0} ventas, ${data.recordCounts.productos || 0} productos, ${data.recordCounts.traspasos || 0} traspasos`,
      });

      onUploadComplete?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || "Por favor, intenta de nuevo. Verifica que el archivo sea válido.";
      
      toast({
        title: "Error al procesar archivo",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset state on error
      setUploadProgress(0);
      setUploadedFile(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg min-h-[400px] flex flex-col items-center justify-center gap-4 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="dropzone-upload"
      >
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          {uploadedFile ? (
            <CheckCircle2 className="h-8 w-8 text-primary" />
          ) : uploading ? (
            <AlertCircle className="h-8 w-8 text-primary animate-pulse" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">
            {uploadedFile ? 'Archivo cargado' : 'Arrastra el archivo Excel aquí'}
          </p>
          <p className="text-sm text-muted-foreground">
            {uploadedFile 
              ? uploadedFile.name
              : 'Archivo .xlsx con las hojas: Compra, Traspasos, Ventas • Max 50MB'
            }
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
          data-testid="input-file"
        />
        
        <Button
          onClick={triggerFileInput}
          disabled={uploading}
          size="lg"
          variant="outline"
          data-testid="button-browse"
        >
          <FileText className="mr-2 h-5 w-5" />
          {uploadedFile ? 'Cargar otro archivo' : 'Seleccionar archivo'}
        </Button>
      </div>

      {uploading && (
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Procesando archivo...</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        </Card>
      )}

      {uploadedFile && !uploading && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Datos procesados</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
              <span className="text-muted-foreground">Ventas:</span>
              <span className="font-medium">{uploadedFile.records.ventas.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
              <span className="text-muted-foreground">Productos:</span>
              <span className="font-medium">{uploadedFile.records.productos.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
              <span className="text-muted-foreground">Traspasos:</span>
              <span className="font-medium">{uploadedFile.records.traspasos.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
