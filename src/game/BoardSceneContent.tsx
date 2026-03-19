import { useFrame, useThree } from "@react-three/fiber";
// Removed Html debug overlay
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  Group,
  MathUtils,
  type Mesh,
  MeshStandardMaterial,
  Vector3
} from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import clubMtlSource from "../../assets/models/club.mtl";
import clubObjSource from "../../assets/models/club.obj";
import diamondMtlSource from "../../assets/models/diamond.mtl";
import diamondObjSource from "../../assets/models/diamond.obj";
import heartMtlSource from "../../assets/models/heart.mtl";
import heartObjSource from "../../assets/models/heart.obj";
import spadeMtlSource from "../../assets/models/spade.mtl";
import spadeObjSource from "../../assets/models/spade.obj";
import { theme } from "../theme";
import { getTokenWorldPosition } from "./board/definition";
import type { BoardSpinState } from "./board-spin";
import type { BoardMatchSnapshot, BoardSpace } from "./board/types";
import { BoardSurface } from "./BoardSurface";

import { PlayerConsole3D } from "./PlayerConsole3D";

const PLAYER_TOKEN_TARGET_FOOTPRINT = 0.34;
const PLAYER_TOKEN_TARGET_HEIGHT = 0.58;
const PLAYER_TOKEN_RING_INNER = 0.17;
const PLAYER_TOKEN_RING_OUTER = 0.25;
const ACTIVE_PLAYER_SPIN_SPEED = 1.9;
const PLAYER_STEP_DURATION_MIN_SECONDS = 0.1;
const PLAYER_STEP_DURATION_MAX_SECONDS = 0.16;
const PLAYER_STEP_TARGET_DURATION_SECONDS = 1.15;
const PLAYER_STEP_HOP_HEIGHT = 0.1;
const TRACK_RENDER_LAST_ROLL: [number, number] = [1, 1];
const HOME_SPACE_INDEX_BY_SEAT = [30, 15, 0, 45] as const;
const DICE_SIZE = 0.42;
const DICE_HALF_SIZE = DICE_SIZE / 2 + 0.002;
const DICE_PIP_RADIUS = DICE_SIZE * 0.064;
const DICE_ROLL_DURATION_SECONDS = 1.05;
const BOARD_CAMERA_POSITION: readonly [number, number, number] = [8.5, -10, 7.2];
const BOARD_CAMERA_LOOK_AT: readonly [number, number, number] = [0, 0, 0.4];
const CAMERA_CUT_DURATION_SECONDS = 0.22;
const CAMERA_FOLLOW_BLEND_DAMP = 7.5;
const CAMERA_FOLLOW_DISTANCE = 2.1;
const CAMERA_FOLLOW_HEIGHT = 1.86;
const CAMERA_FOLLOW_TARGET_HEIGHT = 0.62;
const CAMERA_ORBIT_SPEED = 0.54;
const CAMERA_DIRECTION_RESPONSE = 7.2;
const CAMERA_TRAIL_DISTANCE = 0.8;
const CAMERA_LOOK_AHEAD_DISTANCE = 0.42;
const SUIT_BY_SEAT: PlayerSuit[] = ["diamonds", "hearts", "clubs", "spades"];
const PLAYER_TOKEN_COLOR_BY_SUIT: Record<PlayerSuit, string> = {
  clubs: "#34d399",
  diamonds: "#38bdf8",
  hearts: "#fb7185",
  spades: "#cbd5f5"
};

export type BoardCameraPresentation = "board" | "cut-in" | "follow" | "cut-out";

type PlayerSuit = "clubs" | "diamonds" | "hearts" | "spades";
type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
type TokenWorldPosition = { x: number; y: number; z: number };

interface SuitTokenModel {
  object: Group;
  offset: [number, number, number];
  scale: number;
}

interface TokenPathAnimation {
  path: TokenWorldPosition[];
  segmentDurationSeconds: number;
  startedAtSeconds: number;
}

function normalizeSpaceIndex(spaceIndex: number, spaceCount: number) {
  if (spaceCount <= 0) {
    return 0;
  }

  return ((spaceIndex % spaceCount) + spaceCount) % spaceCount;
}

function normalizeSeatIndex(seatIndex: number) {
  return ((seatIndex % HOME_SPACE_INDEX_BY_SEAT.length) + HOME_SPACE_INDEX_BY_SEAT.length) %
    HOME_SPACE_INDEX_BY_SEAT.length;
}

function setTokenGroupPosition(group: Group, position: TokenWorldPosition) {
  group.position.set(position.x, position.z, position.y);
}

function buildTokenStepPath({
  fromLastRoll,
  fromSpaceIndex,
  seatIndex,
  spaces,
  toSpaceIndex
}: {
  fromLastRoll: [number, number] | null;
  fromSpaceIndex: number;
  seatIndex: number;
  spaces: BoardSpace[];
  toSpaceIndex: number;
}) {
  if (spaces.length === 0) {
    return [];
  }

  const normalizedSeatIndex = normalizeSeatIndex(seatIndex);
  const normalizedFromIndex = normalizeSpaceIndex(fromSpaceIndex, spaces.length);
  const normalizedToIndex = normalizeSpaceIndex(toSpaceIndex, spaces.length);
  const forwardSteps =
    (normalizedToIndex - normalizedFromIndex + spaces.length) % spaces.length;
  const includeHomeEntryCard =
    fromLastRoll === null &&
    normalizedFromIndex === HOME_SPACE_INDEX_BY_SEAT[normalizedSeatIndex];
  const stepStartOffset = includeHomeEntryCard ? 0 : 1;
  const path: TokenWorldPosition[] = [];

  for (let offset = stepStartOffset; offset <= forwardSteps; offset += 1) {
    const stepIndex = normalizeSpaceIndex(normalizedFromIndex + offset, spaces.length);

    path.push(getTokenWorldPosition(spaces, stepIndex, seatIndex, TRACK_RENDER_LAST_ROLL));
  }

  return path;
}

function getDiePipOffsets(value: DieValue) {
  const edge = DICE_SIZE * 0.12;

  switch (value) {
    case 1:
      return [[0, 0]] as const;
    case 2:
      return [[-edge, edge], [edge, -edge]] as const;
    case 3:
      return [[-edge, edge], [0, 0], [edge, -edge]] as const;
    case 4:
      return [[-edge, edge], [edge, edge], [-edge, -edge], [edge, -edge]] as const;
    case 5:
      return [[-edge, edge], [edge, edge], [0, 0], [-edge, -edge], [edge, -edge]] as const;
    case 6:
      return [
        [-edge, edge],
        [edge, edge],
        [-edge, 0],
        [edge, 0],
        [-edge, -edge],
        [edge, -edge]
      ] as const;
  }
}

function getDieTopRotation(value: DieValue): [number, number, number] {
  switch (value) {
    case 1:
      return [0, 0, 0];
    case 2:
      return [Math.PI / 2, 0, 0];
    case 3:
      return [0, -Math.PI / 2, 0];
    case 4:
      return [0, Math.PI / 2, 0];
    case 5:
      return [-Math.PI / 2, 0, 0];
    case 6:
      return [Math.PI, 0, 0];
  }
}

function DieFacePips({
  position,
  rotation,
  value
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  value: DieValue;
}) {
  return (
    <group position={position} rotation={rotation}>
      {getDiePipOffsets(value).map(([x, y], index) => (
        <mesh key={`${value}-pip-${index}`} position={[x, y, 0]}>
          <sphereGeometry args={[DICE_PIP_RADIUS, 14, 14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function AnimatedDie({
  endPosition,
  index,
  value
}: {
  endPosition: [number, number, number];
  index: number;
  value: DieValue;
}) {
  const dieRef = useRef<Group>(null);
  const animationStartRef = useRef<number | null>(null);
  const startPosition = useMemo<[number, number, number]>(
    () => [-2.1 + index * 0.38, -0.9 + index * 0.55, 2.2 + index * 0.16],
    [index]
  );
  const endRotation = useMemo(() => getDieTopRotation(value), [value]);
  const startRotation = useMemo<[number, number, number]>(
    () => [
      endRotation[0] + Math.PI * (4.3 + index * 0.5),
      endRotation[1] + Math.PI * (3.8 - index * 0.35),
      endRotation[2] + Math.PI * (5.1 + index * 0.65)
    ],
    [endRotation, index]
  );
  const curveDirection = index === 0 ? 1 : -1;

  useFrame(({ clock }) => {
    if (!dieRef.current) {
      return;
    }

    if (animationStartRef.current === null) {
      animationStartRef.current = clock.elapsedTime;
    }

    const elapsedSeconds = clock.elapsedTime - animationStartRef.current;
    const progress = MathUtils.clamp(elapsedSeconds / DICE_ROLL_DURATION_SECONDS, 0, 1);
    const easedProgress =
      progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    const ribbonCurve = Math.sin(easedProgress * Math.PI) * curveDirection * 0.32;
    const hop = Math.sin(easedProgress * Math.PI) * 0.82;
    const settleBounce = Math.sin(easedProgress * Math.PI * 3) * 0.06 * (1 - easedProgress);

    dieRef.current.position.set(
      MathUtils.lerp(startPosition[0], endPosition[0], easedProgress) + ribbonCurve,
      MathUtils.lerp(startPosition[1], endPosition[1], easedProgress) - ribbonCurve * 0.46,
      MathUtils.lerp(startPosition[2], endPosition[2], easedProgress) + hop + settleBounce
    );
    dieRef.current.rotation.set(
      MathUtils.lerp(startRotation[0], endRotation[0], easedProgress),
      MathUtils.lerp(startRotation[1], endRotation[1], easedProgress),
      MathUtils.lerp(startRotation[2], endRotation[2], easedProgress) + ribbonCurve * 0.35
    );
    dieRef.current.scale.setScalar(MathUtils.lerp(0.92, 1, easedProgress));
  });

  return (
    <group ref={dieRef} position={startPosition} rotation={startRotation} scale={0.92}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.16} roughness={0.2} />
      </mesh>
      <DieFacePips position={[0, 0, DICE_HALF_SIZE]} rotation={[0, 0, 0]} value={1} />
      <DieFacePips position={[0, 0, -DICE_HALF_SIZE]} rotation={[Math.PI, 0, 0]} value={6} />
      <DieFacePips position={[0, DICE_HALF_SIZE, 0]} rotation={[-Math.PI / 2, 0, 0]} value={2} />
      <DieFacePips position={[0, -DICE_HALF_SIZE, 0]} rotation={[Math.PI / 2, 0, 0]} value={5} />
      <DieFacePips position={[DICE_HALF_SIZE, 0, 0]} rotation={[0, Math.PI / 2, 0]} value={3} />
      <DieFacePips position={[-DICE_HALF_SIZE, 0, 0]} rotation={[0, -Math.PI / 2, 0]} value={4} />
    </group>
  );
}

function BoardDiceRoll({
  dice,
  rollKey
}: {
  dice: [number, number] | null;
  rollKey: string | null;
}) {
  if (!dice || !rollKey) {
    return null;
  }

  return (
    <group>
      <AnimatedDie
        endPosition={[-0.52, -0.18, 0.92]}
        index={0}
        key={`${rollKey}-0`}
        value={dice[0] as DieValue}
      />
      <AnimatedDie
        endPosition={[0.48, 0.22, 0.92]}
        index={1}
        key={`${rollKey}-1`}
        value={dice[1] as DieValue}
      />
    </group>
  );
}

function buildSuitTokenModel({
  color,
  mtlSource,
  objSource,
  warningLabel
}: {
  color: string;
  mtlSource: string;
  objSource: string;
  warningLabel: string;
}) {
  try {
    const materialCreator = new MTLLoader().parse(mtlSource, "");
    materialCreator.preload();

    const object = new OBJLoader().setMaterials(materialCreator).parse(objSource);
    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const footprint = Math.max(size.x, size.y, 1);
    const scale = Math.min(
      PLAYER_TOKEN_TARGET_FOOTPRINT / footprint,
      PLAYER_TOKEN_TARGET_HEIGHT / Math.max(size.z, 1)
    );
    const pieceMaterial = new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.18,
      metalness: 0.24,
      roughness: 0.34
    });

    object.traverse((child) => {
      if (!("isMesh" in child) || !child.isMesh) {
        return;
      }

      const mesh = child as Mesh;

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = pieceMaterial;
    });

    return {
      object,
      offset: [-center.x, -center.y, -bounds.min.z],
      scale
    } satisfies SuitTokenModel;
  } catch (error) {
    console.warn(warningLabel, error);
    return null;
  }
}

function buildSuitTokenLibrary() {
  return {
    clubs: buildSuitTokenModel({
      color: PLAYER_TOKEN_COLOR_BY_SUIT.clubs,
      mtlSource: clubMtlSource,
      objSource: clubObjSource,
      warningLabel: "Unable to parse clubs player piece."
    }),
    diamonds: buildSuitTokenModel({
      color: PLAYER_TOKEN_COLOR_BY_SUIT.diamonds,
      mtlSource: diamondMtlSource,
      objSource: diamondObjSource,
      warningLabel: "Unable to parse diamonds player piece."
    }),
    hearts: buildSuitTokenModel({
      color: PLAYER_TOKEN_COLOR_BY_SUIT.hearts,
      mtlSource: heartMtlSource,
      objSource: heartObjSource,
      warningLabel: "Unable to parse hearts player piece."
    }),
    spades: buildSuitTokenModel({
      color: PLAYER_TOKEN_COLOR_BY_SUIT.spades,
      mtlSource: spadeMtlSource,
      objSource: spadeObjSource,
      warningLabel: "Unable to parse spades player piece."
    })
  } satisfies Record<PlayerSuit, SuitTokenModel | null>;
}

function PlayerToken({
  isCurrentTurn,
  lastRoll,
  onMovementChange,
  onTokenGroupChange,
  playerSuit,
  resetKey,
  seatIndex,
  spaces,
  tokenModel,
  tokenSpaceIndex
}: {
  isCurrentTurn: boolean;
  lastRoll: [number, number] | null;
  onMovementChange?: (isMoving: boolean) => void;
  onTokenGroupChange?: (group: Group | null) => void;
  playerSuit: PlayerSuit;
  resetKey: string;
  seatIndex: number;
  spaces: BoardSpace[];
  tokenModel: SuitTokenModel | null;
  tokenSpaceIndex: number;
}) {
  const tokenGroupRef = useRef<Group>(null);
  const tokenSpinRef = useRef<Group>(null);
  const targetPosition = getTokenWorldPosition(spaces, tokenSpaceIndex, seatIndex, lastRoll);
  const initialPositionRef = useRef<TokenWorldPosition>(targetPosition);
  const displayedPositionRef = useRef<TokenWorldPosition>(targetPosition);
  const lastSpaceIndexRef = useRef(tokenSpaceIndex);
  const lastRollRef = useRef<[number, number] | null>(lastRoll);
  const animationRef = useRef<TokenPathAnimation | null>(null);
  const lastReportedMovingRef = useRef(false);

  useEffect(() => {
    onTokenGroupChange?.(tokenGroupRef.current);

    return () => {
      onTokenGroupChange?.(null);
      onMovementChange?.(false);
    };
  }, [onMovementChange, onTokenGroupChange]);

  useEffect(() => {
    const resetPosition = getTokenWorldPosition(spaces, tokenSpaceIndex, seatIndex, lastRoll);

    initialPositionRef.current = resetPosition;
    displayedPositionRef.current = resetPosition;
    lastSpaceIndexRef.current = tokenSpaceIndex;
    lastRollRef.current = lastRoll;
    animationRef.current = null;
    lastReportedMovingRef.current = false;
    onMovementChange?.(false);

    if (tokenGroupRef.current) {
      setTokenGroupPosition(tokenGroupRef.current, resetPosition);
      onTokenGroupChange?.(tokenGroupRef.current);
    }
  }, [lastRoll, onMovementChange, onTokenGroupChange, resetKey, seatIndex, spaces, tokenSpaceIndex]);

  useFrame(({ clock }, deltaSeconds) => {
    if (tokenGroupRef.current) {
      const targetPositionForFrame = getTokenWorldPosition(
        spaces,
        tokenSpaceIndex,
        seatIndex,
        lastRoll
      );
      const hasTokenMoved = lastSpaceIndexRef.current !== tokenSpaceIndex;
      const hasTurnStateChanged = lastRollRef.current !== lastRoll;

      if (hasTokenMoved || hasTurnStateChanged) {
        const stepPath = buildTokenStepPath({
          fromLastRoll: lastRollRef.current,
          fromSpaceIndex: lastSpaceIndexRef.current,
          seatIndex,
          spaces,
          toSpaceIndex: tokenSpaceIndex
        });

        if (stepPath.length > 0) {
          const segmentDurationSeconds = Math.min(
            PLAYER_STEP_DURATION_MAX_SECONDS,
            Math.max(
              PLAYER_STEP_DURATION_MIN_SECONDS,
              PLAYER_STEP_TARGET_DURATION_SECONDS / stepPath.length
            )
          );

          animationRef.current = {
            path: [displayedPositionRef.current, ...stepPath],
            segmentDurationSeconds,
            startedAtSeconds: clock.elapsedTime
          };
        } else {
          animationRef.current = null;
          displayedPositionRef.current = targetPositionForFrame;
        }

        lastSpaceIndexRef.current = tokenSpaceIndex;
        lastRollRef.current = lastRoll;
      }

      const animation = animationRef.current;

      if (animation && animation.path.length > 1) {
        const segmentCount = animation.path.length - 1;
        const totalDurationSeconds = segmentCount * animation.segmentDurationSeconds;
        const elapsedSeconds = clock.elapsedTime - animation.startedAtSeconds;

        if (elapsedSeconds >= totalDurationSeconds) {
          displayedPositionRef.current =
            animation.path[animation.path.length - 1] ?? targetPositionForFrame;
          animationRef.current = null;
        } else {
          const rawSegmentIndex = Math.floor(elapsedSeconds / animation.segmentDurationSeconds);
          const segmentIndex = Math.min(rawSegmentIndex, segmentCount - 1);
          const segmentElapsedSeconds =
            elapsedSeconds - segmentIndex * animation.segmentDurationSeconds;
          const segmentT = MathUtils.clamp(
            segmentElapsedSeconds / animation.segmentDurationSeconds,
            0,
            1
          );
          const easedSegmentT = segmentT * segmentT * (3 - 2 * segmentT);
          const currentPoint = animation.path[segmentIndex] ?? targetPositionForFrame;
          const nextPoint = animation.path[segmentIndex + 1] ?? targetPositionForFrame;
          const hopLift = Math.sin(segmentT * Math.PI) * PLAYER_STEP_HOP_HEIGHT;

          displayedPositionRef.current = {
            x: MathUtils.lerp(currentPoint.x, nextPoint.x, easedSegmentT),
            y: MathUtils.lerp(currentPoint.y, nextPoint.y, easedSegmentT) + hopLift,
            z: MathUtils.lerp(currentPoint.z, nextPoint.z, easedSegmentT)
          };
        }
      } else {
        displayedPositionRef.current = {
          x: MathUtils.damp(
            displayedPositionRef.current.x,
            targetPositionForFrame.x,
            12,
            deltaSeconds
          ),
          y: MathUtils.damp(
            displayedPositionRef.current.y,
            targetPositionForFrame.y,
            12,
            deltaSeconds
          ),
          z: MathUtils.damp(
            displayedPositionRef.current.z,
            targetPositionForFrame.z,
            12,
            deltaSeconds
          )
        };
      }

      const isMoving = Boolean(animationRef.current);

      if (isMoving !== lastReportedMovingRef.current) {
        lastReportedMovingRef.current = isMoving;
        onMovementChange?.(isMoving);
      }

      setTokenGroupPosition(tokenGroupRef.current, displayedPositionRef.current);
    }

    if (!tokenSpinRef.current) {
      return;
    }

    if (isCurrentTurn) {
      tokenSpinRef.current.rotation.z += deltaSeconds * ACTIVE_PLAYER_SPIN_SPEED;
      return;
    }

    tokenSpinRef.current.rotation.z = MathUtils.damp(
      tokenSpinRef.current.rotation.z,
      0,
      10,
      deltaSeconds
    );
  });

  return (
    <group
      position={[
        initialPositionRef.current.x,
        initialPositionRef.current.z,
        initialPositionRef.current.y
      ]}
      ref={tokenGroupRef}
    >
      {isCurrentTurn ? (
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[PLAYER_TOKEN_RING_INNER, PLAYER_TOKEN_RING_OUTER, 24]} />
          <meshBasicMaterial
            color={PLAYER_TOKEN_COLOR_BY_SUIT[playerSuit]}
            opacity={0.92}
            transparent
          />
        </mesh>
      ) : null}
      <group ref={tokenSpinRef}>
        {tokenModel ? (
          <group scale={tokenModel.scale}>
            <primitive dispose={null} object={tokenModel.object} position={tokenModel.offset} />
          </group>
        ) : (
          <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.17, 0.28, 20]} />
            <meshStandardMaterial
              color={PLAYER_TOKEN_COLOR_BY_SUIT[playerSuit]}
              emissive={PLAYER_TOKEN_COLOR_BY_SUIT[playerSuit]}
              emissiveIntensity={isCurrentTurn ? 0.2 : 0.08}
              metalness={0.24}
              roughness={0.35}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function BoardCameraDirector({
  activePlayerId,
  onCameraPresentationChange,
  onPurchaseRevealReady,
  pendingPurchaseRevealKey,
  tokenGroupByPlayerRef,
  tokenMotionByPlayerRef
}: {
  activePlayerId: string | null;
  onCameraPresentationChange?: (presentation: BoardCameraPresentation) => void;
  onPurchaseRevealReady?: (purchaseRevealKey: string) => void;
  pendingPurchaseRevealKey?: string | null;
  tokenGroupByPlayerRef: React.MutableRefObject<Map<string, Group | null>>;
  tokenMotionByPlayerRef: React.MutableRefObject<Record<string, boolean>>;
}) {
  const { camera } = useThree();
  const phaseRef = useRef<BoardCameraPresentation>("board");
  const phaseStartedAtRef = useRef(0);
  const revealedPurchaseKeyRef = useRef<string | null>(null);
  const cameraPositionRef = useRef(new Vector3(...BOARD_CAMERA_POSITION));
  const lookAtRef = useRef(new Vector3(...BOARD_CAMERA_LOOK_AT));
  const desiredCameraPositionRef = useRef(new Vector3(...BOARD_CAMERA_POSITION));
  const desiredLookAtRef = useRef(new Vector3(...BOARD_CAMERA_LOOK_AT));
  const followCameraPositionRef = useRef(new Vector3(...BOARD_CAMERA_POSITION));
  const followLookAtRef = useRef(new Vector3(...BOARD_CAMERA_LOOK_AT));
  const activeTokenWorldRef = useRef(new Vector3());
  const activeGroundTargetRef = useRef(new Vector3(0, 0, CAMERA_FOLLOW_TARGET_HEIGHT));
  const planeDeltaRef = useRef(new Vector3());
  const movementDirectionRef = useRef(new Vector3(1, 0, 0));
  const orbitOffsetRef = useRef(new Vector3());
  const trailOffsetRef = useRef(new Vector3());
  const leadOffsetRef = useRef(new Vector3());
  const lastGroundTargetRef = useRef(new Vector3());

  useEffect(() => {
    if (!activePlayerId) {
      movementDirectionRef.current.set(1, 0, 0);
      lastGroundTargetRef.current.set(0, 0, 0);
    }
  }, [activePlayerId]);

  function setPhase(nextPhase: BoardCameraPresentation, startedAtSeconds: number) {
    if (phaseRef.current === nextPhase) {
      return;
    }

    phaseRef.current = nextPhase;
    phaseStartedAtRef.current = startedAtSeconds;
    onCameraPresentationChange?.(nextPhase);
  }

  useFrame(({ clock }, deltaSeconds) => {
    const activeTokenGroup = activePlayerId
      ? tokenGroupByPlayerRef.current.get(activePlayerId) ?? null
      : null;
    const activeTokenIsMoving = activePlayerId
      ? tokenMotionByPlayerRef.current[activePlayerId] === true
      : false;

    if (!pendingPurchaseRevealKey) {
      revealedPurchaseKeyRef.current = null;
    }

    if (activeTokenIsMoving && phaseRef.current === "board") {
      setPhase("cut-in", clock.elapsedTime);
    } else if (activeTokenIsMoving && phaseRef.current === "cut-out") {
      setPhase("cut-in", clock.elapsedTime);
    }

    const phaseElapsedSeconds = clock.elapsedTime - phaseStartedAtRef.current;

    if (phaseRef.current === "cut-in" && phaseElapsedSeconds >= CAMERA_CUT_DURATION_SECONDS) {
      setPhase(activeTokenIsMoving ? "follow" : "cut-out", clock.elapsedTime);
    } else if (
      phaseRef.current === "follow" &&
      (!activeTokenIsMoving || !activeTokenGroup)
    ) {
      setPhase("cut-out", clock.elapsedTime);
    } else if (
      phaseRef.current === "cut-out" &&
      phaseElapsedSeconds >= CAMERA_CUT_DURATION_SECONDS
    ) {
      setPhase("board", clock.elapsedTime);
    }

    let cinematicBlend = 0;

    if (phaseRef.current === "cut-in") {
      cinematicBlend = MathUtils.clamp(
        (clock.elapsedTime - phaseStartedAtRef.current) / CAMERA_CUT_DURATION_SECONDS,
        0,
        1
      );
    } else if (phaseRef.current === "follow") {
      cinematicBlend = 1;
    } else if (phaseRef.current === "cut-out") {
      cinematicBlend =
        1 -
        MathUtils.clamp(
          (clock.elapsedTime - phaseStartedAtRef.current) / CAMERA_CUT_DURATION_SECONDS,
          0,
          1
        );
    }

    if (activeTokenGroup) {
      activeTokenGroup.getWorldPosition(activeTokenWorldRef.current);
      activeGroundTargetRef.current.set(
        activeTokenWorldRef.current.x,
        activeTokenWorldRef.current.y,
        CAMERA_FOLLOW_TARGET_HEIGHT
      );

      planeDeltaRef.current
        .copy(activeGroundTargetRef.current)
        .sub(lastGroundTargetRef.current);
      planeDeltaRef.current.z = 0;

      if (lastGroundTargetRef.current.lengthSq() === 0) {
        lastGroundTargetRef.current.copy(activeGroundTargetRef.current);
      } else if (planeDeltaRef.current.lengthSq() > 0.0008) {
        planeDeltaRef.current.normalize();
        movementDirectionRef.current.lerp(
          planeDeltaRef.current,
          Math.min(deltaSeconds * CAMERA_DIRECTION_RESPONSE, 1)
        );

        if (movementDirectionRef.current.lengthSq() > 0) {
          movementDirectionRef.current.normalize();
        }

        lastGroundTargetRef.current.copy(activeGroundTargetRef.current);
      }

      orbitOffsetRef.current.set(
        Math.cos(clock.elapsedTime * CAMERA_ORBIT_SPEED) * CAMERA_FOLLOW_DISTANCE,
        Math.sin(clock.elapsedTime * CAMERA_ORBIT_SPEED) * CAMERA_FOLLOW_DISTANCE * 0.78,
        CAMERA_FOLLOW_HEIGHT
      );
      trailOffsetRef.current.copy(movementDirectionRef.current).multiplyScalar(-CAMERA_TRAIL_DISTANCE);
      trailOffsetRef.current.z = 0;
      leadOffsetRef.current.copy(movementDirectionRef.current).multiplyScalar(CAMERA_LOOK_AHEAD_DISTANCE);
      leadOffsetRef.current.z = 0;

      followCameraPositionRef.current
        .copy(activeGroundTargetRef.current)
        .add(orbitOffsetRef.current)
        .add(trailOffsetRef.current);
      followLookAtRef.current
        .copy(activeGroundTargetRef.current)
        .add(leadOffsetRef.current);
    } else {
      cinematicBlend = 0;
    }

    desiredCameraPositionRef.current
      .set(...BOARD_CAMERA_POSITION)
      .lerp(followCameraPositionRef.current, cinematicBlend);
    desiredLookAtRef.current
      .set(...BOARD_CAMERA_LOOK_AT)
      .lerp(followLookAtRef.current, cinematicBlend);

    cameraPositionRef.current.set(
      MathUtils.damp(
        cameraPositionRef.current.x,
        desiredCameraPositionRef.current.x,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      ),
      MathUtils.damp(
        cameraPositionRef.current.y,
        desiredCameraPositionRef.current.y,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      ),
      MathUtils.damp(
        cameraPositionRef.current.z,
        desiredCameraPositionRef.current.z,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      )
    );
    lookAtRef.current.set(
      MathUtils.damp(
        lookAtRef.current.x,
        desiredLookAtRef.current.x,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      ),
      MathUtils.damp(
        lookAtRef.current.y,
        desiredLookAtRef.current.y,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      ),
      MathUtils.damp(
        lookAtRef.current.z,
        desiredLookAtRef.current.z,
        CAMERA_FOLLOW_BLEND_DAMP,
        deltaSeconds
      )
    );

    camera.position.copy(cameraPositionRef.current);
    camera.lookAt(lookAtRef.current);

    if (
      phaseRef.current === "board" &&
      !activeTokenIsMoving &&
      pendingPurchaseRevealKey &&
      revealedPurchaseKeyRef.current !== pendingPurchaseRevealKey
    ) {
      revealedPurchaseKeyRef.current = pendingPurchaseRevealKey;
      onPurchaseRevealReady?.(pendingPurchaseRevealKey);
    }
  });

  // Debug overlay removed for production
  return null;
}

export function BoardSceneContent({
  focusedSpaceIndex,
  onCameraPresentationChange,
  onPurchaseRevealReady,
  pendingPurchaseRevealKey,
  snapshot,
  spinState
}: {
  focusedSpaceIndex?: number | null;
  onCameraPresentationChange?: (presentation: BoardCameraPresentation) => void;
  onPurchaseRevealReady?: (purchaseRevealKey: string) => void;
  pendingPurchaseRevealKey?: string | null;
  snapshot: BoardMatchSnapshot;
  spinState?: BoardSpinState;
}) {
  const spinGroupRef = useRef<Group>(null);
  const fallbackAngleRef = useRef(Math.PI / 4);
  const fallbackDraggingRef = useRef(false);
  const fallbackVelocityRef = useRef(0);
  const angleRef = spinState?.angleRef ?? fallbackAngleRef;
  const draggingRef = spinState?.draggingRef ?? fallbackDraggingRef;
  const velocityRef = spinState?.velocityRef ?? fallbackVelocityRef;
  const cameraPresentationRef = useRef<BoardCameraPresentation>("board");
  const tokenGroupByPlayerRef = useRef(new Map<string, Group | null>());
  const tokenMotionByPlayerRef = useRef<Record<string, boolean>>({});
  const tokenLibrary = useMemo(() => buildSuitTokenLibrary(), []);
  const activePlayerId = snapshot.currentTurnPlayerId;
  const activeSeatIndex =
    snapshot.players.find((player) => player.id === snapshot.currentTurnPlayerId)?.seatIndex ??
    null;
  const diceRollKey = snapshot.dice
    ? `${snapshot.turnNumber}-${snapshot.currentTurnPlayerId ?? "none"}-${snapshot.dice[0]}-${snapshot.dice[1]}`
    : null;

  function handleCameraPresentationChange(presentation: BoardCameraPresentation) {
    cameraPresentationRef.current = presentation;
    onCameraPresentationChange?.(presentation);
  }

  useFrame((_, deltaSeconds) => {
    if (cameraPresentationRef.current !== "board") {
      velocityRef.current = 0;
    } else if (!draggingRef.current) {
      if (Math.abs(velocityRef.current) < 0.001) {
        velocityRef.current = 0;
      } else {
        angleRef.current += velocityRef.current * deltaSeconds;
        velocityRef.current *= Math.pow(0.95, deltaSeconds * 60);
      }
    }

    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.z = angleRef.current;
    }
  });

  return (
    <>
      <BoardCameraDirector
        activePlayerId={activePlayerId}
        onCameraPresentationChange={handleCameraPresentationChange}
        onPurchaseRevealReady={onPurchaseRevealReady}
        pendingPurchaseRevealKey={pendingPurchaseRevealKey}
        tokenGroupByPlayerRef={tokenGroupByPlayerRef}
        tokenMotionByPlayerRef={tokenMotionByPlayerRef}
      />
      <color attach="background" args={[theme.colors.background]} />
      <fog attach="fog" args={[theme.colors.background, 12, 28]} />
      <ambientLight intensity={1.15} />
      <directionalLight intensity={2.3} position={[10, -8, 14]} castShadow />
      <pointLight color={theme.colors.accent} intensity={28} position={[-8, -6, 9]} />
      <pointLight color={theme.colors.surface} intensity={22} position={[8, 7, 7]} />

      <mesh position={[0, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[10.5, 10.5, 0.16, 64]} />
        <meshStandardMaterial color="#06101c" roughness={1} />
      </mesh>

      <mesh position={[0, 0, -1.72]}>
        <ringGeometry args={[5.4, 6.8, 48]} />
        <meshBasicMaterial color={theme.colors.accent} opacity={0.12} transparent />
      </mesh>

      <group ref={spinGroupRef}>
        <mesh position={[0, 0, -0.86]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.42, 1.44, 24]} />
          <meshStandardMaterial color="#0b1728" metalness={0.22} roughness={0.68} />
        </mesh>

        <mesh position={[0, 0, -1.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.28, 0.62, 24]} />
          <meshStandardMaterial color={theme.colors.surface} metalness={0.24} roughness={0.42} />
        </mesh>

        <BoardSurface
          activeSeatIndex={activeSeatIndex}
          dealSeed={snapshot.startedAt}
          focusedSpaceIndex={focusedSpaceIndex}
          players={snapshot.players}
          activePlayerTokenSpaceIndex={
            snapshot.players.find((p) => p.id === snapshot.currentTurnPlayerId)?.tokenSpaceIndex ?? null
          }
          spaces={snapshot.spaces}
        />
        <BoardDiceRoll dice={snapshot.dice} rollKey={diceRollKey} />

        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.2, 2.7, 0.32, 32]} />
          <meshStandardMaterial color="#13243b" metalness={0.16} roughness={0.62} />
        </mesh>

        <mesh position={[0, 0, 0.28]}>
          <torusGeometry args={[2.1, 0.08, 16, 64]} />
          <meshStandardMaterial
            color={theme.colors.accent}
            emissive={theme.colors.accent}
            emissiveIntensity={0.18}
          />
        </mesh>

        {snapshot.players.map((player) => {
          const playerSuit = SUIT_BY_SEAT[player.seatIndex % SUIT_BY_SEAT.length];

          return (
            <PlayerToken
              isCurrentTurn={snapshot.currentTurnPlayerId === player.id}
              key={player.id}
              lastRoll={player.lastRoll}
              onMovementChange={(isMoving) => {
                // Always update for active player
                tokenMotionByPlayerRef.current[player.id] = isMoving;
                // Force update for active player to ensure camera logic
                if (snapshot.currentTurnPlayerId === player.id && isMoving) {
                  tokenMotionByPlayerRef.current[player.id] = true;
                }
              }}
              onTokenGroupChange={(group) => {
                // Always set group for active player
                if (group) {
                  tokenGroupByPlayerRef.current.set(player.id, group);
                  // Force update for active player
                  if (snapshot.currentTurnPlayerId === player.id) {
                    tokenGroupByPlayerRef.current.set(player.id, group);
                  }
                  return;
                }
                tokenGroupByPlayerRef.current.delete(player.id);
              }}
              playerSuit={playerSuit}
              resetKey={snapshot.startedAt}
              seatIndex={player.seatIndex}
              spaces={snapshot.spaces}
              tokenModel={tokenLibrary[playerSuit]}
              tokenSpaceIndex={player.tokenSpaceIndex}
            />
          );
        })}

        {/* Player Consoles: Render one for each player, positioned/scaled on each inner edge at 35° angle */}
        {snapshot.players.map((player, i) => {
          // Board model for console (scaled down)
          const boardModel = useMemo(() => {
            const model = buildBoardModel();
            if (!model) return null;
            // Clone the object for each console to avoid shared state
            return {
              ...model,
              object: model.object.clone(true)
            };
          }, []);

          // Positioning: 4 consoles, one per edge, at 35° tilt, pivot at bottom
          // Board is centered at (0,0), so offset from center along each edge
          const edgeDistance = 6.2; // Distance from center to edge (tweak as needed)
          const tiltAngle = Math.PI / 5.14; // ~35° in radians
          // Edge positions: top, right, bottom, left
          const edgePositions = [
            [0, edgeDistance, 0.6],    // Top
            [edgeDistance, 0, 0.6],   // Right
            [0, -edgeDistance, 0.6],  // Bottom
            [-edgeDistance, 0, 0.6]   // Left
          ];
          const edgeRotations = [
            [-tiltAngle, 0, 0],
            [-tiltAngle, 0, Math.PI / 2],
            [-tiltAngle, 0, Math.PI],
            [-tiltAngle, 0, -Math.PI / 2]
          ];
          // Assign edge by seatIndex (wrap if >4 players)
          const edgeIdx = player.seatIndex % 4;

          // State: for now, all consoles start minimized
          const state = "minimized";

          return boardModel ? (
            <group
              key={`player-console-${player.id}`}
              position={edgePositions[edgeIdx]}
              rotation={edgeRotations[edgeIdx]}
            >
              <PlayerConsole3D
                playerId={player.id}
                seatIndex={player.seatIndex}
                boardModel={boardModel}
                state={state}
                // onStateChange={...} // To be implemented
              />
            </group>
          ) : null;
        })}
      </group>
    </>
  );
}
