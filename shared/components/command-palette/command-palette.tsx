"use client";

import { useUIStore } from "../../stores/ui.store";

export function CommandPalette() {
  const open = useUIStore((s: any) => s.commandPaletteOpen);
  const close = useUIStore((s: any) => s.closeCommandPalette);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-24 z-50" onClick={close}>
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Type a command or search..."
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-3">
          Try: &quot;create task&quot;, &quot;view agent network&quot;, &quot;approve requests&quot;
        </p>
      </div>
    </div>
  );
}
