import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

interface ExpandableChartProps {
  title: string;
  renderChart: (isExpanded: boolean) => ReactNode;
  expandedHeight?: number;
}

export function ExpandableChart({ title, renderChart, expandedHeight = 800 }: ExpandableChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="relative group">
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsExpanded(true)}
          data-testid="button-expand-chart"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Expandir
        </Button>
        {renderChart(false)}
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {renderChart(true)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
