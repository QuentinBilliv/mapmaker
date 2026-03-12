import { z } from "zod";
import { LICENSES } from "./defaults";

export const mapMetadataSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().max(500, "Description is too long"),
  license: z.enum(LICENSES),
  tagsStr: z.string().max(200, "Tags string is too long"),
});

export type MapMetadataFormValues = z.infer<typeof mapMetadataSchema>;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");
const POINT_SHAPE_VALUES = ["circle", "triangle", "square", "diamond", "star", "cross", "pentagon", "hexagon"] as const;
const LINE_STYLE_VALUES = ["solid", "dotted", "dash-short", "dash-medium", "dash-long"] as const;
const ARROW_STYLE_VALUES = ["none", "forward", "both"] as const;
const LINE_DECORATION_VALUES = ["none", "crosses", "crosses-free", "ticks", "triangles-up", "triangles-down", "arrows-down", "arrows-up", "railway"] as const;
const FILL_PATTERN_VALUES = ["none", "stripes-diagonal", "stripes-horizontal", "stripes-vertical", "crosshatch", "dots"] as const;

export const featureSchema = z.object({
  label: z.string().max(100, "Label is too long"),
  color: hexColor,
  opacity: z.number().min(0).max(1),
  size: z.number().min(0.5).max(3),
  shape: z.enum(POINT_SHAPE_VALUES),
  icon: z.string().optional(),
  customSvg: z.string().optional(),
  borderColor: hexColor,
  borderWidth: z.number().min(0).max(12),
  smoothing: z.number().min(0).max(1),
  strokeWidth: z.number().min(0).max(10),
  lineStyle: z.enum(LINE_STYLE_VALUES),
  arrowStyle: z.enum(ARROW_STYLE_VALUES),
  lineDecoration: z.enum(LINE_DECORATION_VALUES),
  decorationSpacing: z.number().min(5).max(200),
  fillPattern: z.enum(FILL_PATTERN_VALUES),
  sourceText: z.string().max(500, "Source text is too long"),
  sourceUrl: z.string().url("Invalid URL").or(z.literal("")),
  layerId: z.string().min(1, "Layer is required"),
});

export type FeatureFormValues = z.infer<typeof featureSchema>;
