import { useRef } from "react";
import { Group } from "three";

// Props: playerId, seatIndex, boardModel, state (minimized, normal, fullscreen), onStateChange
export function PlayerConsole3D({
  playerId,
  seatIndex,
  boardModel,
  state = "minimized",
  onStateChange
}: {
  playerId: string;
  seatIndex: number;
  boardModel: any;
  state?: "minimized" | "normal" | "fullscreen";
  onStateChange?: (state: "minimized" | "normal" | "fullscreen") => void;
}) {
  // Position and scale logic will be handled by parent
  const groupRef = useRef<Group>(null);

  // TODO: Add UI controls for minimize/restore/fullscreen

  return (
    <group ref={groupRef}>
      <primitive dispose={null} object={boardModel.object} scale={[0.18, 0.18, 0.18]} />
      {/* Add overlay UI and controls here */}
    </group>
  );
}
