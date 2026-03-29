import type { DrawMode } from "./draw-engine";
import type {
  PointShape,
  LineStyle,
  ArrowStyle,
  LineDecoration,
  FillPattern,
  TextFont,
} from "./types";
import type { BaseMap } from "./map-style";
import { COLORS, DEFAULT_BORDER_WIDTH } from "./defaults";
import { BASE_MAPS } from "./map-style";

export interface PointStyle {
  size: number;
  shape: PointShape;
  customSvg: string | null;
  borderColor: string;
  borderWidth: number;
}

export interface StrokeStyle {
  smoothing: number;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowStyle: ArrowStyle;
  lineDecoration: LineDecoration;
  decorationSpacing: number;
  fillPattern: FillPattern;
}

export interface TextStyle {
  textContent: string;
  fontSize: number;
  fontFamily: TextFont;
  textBorderEnabled: boolean;
  textBorderColor: string;
  textBorderWidth: number;
}

export interface DrawingState {
  drawMode: DrawMode;
  activeLabel: string;
  activeColor: string;
  activeOpacity: number;
  activePoint: PointStyle;
  activeStroke: StrokeStyle;
  activeText: TextStyle;
  activeBaseMap: BaseMap;
}

export type DrawingPayload = Partial<Omit<DrawingState, "activePoint" | "activeStroke" | "activeText">> & {
  activePoint?: Partial<PointStyle>;
  activeStroke?: Partial<StrokeStyle>;
  activeText?: Partial<TextStyle>;
};

export type DrawingAction =
  | { type: "SET"; payload: DrawingPayload }
  | { type: "RESET_AFTER_ADD"; isText: boolean };

export const INITIAL_POINT_STYLE: PointStyle = {
  size: 1,
  shape: "circle",
  customSvg: null,
  borderColor: COLORS.white,
  borderWidth: DEFAULT_BORDER_WIDTH,
};

export const INITIAL_STROKE_STYLE: StrokeStyle = {
  smoothing: 0,
  strokeWidth: 3,
  lineStyle: "solid",
  arrowStyle: "none",
  lineDecoration: "none",
  decorationSpacing: 50,
  fillPattern: "none",
};

export const INITIAL_TEXT_STYLE: TextStyle = {
  textContent: "",
  fontSize: 24,
  fontFamily: "sans",
  textBorderEnabled: true,
  textBorderColor: COLORS.white,
  textBorderWidth: 2,
};

export const INITIAL_DRAWING_STATE: DrawingState = {
  drawMode: "select",
  activeLabel: "",
  activeColor: COLORS.primary,
  activeOpacity: 1,
  activePoint: { ...INITIAL_POINT_STYLE },
  activeStroke: { ...INITIAL_STROKE_STYLE },
  activeText: { ...INITIAL_TEXT_STYLE },
  activeBaseMap: BASE_MAPS[0],
};

export function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case "SET": {
      const { activePoint, activeStroke, activeText, ...rest } = action.payload;
      return {
        ...state,
        ...rest,
        ...(activePoint ? { activePoint: { ...state.activePoint, ...activePoint } } : {}),
        ...(activeStroke ? { activeStroke: { ...state.activeStroke, ...activeStroke } } : {}),
        ...(activeText ? { activeText: { ...state.activeText, ...activeText } } : {}),
      };
    }
    case "RESET_AFTER_ADD":
      return {
        ...state,
        drawMode: "select",
        activeLabel: "",
        ...(action.isText ? { activeText: { ...state.activeText, textContent: "" } } : {}),
      };
  }
}
