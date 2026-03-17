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

export interface DrawingState {
  drawMode: DrawMode;
  activeLabel: string;
  activeSourceText: string;
  activeSourceUrl: string;
  activeColor: string;
  activeOpacity: number;
  activeSize: number;
  activeShape: PointShape;
  activeIcon: string | null;
  activeBorderColor: string;
  activeBorderWidth: number;
  activeSmoothing: number;
  activeStrokeWidth: number;
  activeLineStyle: LineStyle;
  activeArrowStyle: ArrowStyle;
  activeLineDecoration: LineDecoration;
  activeDecorationSpacing: number;
  activeFillPattern: FillPattern;
  activeTextContent: string;
  activeFontSize: number;
  activeFontFamily: TextFont;
  activeTextBorderEnabled: boolean;
  activeTextBorderColor: string;
  activeTextBorderWidth: number;
  activeBaseMap: BaseMap;
}

export type DrawingAction =
  | { type: "SET"; payload: Partial<DrawingState> }
  | { type: "RESET_AFTER_ADD"; isText: boolean };

export const INITIAL_DRAWING_STATE: DrawingState = {
  drawMode: "select",
  activeLabel: "",
  activeSourceText: "",
  activeSourceUrl: "",
  activeColor: COLORS.primary,
  activeOpacity: 1,
  activeSize: 1,
  activeShape: "circle",
  activeIcon: null,
  activeBorderColor: COLORS.white,
  activeBorderWidth: DEFAULT_BORDER_WIDTH,
  activeSmoothing: 0,
  activeStrokeWidth: 3,
  activeLineStyle: "solid",
  activeArrowStyle: "none",
  activeLineDecoration: "none",
  activeDecorationSpacing: 50,
  activeFillPattern: "none",
  activeTextContent: "",
  activeFontSize: 24,
  activeFontFamily: "sans",
  activeTextBorderEnabled: true,
  activeTextBorderColor: COLORS.white,
  activeTextBorderWidth: 2,
  activeBaseMap: BASE_MAPS[0],
};

export function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case "SET":
      return { ...state, ...action.payload };
    case "RESET_AFTER_ADD":
      return {
        ...state,
        drawMode: "select",
        activeLabel: "",
        activeSourceText: "",
        activeSourceUrl: "",
        ...(action.isText ? { activeTextContent: "" } : {}),
      };
  }
}
