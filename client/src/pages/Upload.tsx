import { useState } from "react";
import { useLocation } from "wouter";
import FileUpload from "@/components/FileUpload";
import ThemeToggle from "@/components/ThemeToggle";

export default function Upload() {
  const [, setLocation] = useLocation();

  const handleUploadComplete = () => {
    console.log("Upload complete, navigating to dashboard");
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/klob-logo.svg" 
            alt="KLOB Logo" 
            className="h-10 w-auto"
          />
          <span className="text-xs text-muted-foreground hidden sm:block">Retail Analytics</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Sube tus Datos</h2>
            <p className="text-muted-foreground">
              Sube tus archivos Excel o CSV para obtener análisis y predicciones instantáneas
            </p>
          </div>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>
      </main>
    </div>
  );
}
