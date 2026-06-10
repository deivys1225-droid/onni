import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  COLISEO_PANORAMA_PRESETS,
  getColiseoPanoramaPreset,
  type ColiseoPanoramaId,
} from "@/data/coliseoPanoramas";
import { cn } from "@/lib/utils";

export default function ColiseoPanoramaSwitcher({
  activeId,
  onSelect,
  className,
}: {
  activeId: ColiseoPanoramaId;
  onSelect: (id: ColiseoPanoramaId) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = getColiseoPanoramaPreset(activeId);

  return (
    <div className={cn("pointer-events-auto flex flex-col items-end gap-1", className)}>
      {open ? (
        <div
          className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-black/45 p-1 backdrop-blur-sm"
          role="menu"
          aria-label="Entornos 360°"
        >
          {COLISEO_PANORAMA_PRESETS.map((preset) => {
            const selected = preset.id === activeId;
            return (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onSelect(preset.id);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-0.5 text-left text-[10px] font-medium transition",
                  selected ? "bg-cyan-500/20 text-cyan-50" : "text-white/75 hover:bg-white/10",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm hover:bg-black/55"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Ocultar entornos 360°" : "Cambiar entorno 360°"}
      >
        <span className="max-w-[5.5rem] truncate">{active.label}</span>
        <ChevronDown
          className={cn("h-3 w-3 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
    </div>
  );
}
