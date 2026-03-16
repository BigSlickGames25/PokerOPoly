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
const BOARD_CARD_COUNT_PER_EDGE = 15;
const CORNER_SOCKET_CENTER_RATIO = 11.685852 / 150;
const CORNER_HOME_SIZE_RATIO = 12.371704 / 150;
const BOARD_TOKEN_ELEVATION = 0.56;
const homeSpaceIndexBySeat = [30, 15, 0, 45] as const;

const BOARD_HALF_SIZE = BOARD_TARGET_SIZE / 2;
const BOARD_TRACK_INSET = BOARD_TARGET_SIZE * CORNER_SOCKET_CENTER_RATIO;
const BOARD_HOME_SIZE = BOARD_TARGET_SIZE * CORNER_HOME_SIZE_RATIO;
const BOARD_HALF_HOME_SIZE = BOARD_HOME_SIZE / 2;
const BOARD_TRACK_LEFT_X = -BOARD_HALF_SIZE + BOARD_TRACK_INSET;
const BOARD_TRACK_RIGHT_X = BOARD_HALF_SIZE - BOARD_TRACK_INSET;
const BOARD_TRACK_TOP_Z = BOARD_HALF_SIZE - BOARD_TRACK_INSET;
const BOARD_TRACK_BOTTOM_Z = -BOARD_HALF_SIZE + BOARD_TRACK_INSET;
const MYSTERY_CARD_POSITIONS = new Set([4, 10]);

const propertyBlueprints = [
  {
    accentColor: "#7dd3fc",
    label: "Ace Avenue",
    price: 120,
    rent: 20
  },
  {
    accentColor: "#f59e0b",
    label: "Chip Stack Plaza",
    price: 160,
    rent: 28
  },
  {
    accentColor: "#0ea5e9",
    label: "Bluff Street",
    price: 180,
    rent: 32
  },
  {
    accentColor: "#34d399",
    label: "Pocket Pair Park",
    price: 200,
    rent: 36
  },
  {
    accentColor: "#60a5fa",
    label: "River Row",
    price: 220,
    rent: 40
  },
  {
    accentColor: "#fbbf24",
    label: "Big Blind Blvd",
    price: 240,
    rent: 46
  },
  {
    accentColor: "#fb7185",
    label: "Showdown Square",
    price: 260,
    rent: 50
  }
] as const;

const stationBlueprints = [
  {
    accentColor: "#f97316",
    label: "Rail Runner"
  },
  {
    accentColor: "#fb923c",
    label: "Showboat Station"
  },
  {
    accentColor: "#f59e0b",
    label: "Turntable Terminal"
  },
  {
    accentColor: "#fdba74",
    label: "Riverboat Stop"
  }
] as const;

const bonusBlueprints = [
  {
    accentColor: "#22c55e",
    label: "Jackpot Corner"
  },
  {
    accentColor: "#4ade80",
    label: "Free Parking"
  },
  {
    accentColor: "#10b981",
    label: "Side Pot Splash"
  },
  {
    accentColor: "#6ee7b7",
    label: "Winner's Pocket"
  }
] as const;

const taxBlueprints = [
  {
    accentColor: theme.colors.warning,
    label: "House Tax"
  },
  {
    accentColor: "#f59e0b",
    label: "Luxury Tax"
  },
  {
    accentColor: "#fb7185",
    label: "Blind Tax"
  },
  {
    accentColor: "#f97316",
    label: "Table Fee"
  }
] as const;

const playerSeatPalette: Record<BoardPlayerColor, string> = {
  amber: "#fbbf24",
  emerald: "#34d399",
  rose: "#fb7185",
  sky: "#38bdf8"
};

const tokenOffsets: BoardVector3[] = [
  { x: -0.12, y: 0, z: 0.1 },
  { x: 0.12, y: 0, z: 0.1 },
  { x: -0.12, y: 0, z: -0.1 },
  { x: 0.12, y: 0, z: -0.1 }
];

const homeWorldPositionBySeat: readonly BoardVector3[] = [
  { x: BOARD_TRACK_RIGHT_X, y: 0, z: BOARD_TRACK_BOTTOM_Z },
  { x: BOARD_TRACK_RIGHT_X, y: 0, z: BOARD_TRACK_TOP_Z },
  { x: BOARD_TRACK_LEFT_X, y: 0, z: BOARD_TRACK_TOP_Z },
  { x: BOARD_TRACK_LEFT_X, y: 0, z: BOARD_TRACK_BOTTOM_Z }
];

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function normalizeSeatIndex(seatIndex: number) {
  return ((seatIndex % homeSpaceIndexBySeat.length) + homeSpaceIndexBySeat.length) % homeSpaceIndexBySeat.length;
}

function normalizeSpaceIndex(spaceIndex: number, spaceCount: number) {
  if (spaceCount <= 0) {
    return 0;
  }

  return ((spaceIndex % spaceCount) + spaceCount) % spaceCount;
}

function getTrackRotation(sideIndex: number) {
  switch (sideIndex) {
    case 0:
      return 0;
    case 1:
      return -Math.PI / 2;
    case 2:
      return Math.PI;
    default:
      return Math.PI / 2;
  }
}

function createBoardTrackCenters() {
  const segments = [
    {
      endX: BOARD_TRACK_RIGHT_X - BOARD_HALF_HOME_SIZE,
      endZ: BOARD_TRACK_TOP_Z,
      startX: BOARD_TRACK_LEFT_X + BOARD_HALF_HOME_SIZE,
      startZ: BOARD_TRACK_TOP_Z
    },
    {
      endX: BOARD_TRACK_RIGHT_X,
      endZ: BOARD_TRACK_BOTTOM_Z + BOARD_HALF_HOME_SIZE,
      startX: BOARD_TRACK_RIGHT_X,
      startZ: BOARD_TRACK_TOP_Z - BOARD_HALF_HOME_SIZE
    },
    {
      endX: BOARD_TRACK_LEFT_X + BOARD_HALF_HOME_SIZE,
      endZ: BOARD_TRACK_BOTTOM_Z,
      startX: BOARD_TRACK_RIGHT_X - BOARD_HALF_HOME_SIZE,
      startZ: BOARD_TRACK_BOTTOM_Z
    },
    {
      endX: BOARD_TRACK_LEFT_X,
      endZ: BOARD_TRACK_TOP_Z - BOARD_HALF_HOME_SIZE,
      startX: BOARD_TRACK_LEFT_X,
      startZ: BOARD_TRACK_BOTTOM_Z + BOARD_HALF_HOME_SIZE
    }
  ] as const;

  return segments.flatMap((segment, sideIndex) =>
    Array.from({ length: BOARD_CARD_COUNT_PER_EDGE }, (_, sideSlotIndex) => {
      const progress = (sideSlotIndex + 0.5) / BOARD_CARD_COUNT_PER_EDGE;

      return {
        center: {
          x: lerp(segment.startX, segment.endX, progress),
          y: 0,
          z: lerp(segment.startZ, segment.endZ, progress)
        },
        index: sideIndex * BOARD_CARD_COUNT_PER_EDGE + sideSlotIndex,
        rotationY: getTrackRotation(sideIndex),
        sideIndex,
        sideSlotIndex
      };
    })
  );
}

function createBoardSpaceBlueprint(index: number, sideIndex: number, sideSlotIndex: number) {
  if (index === 0) {
    return {
      accentColor: theme.colors.accent,
      kind: "start",
      label: "Go All In",
      price: 0,
      rent: 0
    } as const;
  }

  if (MYSTERY_CARD_POSITIONS.has(sideSlotIndex)) {
    return {
      accentColor: "#38bdf8",
      kind: "chance",
      label: sideSlotIndex === 4 ? "Mystery Card" : "What Card",
      price: 0,
      rent: 0
    } as const;
  }

  if (sideSlotIndex === 6 || sideSlotIndex === 13) {
    const station = stationBlueprints[(sideIndex + sideSlotIndex) % stationBlueprints.length];

    return {
      accentColor: station.accentColor,
      kind: "station",
      label: station.label,
      price: 0,
      rent: 0
    } as const;
  }

  if (sideSlotIndex === 8) {
    const bonus = bonusBlueprints[sideIndex % bonusBlueprints.length];

    return {
      accentColor: bonus.accentColor,
      kind: "bonus",
      label: bonus.label,
      price: 0,
      rent: 0
    } as const;
  }

  if (sideSlotIndex === 9) {
    const tax = taxBlueprints[sideIndex % taxBlueprints.length];

    return {
      accentColor: tax.accentColor,
      kind: "tax",
      label: tax.label,
      price: 0,
      rent: 0
    } as const;
  }

  const property = propertyBlueprints[index % propertyBlueprints.length];
  const tier = Math.floor(index / propertyBlueprints.length);

  return {
    accentColor: property.accentColor,
    kind: "property",
    label: tier === 0 ? property.label : `${property.label} ${tier + 1}`,
    price: property.price + tier * 20,
    rent: property.rent + tier * 4
  } as const;
}

export const boardPlayerColors = playerSeatPalette;

export function createBoardSpaces() {
  return createBoardTrackCenters().map<BoardSpace>((slot) => {
    const tile = createBoardSpaceBlueprint(slot.index, slot.sideIndex, slot.sideSlotIndex);

    return {
      accentColor: tile.accentColor,
      center: slot.center,
      id: `space-${slot.index}`,
      index: slot.index,
      kind: tile.kind,
      label: tile.label,
      ownerId: null,
      price: tile.price,
      rent: tile.rent,
      rotationY: slot.rotationY
    };
  });
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
  seatIndex: number,
  lastRoll: [number, number] | null
) {
  const normalizedSeatIndex = normalizeSeatIndex(seatIndex);
  const normalizedSpaceIndex = normalizeSpaceIndex(tokenSpaceIndex, spaces.length);
  const homeSpaceIndex = homeSpaceIndexBySeat[normalizedSeatIndex];

  if (lastRoll === null && normalizedSpaceIndex === homeSpaceIndex) {
    const homePosition = homeWorldPositionBySeat[normalizedSeatIndex];

    return {
      x: homePosition.x,
      y: BOARD_TOKEN_ELEVATION,
      z: homePosition.z
    };
  }

  const base = spaces[normalizedSpaceIndex]?.center ?? {
    x: 0,
    y: 0,
    z: 0
  };
  const offset = tokenOffsets[normalizedSeatIndex];

  return {
    x: base.x + offset.x,
    y: BOARD_TOKEN_ELEVATION,
    z: base.z + offset.z
  };
}

