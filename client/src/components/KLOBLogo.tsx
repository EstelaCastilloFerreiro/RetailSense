export function KLOBLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">K</span>
      <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">L</span>
      <img 
        src="/klob-logo-ring.svg" 
        alt="KLOB Logo" 
        className="h-6 w-6"
      />
      <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">B</span>
    </div>
  );
}

