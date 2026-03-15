import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Box3,
  Group,
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
import type { BoardMatchSnapshot } from "./board/types";
import { BoardSurface } from "./BoardSurface";

const PLAYER_TOKEN_TARGET_FOOTPRINT = 0.42;
const PLAYER_TOKEN_TARGET_HEIGHT = 0.68;
const PLAYER_TOKEN_RING_INNER = 0.22;
const PLAYER_TOKEN_RING_OUTER = 0.32;
const SUIT_BY_SEAT: PlayerSuit[] = ["diamonds", "hearts", "clubs", "spades"];
const PLAYER_TOKEN_COLOR_BY_SUIT: Record<PlayerSuit, string> = {
  clubs: "#34d399",
  diamonds: "#38bdf8",
  hearts: "#fb7185",
  spades: "#cbd5f5"
};

type PlayerSuit = "clubs" | "diamonds" | "hearts" | "spades";

interface SuitTokenModel {
  object: Group;
  offset: [number, number, number];
  scale: number;
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

    const object = new OBJLoader()
      .setMaterials(materialCreator)
      .parse(objSource);
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

export function BoardSceneContent({
  snapshot,
  spinState
}: {
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
  const tokenLibrary = useMemo(() => buildSuitTokenLibrary(), []);
  const activeSeatIndex =
    snapshot.players.find((player) => player.id === snapshot.currentTurnPlayerId)?.seatIndex ??
    null;

  useFrame((_, deltaSeconds) => {
    if (!draggingRef.current) {
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

        <BoardSurface activeSeatIndex={activeSeatIndex} dealSeed={snapshot.startedAt} />

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
          const worldPosition = getTokenWorldPosition(
            snapshot.spaces,
            player.tokenSpaceIndex,
            player.seatIndex
          );
          const isCurrentTurn = snapshot.currentTurnPlayerId === player.id;
          const playerSuit = SUIT_BY_SEAT[player.seatIndex % SUIT_BY_SEAT.length];
          const tokenModel = tokenLibrary[playerSuit];

          return (
            <group
              key={player.id}
              position={[worldPosition.x, worldPosition.z, 0]}
            >
              {isCurrentTurn ? (
                <mesh position={[0, 0, 0.04]}>
                  <ringGeometry args={[PLAYER_TOKEN_RING_INNER, PLAYER_TOKEN_RING_OUTER, 24]} />
                  <meshBasicMaterial color={theme.colors.surface} />
                </mesh>
              ) : null}
              {tokenModel ? (
                <group scale={tokenModel.scale}>
                  <primitive
                    dispose={null}
                    object={tokenModel.object}
                    position={tokenModel.offset}
                  />
                </group>
              ) : (
                <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.18, 0.22, 0.34, 20]} />
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
          );
        })}
      </group>
    </>
  );
}
