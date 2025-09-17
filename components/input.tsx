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

  return (
    <div className="relative backdrop-blur-md bg-white/80 border border-neutral-200/50 shadow-lg rounded-3xl">
      <div className="flex items-end px-5 pt-3 pb-3 gap-3">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex w-full flex-col gap-3"
        >
          {showNetworkSearchControls && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span className="font-medium text-foreground">联网搜索</span>
                {networkSearchLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
              </div>
              <div className="flex items-center gap-3">
                {!networkSearchAvailable && (
                  <span className="text-xs text-muted-foreground">
                    请在设置中配置 Tavily API Key
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    networkSearchAvailable &&
                    onToggleNetworkSearch?.(!networkSearchEnabled)
                  }
                  className={cn(
                    "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                    networkSearchEnabled ? "bg-primary" : "bg-muted",
                    !networkSearchAvailable && "cursor-not-allowed opacity-40"
                  )}
                  aria-pressed={networkSearchEnabled}
                  aria-label="切换联网搜索"
                  disabled={!networkSearchAvailable}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-background transition-transform",
                      networkSearchEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={onInputChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full bg-transparent text-neutral-900 placeholder-neutral-500 text-base outline-none resize-none min-h-[64px] max-h-32 py-2 leading-6 ${
                  disabled ? "cursor-not-allowed opacity-50" : ""
                }`}
                rows={3}
                onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.max(target.scrollHeight, 64)}px`;
              }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && hasInput && !disabled) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
              />
          </div>

          <div className="flex-shrink-0">
            {status === "submitted" || status === "streaming" ? (
              <StopButton stop={stop} />
            ) : (
              <SendButton disabled={!hasInput || disabled} />
            )}
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}
