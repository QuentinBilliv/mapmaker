import type { HelpExplanation } from "@/components/ui/HelpHint";

function DrawingToolbarDialog() {
  return (
    <div className="space-y-3">
      <section>
        <h3 className="font-medium text-foreground mb-1">Drawing tools (top)</h3>
        <p>
          Pick a shape, then click on the map to draw it. <strong>Select</strong> lets you
          click existing shapes to edit them. The rest — <strong>polygon</strong>,{" "}
          <strong>rectangle</strong>, <strong>circle</strong>, <strong>polyline</strong>,{" "}
          <strong>arrow</strong>, <strong>double arrow</strong>, <strong>point</strong>,{" "}
          <strong>text</strong> — each produce one kind of feature.
        </p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">Undo / Redo</h3>
        <p>Revert or restore your last actions. Also works with Ctrl+Z and Ctrl+Shift+Z.</p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">GeoJSON Bank (globe icon)</h3>
        <p>
          Import ready-made shapes — countries, regions, oceans — without drawing them
          yourself. Useful to start from real-world geography.
        </p>
        <p className="mt-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <strong>Heads up:</strong> each imported shape carries its own geometry, which
          adds up fast. If you need to color many countries or regions, use a{" "}
          <strong>choropleth</strong> instead — it renders the same regions without
          bloating your map file.
        </p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">Geo search (magnifier)</h3>
        <p>Find a place by name and recenter the map on it.</p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">Keyboard shortcuts (keyboard icon)</h3>
        <p>The full list of shortcuts available in the editor.</p>
      </section>
    </div>
  );
}

const DrawingToolbarHelp: HelpExplanation = {
  summary: "Quick guide to the toolbar sections — drawing, history, GeoJSON import, search, shortcuts.",
  title: "Drawing toolbar",
  Dialog: DrawingToolbarDialog,
};

export default DrawingToolbarHelp;
