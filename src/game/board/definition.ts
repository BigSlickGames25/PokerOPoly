import { theme } from "../../theme";
import type {
  BoardConnectionState,
  BoardMatchSnapshot,
  BoardPlayerColor,
  BoardPlayerState,
  BoardSpace,
  BoardTransportMode,
  BoardVector3
} from "./types";

const BOARD_TARGET_SIZE = 10.8;
const CORNER_SOCKET_CENTER_RATIO = 11.685852 / 150;
const BOARD_TRACK_EDGE = BOARD_TARGET_SIZE * (0.5 - CORNER_SOCKET_CENTER_RATIO);
const BOARD_TRACK_HALF = BOARD_TRACK_EDGE / 2;
const homeSpaceIndexBySeat = [8, 4, 0, 12] as const;

const perimeterCoordinates = [
  { x: -BOARD_TRACK_EDGE, z: BOARD_TRACK_EDGE },
  { x: -BOARD_TRACK_HALF, z: BOARD_TRACK_EDGE },
  { x: 0, z: BOARD_TRACK_EDGE },
  { x: BOARD_TRACK_HALF, z: BOARD_TRACK_EDGE },
  { x: BOARD_TRACK_EDGE, z: BOARD_TRACK_EDGE },
  { x: BOARD_TRACK_EDGE, z: BOARD_TRACK_HALF },
  { x: BOARD_TRACK_EDGE, z: 0 },
  { x: BOARD_TRACK_EDGE, z: -BOARD_TRACK_HALF },
  { x: BOARD_TRACK_EDGE, z: -BOARD_TRACK_EDGE },
  { x: BOARD_TRACK_HALF, z: -BOARD_TRACK_EDGE },
  { x: 0, z: -BOARD_TRACK_EDGE },
  { x: -BOARD_TRACK_HALF, z: -BOARD_TRACK_EDGE },
  { x: -BOARD_TRACK_EDGE, z: -BOARD_TRACK_EDGE },
  { x: -BOARD_TRACK_EDGE, z: -BOARD_TRACK_HALF },
  { x: -BOARD_TRACK_EDGE, z: 0 },
  { x: -BOARD_TRACK_EDGE, z: BOARD_TRACK_HALF }
] as const;

const tileBlueprints = [
  {
    accentColor: theme.colors.accent,
    kind: "start",
    label: "Go All In",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#7dd3fc",
    kind: "property",
    label: "Ace Avenue",
    price: 120,
    rent: 20
  },
  {
    accentColor: "#38bdf8",
    kind: "chance",
    label: "Community Pot",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#f59e0b",
    kind: "property",
    label: "Chip Stack Plaza",
    price: 160,
    rent: 28
  },
  {
    accentColor: "#22c55e",
    kind: "bonus",
    label: "Jackpot Corner",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#0ea5e9",
    kind: "property",
    label: "Bluff Street",
    price: 180,
    rent: 32
  },
  {
    accentColor: theme.colors.warning,
    kind: "tax",
    label: "House Tax",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#f97316",
    kind: "station",
    label: "Rail Runner",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#22c55e",
    kind: "bonus",
    label: "Free Parking",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#34d399",
    kind: "property",
    label: "Pocket Pair Park",
    price: 200,
    rent: 36
  },
  {
    accentColor: "#38bdf8",
    kind: "chance",
    label: "Chance Deck",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#60a5fa",
    kind: "property",
    label: "River Row",
    price: 220,
    rent: 40
  },
  {
    accentColor: "#f97316",
    kind: "station",
    label: "Showboat Station",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#fbbf24",
    kind: "property",
    label: "Big Blind Blvd",
    price: 240,
    rent: 46
  },
  {
    accentColor: theme.colors.warning,
    kind: "tax",
    label: "Luxury Tax",
    price: 0,
    rent: 0
  },
  {
    accentColor: "#fb7185",
    kind: "property",
    label: "Showdown Square",
    price: 260,
    rent: 50
  }
] as const;

const playerSeatPalette: Record<BoardPlayerColor, string> = {
  amber: "#fbbf24",
  emerald: "#34d399",
  rose: "#fb7185",
  sky: "#38bdf8"
};

const tokenOffsets: BoardVector3[] = [
  { x: -0.34, y: 0, z: 0.28 },
  { x: 0.34, y: 0, z: 0.28 },
  { x: -0.34, y: 0, z: -0.28 },
  { x: 0.34, y: 0, z: -0.28 }
];

function getTileRotation(index: number) {
  if (index <= 4) {
    return 0;
  }

  if (index <= 7) {
    return -Math.PI / 2;
  }

  if (index <= 12) {
    return Math.PI;
  }

  return Math.PI / 2;
}

export const boardPlayerColors = playerSeatPalette;

export function createBoardSpaces() {
  return tileBlueprints.map<BoardSpace>((tile, index) => ({
    accentColor: tile.accentColor,
    center: {
      x: perimeterCoordinates[index].x,
      y: 0,
      z: perimeterCoordinates[index].z
    },
    id: `space-${index}`,
    index,
    kind: tile.kind,
    label: tile.label,
    ownerId: null,
    price: tile.price,
    rent: tile.rent,
    rotationY: getTileRotation(index)
  }));
}

export function createBoardPlayers(
  localPlayerId: string,
  localDisplayName: string
) {
  const seats: Array<{
    colorName: BoardPlayerColor;
    displayName: string;
    id: string;
    isLocal: boolean;
  }> = [
    {
      colorName: "sky",
      displayName: localDisplayName,
      id: localPlayerId,
      isLocal: true
    },
    {
      colorName: "amber",
      displayName: "Ava Banks",
      id: "remote-ava",
      isLocal: false
    },
    {
      colorName: "rose",
      displayName: "Mason Deck",
      id: "remote-mason",
      isLocal: false
    },
    {
      colorName: "emerald",
      displayName: "Riley Stack",
      id: "remote-riley",
      isLocal: false
    }
  ];

  return seats.map<BoardPlayerState>((player, seatIndex) => ({
    bankroll: 1500,
    colorHex: playerSeatPalette[player.colorName],
    colorName: player.colorName,
    connected: player.isLocal,
    displayName: player.displayName,
    id: player.id,
    isLocal: player.isLocal,
    lastRoll: null,
    ready: false,
    seatIndex,
    status: player.isLocal ? "Ready when you are" : "Joining table...",
    tokenSpaceIndex: homeSpaceIndexBySeat[seatIndex] ?? 0
  }));
}

export function createBoardSnapshot({
  connectionState,
  diagnostics = [],
  localDisplayName,
  localPlayerId,
  roomCode = "PKR-2048",
  transportMode
}: {
  connectionState: BoardConnectionState;
  diagnostics?: string[];
  localDisplayName: string;
  localPlayerId: string;
  roomCode?: string;
  transportMode: BoardTransportMode;
}): BoardMatchSnapshot {
  return {
    activity: [
      {
        id: "boot-log",
        message:
          "Development table online. Local mock state drives gameplay until the hub transport is enabled.",
        timestamp: new Date().toISOString(),
        tone: "info"
      }
    ],
    connectionState,
    currentTurnPlayerId: null,
    diagnostics,
    dice: null,
    engine: {
      assetMode: "glb-ready-procedural-dev",
      renderer: "react-three-fiber",
      runtime: "expo-native-web"
    },
    localPlayerId,
    matchId: `match-${roomCode.toLowerCase()}`,
    phase: "lobby",
    players: createBoardPlayers(localPlayerId, localDisplayName),
    roomCode,
    spaces: createBoardSpaces(),
    startedAt: new Date().toISOString(),
    transportMode,
    turnNumber: 1
  };
}

export function getTokenWorldPosition(
  spaces: BoardSpace[],
  tokenSpaceIndex: number,
  seatIndex: number
) {
  const base = spaces[tokenSpaceIndex % spaces.length]?.center ?? {
    x: 0,
    y: 0,
    z: 0
  };
  const homeSpaceIndex = homeSpaceIndexBySeat[seatIndex % homeSpaceIndexBySeat.length];
  const offset =
    tokenSpaceIndex === homeSpaceIndex
      ? { x: 0, y: 0, z: 0 }
      : tokenOffsets[seatIndex % tokenOffsets.length];

  return {
    x: base.x + offset.x,
    y: 0.42,
    z: base.z + offset.z
  };
}

