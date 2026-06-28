import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SFDotIcon } from "./SFDotIcon";
import type { ConsoleConfig } from "./types";
import { INTERVAL_OPTIONS } from "./types";

interface LogHeaderProps {
  config: ConsoleConfig;
  onConfigChange: (patch: Partial<ConsoleConfig>) => void;
  onClose?: () => void;
}

export function LogHeader({ config, onConfigChange, onClose }: LogHeaderProps) {
  return (
    <div className="flex items-center justify-end px-3 sm:px-5 py-3 sm:py-4">
      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="capsule-btn h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground transition-log-spring"
        >
          <SFDotIcon name="close" size={14} />
        </Button>
      )}
    </div>
  );
}
