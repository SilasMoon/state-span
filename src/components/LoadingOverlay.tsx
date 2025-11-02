import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay = ({ message }: LoadingOverlayProps) => {
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]"
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 bg-card p-6 rounded-lg shadow-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
};
