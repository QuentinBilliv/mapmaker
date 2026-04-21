import type { HelpExplanation } from "@/components/ui/HelpHint";

function LegendDialog() {
  return (
    <div className="space-y-2">
      <p>
        A <strong>legend</strong> is the key that tells readers what the colors, shapes,
        and symbols on your map mean. Without one, a thematic map is just decoration.
      </p>
      <p>
        Each <strong>legend entry</strong> bundles a label with a reusable style (color,
        border, pattern, icon…). You then assign features on the map to that entry, so
        every feature sharing the same meaning automatically shares the same look.
      </p>
      <p>
        For example: one entry <em>&quot;Trade routes&quot;</em> with a blue arrow style,
        one entry <em>&quot;Strategic straits&quot;</em> with a red hexagon — draw as many
        routes or straits as you want, they&apos;ll all stay visually consistent.
      </p>
      <p>
        Click <strong>+</strong> to create an entry, then select a feature on the map and
        link it to that entry from its side panel. The legend block is shown on published
        and embedded maps.
      </p>
    </div>
  );
}

const LegendHelp: HelpExplanation = {
  summary: "A visual key that maps colors and symbols to their meaning. Group features that share a style under one entry.",
  title: "Legend",
  Dialog: LegendDialog,
};

export default LegendHelp;
