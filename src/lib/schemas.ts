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
const TEXT_FONT_VALUES = ["sans", "serif", "mono"] as const;

export const featureSchema = z.object({
  label: z.string().max(100, "Label is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  color: hexColor,
  opacity: z.number().min(0).max(1),
  size: z.number().min(0.5).max(3),
  shape: z.enum(POINT_SHAPE_VALUES),
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
  textContent: z.string().max(500, "Text is too long").optional(),
  fontSize: z.number().min(8).max(72).optional(),
  fontFamily: z.enum(TEXT_FONT_VALUES).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  textBorderEnabled: z.boolean().optional(),
  textBorderColor: hexColor.optional(),
  textBorderWidth: z.number().min(0).max(5).optional(),
});

export type FeatureFormValues = z.infer<typeof featureSchema>;

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
