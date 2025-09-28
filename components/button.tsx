import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";

export function StopButton({ stop }: { stop: () => void }) {
  return (
    <button
      className={cn(
        "flex items-center justify-center",
        "border-none rounded-full w-10 h-10",
        "cursor-pointer bg-gray-800 hover:bg-gray-700",
        "transition-colors duration-200 ease-in-out",
        "shadow-sm hover:shadow-md"
      )}
      onClick={stop}
    >
      <div className="bg-white w-3 h-3"></div>
    </button>
  );
}

export function SendButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "flex items-center justify-center border-none rounded-full w-10 h-10 transition-colors duration-200 ease-in-out",
        disabled
          ? "cursor-not-allowed bg-secondary text-primary shadow-none"
          : "cursor-pointer bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
      )}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}
