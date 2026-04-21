import type { HelpExplanation } from "@/components/ui/HelpHint";

function FeaturesDialog() {
  return (
    <div className="space-y-2">
      <p>
        A <strong>feature</strong> is any individual shape or item you add to the map — a
        polygon, a line, an arrow, a point, a text label, a circle. Every click-and-drag
        you make with the drawing toolbar creates one feature.
      </p>
      <p>
        This panel lists every feature in the current map. From here you can:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Reorder</strong> features by drag &amp; drop — features higher in the list render on top of the ones below.</li>
        <li><strong>Group</strong> features to keep related items together (e.g. all routes, all cities). Click the <strong>+</strong> button in the panel header to create a new group, then drag features into it. Groups can be collapsed for a cleaner workspace.</li>
        <li><strong>Rename</strong>, <strong>duplicate</strong>, or <strong>delete</strong> any feature or group.</li>
        <li><strong>Select</strong> a feature here and its edit panel opens on the right — same as clicking it on the map.</li>
      </ul>
      <p>
        The number next to the title is the total feature count for the current map.
      </p>
    </div>
  );
}

const FeaturesHelp: HelpExplanation = {
  summary: "Every shape you draw is a feature. Reorder, group, rename, or delete them from this panel.",
  title: "Features",
  Dialog: FeaturesDialog,
};

export default FeaturesHelp;
