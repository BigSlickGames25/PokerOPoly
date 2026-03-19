export type ScreenElementAlignX = "left" | "center" | "right";
export type ScreenElementAlignY = "top" | "center" | "bottom";

export interface ScreenElementDefinition {
  id: string;
  presetId: string;
  label: string;
  category: string;
  shape: string;
  alignX: ScreenElementAlignX;
  alignY: ScreenElementAlignY;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ScreenDefinition {
  id: string;
  name: string;
  elements: ScreenElementDefinition[];
}

export interface ScreenDocument {
  screens: ScreenDefinition[];
}
