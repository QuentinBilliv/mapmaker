"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFeatureRendering } from "@/lib/hooks/use-feature-rendering";
import { useFeatureTooltip } from "@/lib/hooks/use-feature-tooltip";
import { useLegendHighlight } from "@/lib/hooks/use-legend-highlight";
import { HighlightProvider } from "@/lib/highlight-context";
import { findBaseMap, resolveBaseMapStyle, type StyleOptions } from "@/lib/map-style";
import { LegendDisplay } from "@/components/ui/legend-display";
import { EmbedButton } from "@/components/maps/EmbedButton";
import { FaPenToSquare, FaChevronUp, FaChevronDown } from "react-icons/fa6";
import { Share2Icon, CheckIcon } from "lucide-react";
import { computeFeaturesBounds } from "@/lib/geojson";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/defaults";
import type { MapData, FeatureData, GroupData, LegendEntry, ChoroplethData } from "@/lib/types";
import { DEFAULT_CHOROPLETH } from "@/lib/types";
import { useChoroplethDisplay } from "@/lib/hooks/use-choropleth-display";
import { choroplethLegendProps } from "@/lib/choropleth-legend";

interface ReadOnlyMapViewProps {
  map: MapData;
  features: FeatureData[];
  groups: GroupData[];
  legendEntries?: LegendEntry[];
  choropleth?: ChoroplethData;
  baseMapId: string;
  styleOptions?: StyleOptions;
  editHref?: string;
}

export default function ReadOnlyMapView(props: ReadOnlyMapViewProps) {
  return (
    <HighlightProvider>
      <ReadOnlyMapViewInner {...props} />
    </HighlightProvider>
  );
}

function ReadOnlyMapViewInner({
  map: mapData,
  features,
  groups,
  legendEntries = [],
  choropleth = DEFAULT_CHOROPLETH,
  baseMapId,
  styleOptions,
  editHref,
}: ReadOnlyMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);

  const baseMap = findBaseMap(baseMapId);
  const isDefaultView = mapData.center[0] === DEFAULT_CENTER[0] && mapData.center[1] === DEFAULT_CENTER[1] && mapData.zoom === DEFAULT_ZOOM;
  const bounds = useMemo(() => isDefaultView ? computeFeaturesBounds(features) : null, [features, isDefaultView]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    resolveBaseMapStyle(baseMap, styleOptions).then((style) => {
      if (cancelled || !containerRef.current) return;
      const opts: maplibregl.MapOptions = {
        container: containerRef.current,
        style: style as maplibregl.StyleSpecification,
      };
      if (bounds) {
        opts.bounds = bounds as maplibregl.LngLatBoundsLike;
        opts.fitBoundsOptions = { padding: 60, maxZoom: 16 };
      } else {
        opts.center = mapData.center;
        opts.zoom = mapData.zoom;
      }
      const map = new maplibregl.Map(opts);
      map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      mapRef.current = map;
      map.once("idle", () => setStyleVersion((v) => v + 1));
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [baseMap.style]);

  useFeatureRendering(mapRef, features, groups, styleVersion, legendEntries);
  useChoroplethDisplay(mapRef, choropleth, styleVersion);
  useFeatureTooltip(mapRef, "select", styleVersion);
  useLegendHighlight(mapRef, styleVersion, choropleth.opacity);

  const [headerOpen, setHeaderOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col relative overflow-visible">
      <div ref={containerRef} className="flex-1" />
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="pointer-events-auto">
          <LegendDisplay features={features} legendEntries={legendEntries} {...choroplethLegendProps(choropleth)} />
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 z-20 overflow-visible">
        <div className="relative bg-popover/90 backdrop-blur-sm">
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: headerOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="px-4 py-3">
                {mapData.description && (
                  <p className="text-sm text-muted-foreground">
                    {mapData.description}
                  </p>
                )}
                {mapData.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {mapData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    License: {mapData.license}
                  </p>
                  <ShareButton mapId={mapData.id} />
                  <EmbedButton mapId={mapData.id} />
                  {editHref && (
                    <Link
                      href={editHref}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FaPenToSquare className="w-3 h-3" />
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setHeaderOpen((v) => !v)}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10 bg-popover border rounded-md px-3 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title={headerOpen ? "Collapse details" : "Expand details"}
          >
            {headerOpen ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ mapId }: { mapId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/maps/${mapId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mapId]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckIcon className="w-3 h-3" /> : <Share2Icon className="w-3 h-3" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
