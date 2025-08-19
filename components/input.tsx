import { SendButton, StopButton } from "@/components/button";
import ModelSelector from "@/components/model-selector";
import { Model } from "@/lib/models";

export default function Input({
  inputValue,
  onInputChange,
  onSubmit,
  status,
  stop,
  model,
  onModelChange,
}: {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  stop: () => void;
  model: Model;
  onModelChange: (model: Model) => void;
}) {
  const hasInput = inputValue.trim().length > 0;

  return (
    <div className="relative backdrop-blur-md bg-white/80 border border-neutral-200/50 shadow-lg rounded-3xl">
      <div className="px-5 pt-3 pb-2 border-b border-neutral-100">
        <ModelSelector selectedModel={model} onModelChange={onModelChange} />
      </div>

      <div className="flex items-end px-5 pt-2 pb-3 gap-3">
        <form onSubmit={onSubmit} className="flex w-full items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={onInputChange}
              placeholder="Ask anything"
              className="w-full bg-transparent text-neutral-900 placeholder-neutral-500 text-base outline-none resize-none min-h-[64px] max-h-32 py-2 leading-6"
              rows={3}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.max(target.scrollHeight, 64)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && hasInput) {
                  e.preventDefault();
                  onSubmit(e as any);
                }
              }}
            />
          </div>

          <div className="flex-shrink-0">
            {status === "submitted" || status === "streaming" ? (
              <StopButton stop={stop} />
            ) : (
              <SendButton disabled={!hasInput} />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
