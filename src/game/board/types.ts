export type BoardTransportMode = "hub" | "hub-fallback" | "mock";
export type BoardConnectionState = "connecting" | "connected" | "degraded";
export type BoardMatchPhase =
  | "lobby"
  | "rolling"
  | "purchase"
  | "resolving"
  | "finished";
export type BoardSpaceKind =
  | "bonus"
  | "chance"
  | "property"
  | "start"
  | "station"
  | "tax";
export type BoardPlayerColor = "amber" | "emerald" | "rose" | "sky";
export type BoardLogTone = "info" | "positive" | "warning";

export interface BoardVector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoardSpace {
  accentColor: string;
  center: BoardVector3;
  id: string;
  index: number;
  kind: BoardSpaceKind;
  label: string;
  ownerId: string | null;
  price: number;
  rent: number;
  rotationY: number;
}

export interface BoardPlayerState {
  bankroll: number;
  colorHex: string;
  colorName: BoardPlayerColor;
  connected: boolean;
  displayName: string;
  id: string;
  isLocal: boolean;
  lastRoll: [number, number] | null;
  ready: boolean;
  seatIndex: number;
  status: string;
  tokenSpaceIndex: number;
}

export interface BoardLogEntry {
  id: string;
  message: string;
  timestamp: string;
  tone: BoardLogTone;
}

export interface BoardEngineMeta {
  assetMode: "glb-ready-procedural-dev";
  renderer: "react-three-fiber";
  runtime: "expo-native-web";
}

export interface BoardPendingPurchase {
  playerId: string;
  spaceIndex: number;
}

export interface BoardMatchSnapshot {
  activity: BoardLogEntry[];
  connectionState: BoardConnectionState;
  currentTurnPlayerId: string | null;
  diagnostics: string[];
  dice: [number, number] | null;
  engine: BoardEngineMeta;
  localPlayerId: string;
  matchId: string;
  pendingPurchase: BoardPendingPurchase | null;
  phase: BoardMatchPhase;
  players: BoardPlayerState[];
  roomCode: string;
  spaces: BoardSpace[];
  startedAt: string;
  transportMode: BoardTransportMode;
  turnNumber: number;
}

export type BoardSessionAction =
  | { type: "buy-space" }
  | { type: "end-turn" }
  | { type: "pass-space" }
  | { type: "reset-match" }
  | { type: "roll-dice" }
  | { type: "toggle-ready" };

export interface BoardSessionController {
  destroy: () => void;
  dispatch: (action: BoardSessionAction) => Promise<void>;
  getSnapshot: () => BoardMatchSnapshot;
  subscribe: (listener: (snapshot: BoardMatchSnapshot) => void) => () => void;
}

export interface CreateBoardSessionControllerOptions {
  diagnostics?: string[];
  localDisplayName: string;
  localPlayerId: string;
  roomCode?: string;
}
