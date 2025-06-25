import { cn } from "@/lib/utils";

export function StopButton({ stop }: { stop: () => void }) {
  return (
    <button
      className={cn(
        "flex items-center justify-center",
        "border-none rounded-full w-8 h-8",
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
        "flex items-center justify-center",
        "border-none rounded-full w-8 h-8",
        "transition-colors duration-200 ease-in-out",
        disabled
          ? "cursor-not-allowed bg-neutral-100"
          : "cursor-pointer bg-neutral-800 hover:bg-neutral-700 shadow-sm hover:shadow-md"
      )}
    >
      <span
        className={cn(
          "icon-[material-symbols--arrow-upward] w-5 h-5",
          disabled ? "text-neutral-500" : "text-white"
        )}
      ></span>
    </button>
  );
}
