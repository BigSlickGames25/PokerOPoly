import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { runtimeConfig } from "../config/runtime";
import { useHubSession } from "../platform/auth/session";
import { createHubBoardSessionController } from "./board-hub-session";
import { createBoardSnapshot } from "./board/definition";
import { createMockBoardSessionController } from "./board-mock-session";
import type { BoardMatchSnapshot, BoardSessionController } from "./board/types";

function createInitialLoadingSnapshot(localPlayerId: string, displayName: string) {
  return createBoardSnapshot({
    connectionState: "connected",
    diagnostics: ["Bootstrapping board session..."],
    localDisplayName: displayName,
    localPlayerId,
    roomCode: "PKR-2048",
    transportMode: "mock"
  });
}

export function useBoardSession() {
  const { currentProduct, guestDeviceId, profile, token } = useHubSession();
  const localPlayerId =
    profile?._id ?? guestDeviceId ?? `${currentProduct.id}-local-player`;
  const localDisplayName = profile?.sUserName ?? "Player One";
  const [snapshot, setSnapshot] = useState<BoardMatchSnapshot>(() =>
    createInitialLoadingSnapshot(localPlayerId, localDisplayName)
  );
  const controllerRef = useRef<BoardSessionController | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    async function connect() {
      controllerRef.current?.destroy();

      const diagnostics = [
        `Product: ${currentProduct.title}`,
        `Transport: ${runtimeConfig.boardTransportMode}`
      ];

      let controller: BoardSessionController | null = null;

      if (runtimeConfig.boardTransportMode === "hub" && token) {
        try {
          controller = await createHubBoardSessionController({
            diagnostics,
            localDisplayName,
            localPlayerId,
            productId: currentProduct.id,
            roomCode: "PKR-2048",
            token
          });
        } catch (error) {
          controller = createMockBoardSessionController({
            diagnostics: [
              error instanceof Error
                ? `Hub transport failed: ${error.message}`
                : "Hub transport failed. Falling back to mock.",
              ...diagnostics
            ],
            localDisplayName,
            localPlayerId,
            roomCode: "PKR-2048"
          });
        }
      }

      if (!controller) {
        controller = createMockBoardSessionController({
          diagnostics,
          localDisplayName,
          localPlayerId,
          roomCode: "PKR-2048"
        });
      }

      if (!mounted) {
        controller.destroy();
        return;
      }

      controllerRef.current = controller;
      unsubscribe = controller.subscribe((nextSnapshot) => {
        startTransition(() => {
          setSnapshot(nextSnapshot);
        });
      });
      setSnapshot(controller.getSnapshot());
    }

    void connect();

    return () => {
      mounted = false;
      unsubscribe();
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [currentProduct.id, currentProduct.title, localDisplayName, localPlayerId, token]);

  const localPlayer = useMemo(
    () => snapshot.players.find((player) => player.id === snapshot.localPlayerId) ?? null,
    [snapshot.localPlayerId, snapshot.players]
  );
  const turnPlayer = useMemo(
    () =>
      snapshot.players.find((player) => player.id === snapshot.currentTurnPlayerId) ?? null,
    [snapshot.currentTurnPlayerId, snapshot.players]
  );

  const canToggleReady = snapshot.phase === "lobby";
  const canRoll =
    snapshot.phase === "rolling" && snapshot.currentTurnPlayerId === snapshot.localPlayerId;
  const canEndTurn =
    snapshot.phase === "resolving" &&
    snapshot.currentTurnPlayerId === snapshot.localPlayerId;

  return {
    canEndTurn,
    canRoll,
    canToggleReady,
    endTurn: () => controllerRef.current?.dispatch({ type: "end-turn" }),
    localPlayer,
    resetMatch: () => controllerRef.current?.dispatch({ type: "reset-match" }),
    rollDice: () => controllerRef.current?.dispatch({ type: "roll-dice" }),
    snapshot,
    toggleReady: () => controllerRef.current?.dispatch({ type: "toggle-ready" }),
    turnPlayer
  };
}
