import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, Download, X } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface VisualizationCardProps {
  title: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export default function VisualizationCard({ title, children, id, className = "" }: VisualizationCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleExport = async (useFullscreenRef = false) => {
    const targetRef = useFullscreenRef ? fullscreenContentRef : contentRef;
    if (!targetRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "Exportación exitosa",
        description: `${title} se ha descargado como imagen`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar la visualización",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const cardContent = (
    <div ref={contentRef} className="relative">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {!isFullscreen && (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFullscreen(true)}
              data-testid={`button-expand-${id}`}
              className="h-7 w-7"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleExport(false)}
              disabled={isExporting}
              data-testid={`button-export-${id}`}
              className="h-7 w-7"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <>
      <Card className={`p-4 ${className}`} data-testid={`card-viz-${id}`}>
        {cardContent}
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{title}</DialogTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(true)}
                  disabled={isExporting}
                  data-testid={`button-export-fullscreen-${id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsFullscreen(false)}
                  className="h-8 w-8"
                  data-testid={`button-close-fullscreen-${id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4" ref={fullscreenContentRef}>
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
