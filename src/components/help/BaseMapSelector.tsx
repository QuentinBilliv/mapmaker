import { FaMap, FaGlobe, FaBorderAll, FaRoad } from "react-icons/fa6";
import type { HelpExplanation } from "@/components/ui/HelpHint";

const IconBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center justify-center size-4 rounded border bg-muted text-foreground align-text-bottom ml-1">
    {children}
  </span>
);

function BaseMapSelectorDialog() {
  return (
    <div className="space-y-3">
      <section>
        <h3 className="font-medium text-foreground mb-1">
          Projection (map<IconBadge><FaMap className="w-2.5 h-2.5" /></IconBadge> / globe<IconBadge><FaGlobe className="w-2.5 h-2.5" /></IconBadge>)
        </h3>
        <p>
          Switch between a flat <strong>Mercator</strong> projection (default, better for
          editing) and a 3D <strong>globe</strong> view (better for showing planet-scale
          context).
        </p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">Base map style</h3>
        <p>
          The background map your features are drawn on top of. Choose a style that fits
          your story — neutral (<strong>Positron</strong>, <strong>Light</strong>) for
          data-heavy maps, detailed (<strong>OpenStreetMap</strong>,{" "}
          <strong>Liberty</strong>) for location references, or thematic
          (<strong>Topographic</strong>, <strong>Satellite</strong>) for specific contexts.
        </p>
      </section>
      <section>
        <h3 className="font-medium text-foreground mb-1">
          Layer toggles (label<IconBadge><span className="text-[10px] leading-none font-semibold">Aa</span></IconBadge> / borders<IconBadge><FaBorderAll className="w-2.5 h-2.5" /></IconBadge> / roads<IconBadge><FaRoad className="w-2.5 h-2.5" /></IconBadge>)
        </h3>
        <p>
          When a vector style is active, hide or show the base map&apos;s{" "}
          <strong>labels</strong>, <strong>country borders</strong>, and{" "}
          <strong>roads</strong>. A slash icon means the layer is currently hidden. Not
          available on raster styles (Satellite, National Geographic).
        </p>
      </section>
    </div>
  );
}

const BaseMapSelectorHelp: HelpExplanation = {
  summary: "Change the projection, pick a base map style, and toggle labels / borders / roads.",
  title: "Base map bar",
  Dialog: BaseMapSelectorDialog,
};

export default BaseMapSelectorHelp;
