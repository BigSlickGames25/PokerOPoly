import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { theme } from "../theme";
import { boardPlayerColors, getTokenWorldPosition } from "./board/definition";
import type { BoardSpinState } from "./board-spin";
import type { BoardMatchSnapshot, BoardSpace } from "./board/types";
import { BoardSurface } from "./BoardSurface";

function SpaceMarker({ ownerColor, space }: { ownerColor: string | null; space: BoardSpace }) {
  return (
    <group
      position={[space.center.x, space.center.z, 0.04]}
      rotation={[0, 0, space.rotationY]}
    >
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[1.56, 0.58]} />
        <meshBasicMaterial color={space.accentColor} opacity={0.14} transparent />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[1.52, 0.12]} />
        <meshBasicMaterial color={space.accentColor} opacity={0.68} transparent />
      </mesh>
      {ownerColor ? (
        <mesh position={[0, 0.18, 0.012]}>
          <circleGeometry args={[0.16, 18]} />
          <meshBasicMaterial color={ownerColor} opacity={0.92} transparent />
        </mesh>
      ) : null}
    </group>
  );
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

        <BoardSurface />

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

        {snapshot.spaces.map((space) => {
          const owner = snapshot.players.find((player) => player.id === space.ownerId);

          return (
            <SpaceMarker
              key={space.id}
              ownerColor={owner?.colorHex ?? null}
              space={space}
            />
          );
        })}

        {snapshot.players.map((player) => {
          const worldPosition = getTokenWorldPosition(
            snapshot.spaces,
            player.tokenSpaceIndex,
            player.seatIndex
          );
          const isCurrentTurn = snapshot.currentTurnPlayerId === player.id;

          return (
            <group
              key={player.id}
              position={[worldPosition.x, worldPosition.z, 0]}
            >
              {isCurrentTurn ? (
                <mesh position={[0, 0, 0.04]}>
                  <ringGeometry args={[0.34, 0.48, 24]} />
                  <meshBasicMaterial color={theme.colors.surface} />
                </mesh>
              ) : null}
              <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.24, 0.3, 0.46, 20]} />
                <meshStandardMaterial
                  color={player.colorHex}
                  emissive={player.colorHex}
                  emissiveIntensity={isCurrentTurn ? 0.26 : 0.1}
                  metalness={0.24}
                  roughness={0.35}
                />
              </mesh>
              <mesh position={[0, 0, 0.56]} castShadow>
                <sphereGeometry args={[0.18, 18, 18]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  emissive={player.isLocal ? boardPlayerColors.sky : "#dbeafe"}
                  emissiveIntensity={player.isLocal ? 0.18 : 0.06}
                  metalness={0.18}
                  roughness={0.22}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </>
  );
}
