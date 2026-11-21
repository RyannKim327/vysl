"use client";

import { useStreamLayout } from "@/components/stream/use-stream-layout";
import {
  LAYOUT_PRESETS,
  layoutForPreset,
  writeStreamLayout,
} from "@/lib/stream-layout";

export default function LayoutQuickPicker() {
  const layout = useStreamLayout();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted">
      Panels
      <select
        value={layout.preset}
        onChange={(event) =>
          writeStreamLayout(
            layoutForPreset(event.target.value as (typeof LAYOUT_PRESETS)[number]["id"], layout),
          )
        }
        className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        {LAYOUT_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
