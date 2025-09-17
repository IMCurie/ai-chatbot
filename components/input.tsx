import { useRef } from "react";
import { Globe, Loader2 } from "lucide-react";

import { SendButton, StopButton } from "@/components/button";
import { cn } from "@/lib/utils";

export default function Input({
  inputValue,
  onInputChange,
  onSubmit,
  status,
  stop,
  disabled = false,
  placeholder = "Ask anything",
  networkSearchEnabled = false,
  onToggleNetworkSearch,
  networkSearchAvailable = true,
  networkSearchLoading = false,
  showNetworkSearchToggle = true,
}: {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  stop: () => void;
  disabled?: boolean;
  placeholder?: string;
  networkSearchEnabled?: boolean;
  onToggleNetworkSearch?: (value: boolean) => void;
  networkSearchAvailable?: boolean;
  networkSearchLoading?: boolean;
  showNetworkSearchToggle?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasInput = inputValue.trim().length > 0;
  const showNetworkSearchControls =
    typeof onToggleNetworkSearch === "function" && showNetworkSearchToggle;

  const networkToggleLabel = networkSearchEnabled ? "关闭联网搜索" : "开启联网搜索";

  return (
    <div className="relative rounded-3xl border border-neutral-200/50 bg-white/80 shadow-lg backdrop-blur-md">
      <form ref={formRef} onSubmit={onSubmit} className="flex w-full flex-col">
        <div className="px-5 pt-4">
          <textarea
            value={inputValue}
            onChange={onInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full resize-none bg-transparent py-2 text-base leading-6 text-neutral-900 placeholder-neutral-500 outline-none",
              "min-h-[64px] max-h-32",
              disabled && "cursor-not-allowed opacity-50"
            )}
            rows={3}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.max(target.scrollHeight, 64)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && hasInput && !disabled) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {showNetworkSearchControls && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    networkSearchAvailable && onToggleNetworkSearch?.(!networkSearchEnabled)
                  }
                  className={cn(
                    "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                    networkSearchEnabled
                      ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100",
                    !networkSearchAvailable && "cursor-not-allowed opacity-40"
                  )}
                  aria-pressed={networkSearchEnabled}
                  aria-label={networkToggleLabel}
                  title={networkToggleLabel}
                  disabled={!networkSearchAvailable}
                >
                  <Globe className="h-4 w-4" />
                  {networkSearchLoading && (
                    <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-current" />
                  )}
                  <span className="sr-only">{networkToggleLabel}</span>
                </button>
                {!networkSearchAvailable && (
                  <span className="text-xs">请在设置中配置 Tavily API Key</span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {status === "submitted" || status === "streaming" ? (
              <StopButton stop={stop} />
            ) : (
              <SendButton disabled={!hasInput || disabled} />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
