import type { HelpExplanation } from "@/components/ui/HelpHint";

function ChoroplethDialog() {
  return (
    <div className="space-y-2">
      <p>
        A choropleth colors each region of the map according to a value you assign to it —
        darker or brighter shades represent higher numbers.
      </p>
      <p>In idomaps you can either:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Gradient</strong> — map a numeric value to each region (e.g. population, GDP).
          Colors are interpolated between a low and high color.
        </li>
        <li>
          <strong>Categories</strong> — group regions into named buckets (e.g. climate zones,
          political affiliation). Each category gets its own color.
        </li>
      </ul>
      <p>
        Enable the toggle, then click <em>Set values</em> to start assigning regions.
      </p>
    </div>
  );
}

const ChoroplethHelp: HelpExplanation = {
  summary: "A map where regions are colored by a value — darker shades = higher numbers.",
  title: "Choropleth maps",
  Dialog: ChoroplethDialog,
};

export default ChoroplethHelp;
