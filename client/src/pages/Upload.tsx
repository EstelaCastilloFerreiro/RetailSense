import { useLocation } from "wouter";
import FileUpload from "@/components/FileUpload";

export default function Upload() {
  const [, setLocation] = useLocation();

  const handleUploadComplete = () => {
    console.log("Upload complete, navigating to analytics");
    setLocation("/analytics");
  };

  return (
    <div className="flex items-center justify-center h-full p-6 bg-background">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Sube tus Datos</h2>
          <p className="text-muted-foreground">
            Sube tus archivos Excel o CSV para obtener análisis y predicciones instantáneas
          </p>
        </div>
        <FileUpload onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  );
}
