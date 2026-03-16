import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  ExtrudeGeometry,
  Group,
  MathUtils,
  MeshBasicMaterial,
  type Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
  type Object3D
} from "three";
import helvetikerBoldFontData from "three/examples/fonts/helvetiker_bold.typeface.json";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import boardMtlSource from "../../assets/models/board.mtl";
import boardObjSource from "../../assets/models/board.obj";
import pointMtlSource from "../../assets/models/point.mtl";
import pointObjSource from "../../assets/models/point.obj";
import questionMtlSource from "../../assets/models/question.mtl";
import questionObjSource from "../../assets/models/question.obj";
import squareMtlSource from "../../assets/models/Square.mtl";
import squareObjSource from "../../assets/models/Square.obj";
import whatMtlSource from "../../assets/models/what.mtl";
import whatObjSource from "../../assets/models/what.obj";
import { theme } from "../theme";

const BOARD_TARGET_SIZE = 10.8;
const BOARD_CARD_COUNT_PER_EDGE = 15;
const BOARD_CARD_ELEVATION = 0.45;
const BOARD_CARD_THICKNESS = 0.9;
const MYSTERY_CARD_POSITIONS = [4, 10];
const CORNER_SOCKET_CENTER_RATIO = 11.685852 / 150;
const CORNER_SOCKET_CUBE_SIZE_RATIO = 4.25 / 150;
const CORNER_SOCKET_DEPTH_RATIO = 2.35 / 6;
const CORNER_SOCKET_GLOW_SCALE = 1.34;
const CARD_DEAL_START_DELAY_SECONDS = 0.36;
const CARD_DEAL_WAVE_STEP_SECONDS = 0.03;
const CARD_DEAL_DURATION_SECONDS = 0.88;
const CARD_DEAL_SOURCE_HEIGHT = 1.88;
const CARD_DEAL_SOURCE_SPREAD = 0.22;
const CARD_DEAL_ARC_MIN = 0.64;
const CARD_DEAL_ARC_MAX = 0.92;
const CARD_DEAL_WAVE_MIN = 0.08;
const CARD_DEAL_WAVE_MAX = 0.18;
const CARD_DEAL_RIBBON_WIDTH = 4;
const CARD_DEAL_TRAIL_DISTANCE = 0.14;
const CARD_FACE_DEPTH = 0.024;
const MYSTERY_BOB_SPEED = 3.2;
const MYSTERY_SPIN_SPEED = 1.8;
const ACTIVE_SUIT_BY_SEAT: BoardSuit[] = ["diamonds", "hearts", "clubs", "spades"];
const STANDARD_CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
] as const;
const STANDARD_CARD_SUITS: BoardSuit[] = ["clubs", "diamonds", "hearts", "spades"];
const CARD_FONT = new FontLoader().parse(
  helvetikerBoldFontData as Parameters<FontLoader["parse"]>[0]
);

type BoardSuit = "clubs" | "diamonds" | "hearts" | "spades";
type MysterySymbol = "question" | "what";
type StandardCardRank = (typeof STANDARD_CARD_RANKS)[number];

interface ImportedAsset {
  center: [number, number, number];
  object: Group;
  offset: [number, number, number];
  size: [number, number, number];
}

interface MysteryAssetSet {
  point: ImportedAsset | null;
  question: ImportedAsset | null;
  what: ImportedAsset | null;
}

interface StandardCardFace {
  accentColor: string;
  cardId: string;
  inkColor: string;
  rank: StandardCardRank;
  suit: BoardSuit;
}

interface SuitSocketSpec {
  assetModel: ImportedAsset | null;
  bodyColor: string;
  glowColor: string;
  position: [number, number, number];
  size: number;
  suit: BoardSuit;
}

interface BoardCardSpec {
  dealArcHeight: number;
  dealDelaySeconds: number;
  dealIndex: number | null;
  dealSourceOffset: [number, number, number];
  dealStartRotation: [number, number, number];
  dealWavePhase: number;
  dealWaveSpread: number;
  face: StandardCardFace | null;
  isMystery: boolean;
  mysteryKind: MysterySymbol | null;
  position: [number, number, number];
  rotationZ: number;
  size: [number, number, number];
}

interface NormalizedBoardModel {
  cards: BoardCardSpec[];
  mysteryAssets: MysteryAssetSet;
  object: Group;
  offset: [number, number, number];
  scale: number;
  suitSockets: SuitSocketSpec[];
}

function createPoint(x: number, y: number, z: number): [number, number, number] {
  return [x, y, z];
}

function getActiveSuit(activeSeatIndex?: number | null) {
  if (activeSeatIndex === null || activeSeatIndex === undefined) {
    return null;
  }

  return ACTIVE_SUIT_BY_SEAT[
    ((activeSeatIndex % ACTIVE_SUIT_BY_SEAT.length) + ACTIVE_SUIT_BY_SEAT.length) %
      ACTIVE_SUIT_BY_SEAT.length
  ];
}

function shuffleArray<T>(values: T[]) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const nextValue = copy[index];

    copy[index] = copy[swapIndex];
    copy[swapIndex] = nextValue;
  }

  return copy;
}

function isDistinctImportedAsset(
  candidate: ImportedAsset | null,
  reference: ImportedAsset | null
) {
  if (!candidate) {
    return false;
  }

  if (!reference) {
    return true;
  }

  const totalDelta =
    Math.abs(candidate.center[0] - reference.center[0]) +
    Math.abs(candidate.center[1] - reference.center[1]) +
    Math.abs(candidate.center[2] - reference.center[2]) +
    Math.abs(candidate.size[0] - reference.size[0]) +
    Math.abs(candidate.size[1] - reference.size[1]) +
    Math.abs(candidate.size[2] - reference.size[2]);

  return totalDelta > 0.35;
}

function getCardInkColor(suit: BoardSuit) {
  switch (suit) {
    case "clubs":
      return "#10b981";
    case "diamonds":
      return "#0284c7";
    case "hearts":
      return "#e11d48";
    case "spades":
      return "#0f172a";
  }
}

function getCardAccentColor(suit: BoardSuit) {
  switch (suit) {
    case "clubs":
      return "#d1fae5";
    case "diamonds":
      return "#dbeafe";
    case "hearts":
      return "#ffe4e6";
    case "spades":
      return "#e2e8f0";
  }
}

function createStandardDeck() {
  return STANDARD_CARD_SUITS.flatMap((suit) =>
    STANDARD_CARD_RANKS.map((rank) => ({
      accentColor: getCardAccentColor(suit),
      cardId: `${rank}-${suit}`,
      inkColor: getCardInkColor(suit),
      rank,
      suit
    } satisfies StandardCardFace))
  );
}

function applyBoardMaterial(object: Object3D) {
  const boardMaterial = new MeshStandardMaterial({
    color: "#0b1728",
    emissive: theme.colors.accent,
    emissiveIntensity: 0.03,
    metalness: 0.18,
    roughness: 0.76
  });

  object.traverse((child) => {
    if (!("isMesh" in child) || !child.isMesh) {
      return;
    }

    const mesh = child as Mesh;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = boardMaterial;
  });
}

function buildImportedAsset({
  bodyColor,
  glowColor,
  mtlSource,
  objSource,
  warningLabel
}: {
  bodyColor: string;
  glowColor: string;
  mtlSource: string;
  objSource: string;
  warningLabel: string;
}) {
  try {
    const materialCreator = new MTLLoader().parse(mtlSource, "");
    materialCreator.preload();

    const object = new OBJLoader()
      .setMaterials(materialCreator)
      .parse(objSource);
    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const assetMaterial = new MeshStandardMaterial({
      color: bodyColor,
      emissive: glowColor,
      emissiveIntensity: 0.9,
      metalness: 0.2,
      roughness: 0.24
    });

    object.traverse((child) => {
      if (!("isMesh" in child) || !child.isMesh) {
        return;
      }

      const mesh = child as Mesh;

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = assetMaterial;
    });

    return {
      center: createPoint(center.x, center.y, center.z),
      object,
      offset: createPoint(-center.x, -center.y, -center.z),
      size: createPoint(size.x, size.y, size.z)
    } satisfies ImportedAsset;
  } catch (error) {
    console.warn(warningLabel, error);
    return null;
  }
}

function createSuitSockets(bounds: Box3, size: Vector3) {
  const insetX = size.x * CORNER_SOCKET_CENTER_RATIO;
  const insetY = size.y * CORNER_SOCKET_CENTER_RATIO;
  const glowSize = Math.min(size.x, size.y) * CORNER_SOCKET_CUBE_SIZE_RATIO;
  const socketDepth = size.z * CORNER_SOCKET_DEPTH_RATIO;
  const positions = {
    backLeft: createPoint(
      bounds.min.x + insetX,
      bounds.max.y - insetY,
      bounds.max.z - socketDepth
    ),
    backRight: createPoint(
      bounds.max.x - insetX,
      bounds.max.y - insetY,
      bounds.max.z - socketDepth
    ),
    frontLeft: createPoint(
      bounds.min.x + insetX,
      bounds.min.y + insetY,
      bounds.max.z - socketDepth
    ),
    frontRight: createPoint(
      bounds.max.x - insetX,
      bounds.min.y + insetY,
      bounds.max.z - socketDepth
    )
  };

  return [
    {
      assetModel: buildImportedAsset({
        bodyColor: "#34d399",
        glowColor: "#6ee7b7",
        mtlSource: squareMtlSource,
        objSource: squareObjSource,
        warningLabel: "Unable to parse clubs corner asset."
      }),
      bodyColor: "#34d399",
      glowColor: "#6ee7b7",
      position: positions.backLeft,
      size: glowSize,
      suit: "clubs"
    },
    {
      assetModel: buildImportedAsset({
        bodyColor: "#fb7185",
        glowColor: "#fda4af",
        mtlSource: squareMtlSource,
        objSource: squareObjSource,
        warningLabel: "Unable to parse hearts corner asset."
      }),
      bodyColor: "#fb7185",
      glowColor: "#fda4af",
      position: positions.backRight,
      size: glowSize,
      suit: "hearts"
    },
    {
      assetModel: buildImportedAsset({
        bodyColor: "#cbd5f5",
        glowColor: "#e2e8f0",
        mtlSource: squareMtlSource,
        objSource: squareObjSource,
        warningLabel: "Unable to parse spades corner asset."
      }),
      bodyColor: "#cbd5f5",
      glowColor: "#e2e8f0",
      position: positions.frontLeft,
      size: glowSize,
      suit: "spades"
    },
    {
      assetModel: buildImportedAsset({
        bodyColor: "#38bdf8",
        glowColor: "#7dd3fc",
        mtlSource: squareMtlSource,
        objSource: squareObjSource,
        warningLabel: "Unable to parse diamonds corner asset."
      }),
      bodyColor: "#38bdf8",
      glowColor: "#7dd3fc",
      position: positions.frontRight,
      size: glowSize,
      suit: "diamonds"
    }
  ] satisfies SuitSocketSpec[];
}

function createBoardCards(bounds: Box3, size: Vector3, cornerWidth: number) {
  const insetX = size.x * CORNER_SOCKET_CENTER_RATIO;
  const insetY = size.y * CORNER_SOCKET_CENTER_RATIO;
  const leftX = bounds.min.x + insetX;
  const rightX = bounds.max.x - insetX;
  const topY = bounds.max.y - insetY;
  const bottomY = bounds.min.y + insetY;
  const halfCorner = cornerWidth / 2;
  const segments = [
    {
      end: createPoint(rightX - halfCorner, topY, BOARD_CARD_ELEVATION),
      rotationZ: 0,
      start: createPoint(leftX + halfCorner, topY, BOARD_CARD_ELEVATION)
    },
    {
      end: createPoint(rightX, bottomY + halfCorner, BOARD_CARD_ELEVATION),
      rotationZ: -Math.PI / 2,
      start: createPoint(rightX, topY - halfCorner, BOARD_CARD_ELEVATION)
    },
    {
      end: createPoint(leftX + halfCorner, bottomY, BOARD_CARD_ELEVATION),
      rotationZ: Math.PI,
      start: createPoint(rightX - halfCorner, bottomY, BOARD_CARD_ELEVATION)
    },
    {
      end: createPoint(leftX, topY - halfCorner, BOARD_CARD_ELEVATION),
      rotationZ: Math.PI / 2,
      start: createPoint(leftX, bottomY + halfCorner, BOARD_CARD_ELEVATION)
    }
  ];

  const segmentLengths = segments.map((segment) =>
    Math.hypot(segment.end[0] - segment.start[0], segment.end[1] - segment.start[1])
  );
  const cardSpacing = Math.min(...segmentLengths) / BOARD_CARD_COUNT_PER_EDGE;
  const cardLength = Math.min(cardSpacing * 0.82, cornerWidth * 1.56);
  const cardWidth = cornerWidth * 0.82;
  const cards: BoardCardSpec[] = [];

  segments.forEach((segment, segmentIndex) => {
    const segmentLength = segmentLengths[segmentIndex];

    for (let cardIndex = 0; cardIndex < BOARD_CARD_COUNT_PER_EDGE; cardIndex += 1) {
      const progress = (cardIndex + 0.5) / BOARD_CARD_COUNT_PER_EDGE;
      const x = MathUtils.lerp(segment.start[0], segment.end[0], progress);
      const y = MathUtils.lerp(segment.start[1], segment.end[1], progress);

      cards.push({
        dealArcHeight: 0,
        dealDelaySeconds: 0,
        dealIndex: null,
        dealSourceOffset: createPoint(0, 0, 0),
        dealStartRotation: createPoint(0, 0, segment.rotationZ),
        dealWavePhase: 0,
        dealWaveSpread: 0,
        face: null,
        isMystery: MYSTERY_CARD_POSITIONS.includes(cardIndex),
        mysteryKind: null,
        position: createPoint(x, y, BOARD_CARD_ELEVATION),
        rotationZ: segment.rotationZ,
        size: createPoint(
          Math.min(cardLength, (segmentLength / BOARD_CARD_COUNT_PER_EDGE) * 0.82),
          cardWidth,
          BOARD_CARD_THICKNESS
        )
      });
    }
  });

  return cards;
}

function assignMysterySymbols(cards: BoardCardSpec[]) {
  const mysteryIndices = cards
    .map((card, index) => (card.isMystery ? index : -1))
    .filter((index) => index >= 0);
  const mysteryOrder = shuffleArray<MysterySymbol>([
    "question",
    "question",
    "question",
    "question",
    "what",
    "what",
    "what",
    "what"
  ]);

  return cards.map((card, index) => {
    if (!card.isMystery) {
      return {
        ...card,
        mysteryKind: null
      };
    }

    const orderIndex = mysteryIndices.indexOf(index);

    return {
      ...card,
      mysteryKind: mysteryOrder[orderIndex] ?? null
    };
  });
}

function assignStandardDeck(cards: BoardCardSpec[]) {
  const shuffledDeck = shuffleArray(createStandardDeck());
  const standardCardIndices = cards
    .map((card, index) => (card.isMystery ? -1 : index))
    .filter((index) => index >= 0);
  const cardAssignments = new Map<number, { dealIndex: number; face: StandardCardFace }>();

  standardCardIndices.forEach((cardIndex, dealIndex) => {
    const face = shuffledDeck[dealIndex];

    if (!face) {
      return;
    }

    cardAssignments.set(cardIndex, {
      dealIndex,
      face
    });
  });

  return cards.map((card, index) => {
    const assignment = cardAssignments.get(index);

    if (!assignment) {
      return {
        ...card,
        dealArcHeight: 0,
        dealDelaySeconds: 0,
        dealIndex: null,
        dealSourceOffset: createPoint(0, 0, 0),
        dealStartRotation: createPoint(0, 0, card.rotationZ),
        dealWavePhase: 0,
        dealWaveSpread: 0,
        face: null
      } satisfies BoardCardSpec;
    }

    const ribbonColumn = assignment.dealIndex % CARD_DEAL_RIBBON_WIDTH;
    const ribbonRow = Math.floor(assignment.dealIndex / CARD_DEAL_RIBBON_WIDTH);
    const ribbonT =
      CARD_DEAL_RIBBON_WIDTH <= 1
        ? 0
        : ribbonColumn / (CARD_DEAL_RIBBON_WIDTH - 1) - 0.5;
    const waveT =
      standardCardIndices.length <= 1
        ? 0
        : assignment.dealIndex / (standardCardIndices.length - 1);
    const sweepWave = Math.sin(waveT * Math.PI);

    return {
      ...card,
      dealArcHeight:
        MathUtils.lerp(CARD_DEAL_ARC_MIN, CARD_DEAL_ARC_MAX, sweepWave) +
        Math.abs(ribbonT) * 0.04,
      dealDelaySeconds: assignment.dealIndex * CARD_DEAL_WAVE_STEP_SECONDS,
      dealIndex: assignment.dealIndex,
      dealSourceOffset: createPoint(
        ribbonT * CARD_DEAL_SOURCE_SPREAD,
        -0.16 + ribbonRow * 0.014,
        ribbonRow * 0.012
      ),
      dealStartRotation: createPoint(Math.PI * 0.46, ribbonT * 0.22, ribbonT * 0.16),
      dealWavePhase: waveT * Math.PI * 1.4 + ribbonColumn * 0.45,
      dealWaveSpread: MathUtils.lerp(CARD_DEAL_WAVE_MIN, CARD_DEAL_WAVE_MAX, sweepWave),
      face: assignment.face
    } satisfies BoardCardSpec;
  });
}

function buildBoardModel() {
  try {
    const materialCreator = new MTLLoader().parse(boardMtlSource, "");
    materialCreator.preload();

    const object = new OBJLoader()
      .setMaterials(materialCreator)
      .parse(boardObjSource);
    const bounds = new Box3().setFromObject(object);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = BOARD_TARGET_SIZE / Math.max(size.x, size.y, 1);

    applyBoardMaterial(object);

    const suitSockets = createSuitSockets(bounds, size);
    const questionAsset = buildImportedAsset({
      bodyColor: theme.colors.surface,
      glowColor: theme.colors.surface,
      mtlSource: questionMtlSource,
      objSource: questionObjSource,
      warningLabel: "Unable to parse mystery question asset."
    });
    const rawPointAsset = buildImportedAsset({
      bodyColor: theme.colors.surface,
      glowColor: theme.colors.surface,
      mtlSource: pointMtlSource,
      objSource: pointObjSource,
      warningLabel: "Unable to parse mystery point asset."
    });
    const pointAsset = isDistinctImportedAsset(rawPointAsset, questionAsset)
      ? rawPointAsset
      : null;
    const mysteryAssets = {
      point: pointAsset,
      question: questionAsset,
      what: buildImportedAsset({
        bodyColor: theme.colors.surface,
        glowColor: theme.colors.surface,
        mtlSource: whatMtlSource,
        objSource: whatObjSource,
        warningLabel: "Unable to parse mystery what asset."
      })
    } satisfies MysteryAssetSet;
    const cornerWidth = suitSockets[0]?.assetModel?.size[0] ?? 12.371704;

    if (rawPointAsset && !pointAsset) {
      console.warn(
        "Mystery point asset matches the question mesh bounds. Using a procedural point until point.obj is distinct."
      );
    }

    return {
      cards: assignStandardDeck(
        assignMysterySymbols(createBoardCards(bounds, size, cornerWidth))
      ),
      mysteryAssets,
      object,
      offset: [-center.x, -center.y, -bounds.max.z],
      scale,
      suitSockets
    } satisfies NormalizedBoardModel;
  } catch (error) {
    console.warn("Unable to parse board.obj, falling back to procedural board.", error);
    return null;
  }
}

function ProceduralBoardSurface() {
  return (
    <>
      <mesh castShadow receiveShadow position={[0, 0, -0.22]}>
        <boxGeometry args={[BOARD_TARGET_SIZE, BOARD_TARGET_SIZE, 0.44]} />
        <meshStandardMaterial color="#0b1728" metalness={0.12} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.02]} receiveShadow>
        <boxGeometry args={[9.7, 9.7, 0.04]} />
        <meshStandardMaterial color="#13243b" metalness={0.18} roughness={0.66} />
      </mesh>
    </>
  );
}

function ProceduralMysteryGlyph({ card }: { card: BoardCardSpec }) {
  const spinRef = useRef<Group>(null);
  const glyphRadius = Math.min(card.size[0], card.size[1]) * 0.22;
  const glyphTube = glyphRadius * 0.24;
  const glyphHeight = card.size[2] / 2 + glyphTube * 0.6;
  const pointHeight = card.size[2] / 2 + glyphTube * 0.14;

  useFrame(({ clock }, deltaSeconds) => {
    if (!spinRef.current) {
      return;
    }

    spinRef.current.rotation.z += deltaSeconds * MYSTERY_SPIN_SPEED;
    spinRef.current.position.z =
      Math.sin(clock.elapsedTime * MYSTERY_BOB_SPEED) * glyphTube * 0.12;
  });

  return (
    <group ref={spinRef}>
      <group position={[0, 0, glyphHeight]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, glyphRadius * 0.44, 0]} rotation={[0, 0, Math.PI * 0.72]}>
            <torusGeometry args={[glyphRadius, glyphTube, 10, 36, Math.PI * 1.45]} />
            <meshStandardMaterial
              color={theme.colors.surface}
              emissive={theme.colors.surface}
              emissiveIntensity={0.18}
              metalness={0.12}
              roughness={0.28}
            />
          </mesh>
          <mesh position={[glyphRadius * 0.36, -glyphRadius * 0.14, 0]}>
            <boxGeometry args={[glyphTube * 1.1, glyphRadius * 1.05, glyphTube * 1.1]} />
            <meshStandardMaterial
              color={theme.colors.surface}
              emissive={theme.colors.surface}
              emissiveIntensity={0.18}
              metalness={0.12}
              roughness={0.28}
            />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 0, pointHeight]} castShadow>
        <sphereGeometry args={[glyphTube * 0.72, 18, 18]} />
        <meshStandardMaterial
          color={theme.colors.surface}
          emissive={theme.colors.surface}
          emissiveIntensity={0.16}
          metalness={0.08}
          roughness={0.26}
        />
      </mesh>
    </group>
  );
}

function getMysteryAssets(kind: MysterySymbol | null, mysteryAssets: MysteryAssetSet) {
  if (kind === "question") {
    return {
      primary: mysteryAssets.question,
      secondary: mysteryAssets.point
    };
  }

  if (kind === "what") {
    return {
      primary: mysteryAssets.what,
      secondary: mysteryAssets.point
    };
  }

  return {
    primary: null,
    secondary: null
  };
}

function MysteryCardGlyph({
  card,
  mysteryAssets
}: {
  card: BoardCardSpec;
  mysteryAssets: MysteryAssetSet;
}) {
  const spinRef = useRef<Group>(null);
  const primaryCloneRef = useRef<Group | null>(null);
  const secondaryCloneRef = useRef<Group | null>(null);
  const { primary, secondary } = getMysteryAssets(card.mysteryKind, mysteryAssets);
  const baseSize = Math.min(card.size[0], card.size[1]);
  const primaryScale = primary
    ? Math.min(
        (baseSize * 0.58) / Math.max(primary.size[0], 1),
        (baseSize * 0.94) / Math.max(primary.size[2], 1)
      )
    : 1;
  const pointScale = secondary
    ? Math.min(
        (baseSize * 0.18) / Math.max(secondary.size[0], 1),
        (baseSize * 0.18) / Math.max(secondary.size[2], 1)
      )
    : 1;
  const primaryHeight = primary ? primary.size[2] * primaryScale : baseSize * 0.6;
  const pointHeight = secondary ? secondary.size[2] * pointScale : baseSize * 0.16;
  const primaryCenterHeight = card.size[2] / 2 + baseSize * 0.18 + primaryHeight / 2;
  const pointCenterHeight = card.size[2] / 2 + baseSize * 0.02 + pointHeight / 2;

  if (primary && !primaryCloneRef.current) {
    primaryCloneRef.current = primary.object.clone(true);
  }

  if (secondary && !secondaryCloneRef.current) {
    secondaryCloneRef.current = secondary.object.clone(true);
  }

  useFrame(({ clock }, deltaSeconds) => {
    if (!spinRef.current) {
      return;
    }

    spinRef.current.rotation.z += deltaSeconds * MYSTERY_SPIN_SPEED;
    spinRef.current.position.z =
      Math.sin(clock.elapsedTime * MYSTERY_BOB_SPEED) * baseSize * 0.045;
  });

  if (!primary || !primaryCloneRef.current) {
    return <ProceduralMysteryGlyph card={card} />;
  }

  return (
    <group ref={spinRef}>
      <group position={[0, 0, primaryCenterHeight]} scale={primaryScale}>
        <primitive
          dispose={null}
          object={primaryCloneRef.current}
          position={primary.offset}
        />
      </group>
      {secondary && secondaryCloneRef.current ? (
        <group position={[0, 0, pointCenterHeight]} scale={pointScale}>
          <primitive
            dispose={null}
            object={secondaryCloneRef.current}
            position={secondary.offset}
          />
        </group>
      ) : (
        <mesh position={[0, 0, pointCenterHeight]} castShadow>
          <sphereGeometry args={[baseSize * 0.08, 18, 18]} />
          <meshStandardMaterial
            color={theme.colors.surface}
            emissive={theme.colors.surface}
            emissiveIntensity={0.16}
            metalness={0.08}
            roughness={0.26}
          />
        </mesh>
      )}
    </group>
  );
}

function CardTextMesh({
  color,
  depth,
  position,
  rotation = [0, 0, 0],
  size,
  text
}: {
  color: string;
  depth: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  size: number;
  text: string;
}) {
  const geometry = useMemo(() => {
    const nextGeometry = new TextGeometry(text, {
      bevelEnabled: false,
      curveSegments: 6,
      depth,
      font: CARD_FONT,
      size
    });

    nextGeometry.center();

    return nextGeometry;
  }, [depth, size, text]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.08}
        metalness={0.16}
        roughness={0.34}
      />
    </mesh>
  );
}

function createCircleShape(x: number, y: number, radius: number) {
  const shape = new Shape();

  shape.absarc(x, y, radius, 0, Math.PI * 2, false);

  return shape;
}

function createRectangleShape(x: number, y: number, width: number, height: number) {
  const shape = new Shape();

  shape.moveTo(x, y);
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height);
  shape.lineTo(x, y + height);
  shape.closePath();

  return shape;
}

function createHeartShape(size: number) {
  const shape = new Shape();

  shape.moveTo(0, -size * 0.46);
  shape.bezierCurveTo(-size * 0.28, -size * 0.18, -size * 0.5, size * 0.06, 0, size * 0.46);
  shape.bezierCurveTo(size * 0.5, size * 0.06, size * 0.28, -size * 0.18, 0, -size * 0.46);
  shape.closePath();

  return shape;
}

function createSpadeHeadShape(size: number) {
  const shape = new Shape();

  shape.moveTo(0, size * 0.48);
  shape.bezierCurveTo(-size * 0.3, size * 0.2, -size * 0.5, 0, 0, -size * 0.36);
  shape.bezierCurveTo(size * 0.5, 0, size * 0.3, size * 0.2, 0, size * 0.48);
  shape.closePath();

  return shape;
}

function createSuitPipShapes(suit: BoardSuit, size: number) {
  switch (suit) {
    case "clubs":
      return [
        createCircleShape(0, size * 0.22, size * 0.18),
        createCircleShape(-size * 0.2, size * 0.02, size * 0.18),
        createCircleShape(size * 0.2, size * 0.02, size * 0.18),
        createRectangleShape(-size * 0.06, -size * 0.28, size * 0.12, size * 0.28),
        createRectangleShape(-size * 0.16, -size * 0.38, size * 0.32, size * 0.08)
      ];
    case "diamonds": {
      const shape = new Shape();

      shape.moveTo(0, size * 0.48);
      shape.lineTo(size * 0.32, 0);
      shape.lineTo(0, -size * 0.48);
      shape.lineTo(-size * 0.32, 0);
      shape.closePath();

      return shape;
    }
    case "hearts":
      return createHeartShape(size);
    case "spades":
      return [
        createSpadeHeadShape(size),
        createRectangleShape(-size * 0.05, -size * 0.44, size * 0.1, size * 0.22),
        createRectangleShape(-size * 0.15, -size * 0.52, size * 0.3, size * 0.08)
      ];
  }
}

function CardSuitGlyph({
  color,
  position,
  size,
  suit
}: {
  color: string;
  position: [number, number, number];
  size: number;
  suit: BoardSuit;
}) {
  const geometry = useMemo(() => {
    const nextGeometry = new ExtrudeGeometry(createSuitPipShapes(suit, size), {
      bevelEnabled: false,
      curveSegments: 16,
      depth: size * 0.08
    });

    nextGeometry.center();

    return nextGeometry;
  }, [size, suit]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.04}
        metalness={0.12}
        roughness={0.28}
      />
    </mesh>
  );
}

function StandardCardFacePanel({ card }: { card: BoardCardSpec }) {
  if (!card.face) {
    return null;
  }

  const face = card.face;
  const baseSize = Math.min(card.size[0], card.size[1]);
  const panelZ = card.size[2] / 2 + 0.045;
  const centerRankSize = face.rank === "10" ? baseSize * 0.29 : baseSize * 0.34;

  return (
    <>
      <mesh position={[0, 0, panelZ]}>
        <planeGeometry args={[card.size[0] * 0.84, card.size[1] * 0.84]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, panelZ + 0.002]}>
        <planeGeometry args={[card.size[0] * 0.78, card.size[1] * 0.78]} />
        <meshBasicMaterial color={face.accentColor} opacity={0.15} transparent />
      </mesh>
      <CardTextMesh
        color={face.inkColor}
        depth={CARD_FACE_DEPTH}
        position={[0, baseSize * 0.24, panelZ + 0.02]}
        size={centerRankSize}
        text={face.rank}
      />
      <CardSuitGlyph
        color={face.inkColor}
        position={[0, -baseSize * 0.12, panelZ + 0.018]}
        size={baseSize * 0.24}
        suit={face.suit}
      />
    </>
  );
}

function BoardCard({
  card,
  mysteryAssets
}: {
  card: BoardCardSpec;
  mysteryAssets: MysteryAssetSet;
}) {
  const groupRef = useRef<Group>(null);
  const animationStartRef = useRef<number | null>(null);
  const startPosition =
    card.dealIndex === null
      ? card.position
      : createPoint(
          card.dealSourceOffset[0],
          card.dealSourceOffset[1],
          CARD_DEAL_SOURCE_HEIGHT + card.dealSourceOffset[2]
        );
  const startRotation =
    card.dealIndex === null ? createPoint(0, 0, card.rotationZ) : card.dealStartRotation;
  const travelVector = createPoint(
    card.position[0] - startPosition[0],
    card.position[1] - startPosition[1],
    card.position[2] - startPosition[2]
  );
  const travelLength = Math.hypot(travelVector[0], travelVector[1]) || 1;
  const normalVector = createPoint(
    -travelVector[1] / travelLength,
    travelVector[0] / travelLength,
    0
  );

  useFrame(({ clock }) => {
    if (!groupRef.current || card.dealIndex === null) {
      return;
    }

    if (animationStartRef.current === null) {
      animationStartRef.current = clock.elapsedTime;
    }

    const elapsedSeconds =
      clock.elapsedTime -
      animationStartRef.current -
      CARD_DEAL_START_DELAY_SECONDS -
      card.dealDelaySeconds;
    const progress = MathUtils.clamp(elapsedSeconds / CARD_DEAL_DURATION_SECONDS, 0, 1);
    const easedProgress =
      progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    const lift = Math.sin(easedProgress * Math.PI) * card.dealArcHeight;
    const ribbonWave =
      Math.sin(easedProgress * Math.PI + card.dealWavePhase) *
      card.dealWaveSpread *
      Math.sin(easedProgress * Math.PI);
    const trail = (1 - easedProgress) * (1 - easedProgress) * CARD_DEAL_TRAIL_DISTANCE;

    groupRef.current.position.set(
      MathUtils.lerp(startPosition[0], card.position[0], easedProgress) +
        normalVector[0] * ribbonWave -
        (travelVector[0] / travelLength) * trail,
      MathUtils.lerp(startPosition[1], card.position[1], easedProgress) +
        normalVector[1] * ribbonWave -
        (travelVector[1] / travelLength) * trail,
      MathUtils.lerp(startPosition[2], card.position[2], easedProgress) + lift
    );
    groupRef.current.rotation.set(
      MathUtils.lerp(startRotation[0], 0, easedProgress) -
        Math.sin(easedProgress * Math.PI) * 0.12,
      MathUtils.lerp(startRotation[1], 0, easedProgress) + ribbonWave * 0.28,
      MathUtils.lerp(startRotation[2], card.rotationZ, easedProgress) +
        Math.sin(easedProgress * Math.PI + card.dealWavePhase) * 0.08 * (1 - easedProgress)
    );
    groupRef.current.scale.setScalar(MathUtils.lerp(0.96, 1, easedProgress));
  });

  return (
    <group
      ref={groupRef}
      position={startPosition}
      rotation={startRotation}
      scale={card.dealIndex === null ? 1 : 0.9}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={card.size} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.08} roughness={0.32} />
      </mesh>
      {card.face ? (
        <StandardCardFacePanel card={card} />
      ) : (
        <mesh position={[0, 0, card.size[2] / 2 + 0.04]}>
          <planeGeometry args={[card.size[0] * 0.82, card.size[1] * 0.82]} />
          <meshBasicMaterial color="#0f172a" opacity={0.08} transparent />
        </mesh>
      )}
      {card.isMystery ? <MysteryCardGlyph card={card} mysteryAssets={mysteryAssets} /> : null}
    </group>
  );
}

function SuitSocketPiece({
  isActive,
  socket
}: {
  isActive: boolean;
  socket: SuitSocketSpec;
}) {
  const groupRef = useRef<Group>(null);
  const glowMaterialRef = useRef<MeshBasicMaterial>(null);
  const scaleRef = useRef(1);
  const glowOpacityRef = useRef(0.16);
  const socketPosition = socket.assetModel
    ? createPoint(socket.position[0], socket.position[1], socket.assetModel.center[2])
    : socket.position;

  useFrame(({ clock }, deltaSeconds) => {
    const wave = (Math.sin(clock.elapsedTime * 5.6) + 1) / 2;
    const targetScale = isActive ? 1.05 + wave * 0.07 : 1;
    const targetGlowOpacity = isActive ? 0.24 + wave * 0.12 : 0.16;

    scaleRef.current = MathUtils.damp(scaleRef.current, targetScale, 9, deltaSeconds);
    glowOpacityRef.current = MathUtils.damp(
      glowOpacityRef.current,
      targetGlowOpacity,
      9,
      deltaSeconds
    );

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleRef.current);
    }

    if (glowMaterialRef.current) {
      glowMaterialRef.current.opacity = glowOpacityRef.current;
    }
  });

  return (
    <group ref={groupRef} position={socketPosition}>
      <mesh>
        <boxGeometry
          args={[
            socket.size * CORNER_SOCKET_GLOW_SCALE,
            socket.size * CORNER_SOCKET_GLOW_SCALE,
            socket.size * CORNER_SOCKET_GLOW_SCALE
          ]}
        />
        <meshBasicMaterial
          color={socket.glowColor}
          opacity={0.16}
          ref={glowMaterialRef}
          toneMapped={false}
          transparent
        />
      </mesh>
      {socket.assetModel ? (
        <primitive
          dispose={null}
          object={socket.assetModel.object}
          position={socket.assetModel.offset}
        />
      ) : null}
    </group>
  );
}

export function BoardSurface({
  activeSeatIndex,
  dealSeed
}: {
  activeSeatIndex?: number | null;
  dealSeed?: string;
}) {
  const boardModel = useMemo(() => buildBoardModel(), [dealSeed]);
  const activeSuit = getActiveSuit(activeSeatIndex);

  if (!boardModel) {
    return <ProceduralBoardSurface />;
  }

  return (
    <group scale={[boardModel.scale, boardModel.scale, boardModel.scale]}>
      <group position={boardModel.offset}>
        <primitive
          dispose={null}
          object={boardModel.object}
        />
        {boardModel.cards.map((card, index) => (
          <BoardCard
            card={card}
            key={`board-card-${dealSeed ?? "default"}-${card.face?.cardId ?? "mystery"}-${index}`}
            mysteryAssets={boardModel.mysteryAssets}
          />
        ))}
        {boardModel.suitSockets.map((socket) => (
          <SuitSocketPiece
            isActive={activeSuit === socket.suit}
            key={socket.suit}
            socket={socket}
          />
        ))}
      </group>
    </group>
  );
}

