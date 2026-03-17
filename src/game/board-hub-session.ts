import { buildSocketUrl, runtimeConfig } from "../config/runtime";
import { createBoardSnapshot } from "./board/definition";
import type {
  BoardMatchSnapshot,
  BoardSessionAction,
  BoardSessionController,
  CreateBoardSessionControllerOptions
} from "./board/types";

interface CreateHubBoardSessionControllerOptions
  extends CreateBoardSessionControllerOptions {
  productId: string;
  socketPath?: string;
  token: string;
}

function isSnapshotEnvelope(value: unknown): value is { snapshot: BoardMatchSnapshot } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "snapshot" in value &&
      typeof value.snapshot === "object"
  );
}

function mergeIncomingSnapshot(
  current: BoardMatchSnapshot,
  incoming: Partial<BoardMatchSnapshot>
) {
  const nextPhase = incoming.phase ?? current.phase;

  return {
    ...current,
    ...incoming,
    connectionState: "connected" as const,
    diagnostics: current.diagnostics,
    localPlayerId: current.localPlayerId,
    pendingPurchase:
      incoming.pendingPurchase ?? (nextPhase === "purchase" ? current.pendingPurchase : null),
    transportMode: "hub" as const
  };
}

export async function createHubBoardSessionController({
  diagnostics = [],
  localDisplayName,
  localPlayerId,
  productId,
  roomCode = "PKR-2048",
  socketPath,
  token
}: CreateHubBoardSessionControllerOptions): Promise<BoardSessionController> {
  let snapshot = createBoardSnapshot({
    connectionState: "connecting",
    diagnostics,
    localDisplayName,
    localPlayerId,
    roomCode,
    transportMode: "hub"
  });
  const listeners = new Set<(snapshot: BoardMatchSnapshot) => void>();
  const url = buildSocketUrl(socketPath ?? runtimeConfig.boardSocketPath, {
    authorization: token,
    productId,
    roomCode
  });
  const socket = new WebSocket(url);

  function emit() {
    listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Hub realtime connection timed out."));
    }, 5000);

    socket.onopen = () => {
      clearTimeout(timeout);
      snapshot = {
        ...snapshot,
        connectionState: "connected",
        diagnostics: [`Hub socket connected: ${roomCode}`, ...snapshot.diagnostics].slice(0, 4)
      };
      socket.send(
        JSON.stringify({
          type: "hello",
          displayName: localDisplayName,
          localPlayerId,
          productId,
          roomCode,
          token
        })
      );
      emit();
      resolve();
    };

    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Hub realtime handshake failed."));
    };
  });

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as unknown;

      if (isSnapshotEnvelope(parsed)) {
        snapshot = mergeIncomingSnapshot(snapshot, parsed.snapshot);
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "message" in parsed &&
        typeof parsed.message === "string"
      ) {
        snapshot = {
          ...snapshot,
          diagnostics: [parsed.message, ...snapshot.diagnostics].slice(0, 4)
        };
      }
    } catch {
      snapshot = {
        ...snapshot,
        diagnostics: [
          "Received malformed realtime payload from hub transport.",
          ...snapshot.diagnostics
        ].slice(0, 4)
      };
    }

    emit();
  };

  socket.onclose = () => {
    snapshot = {
      ...snapshot,
      connectionState: "degraded",
      diagnostics: [
        "Hub realtime connection closed. The local fallback will be used on reload.",
        ...snapshot.diagnostics
      ].slice(0, 4)
    };
    emit();
  };

  return {
    destroy() {
      socket.close();
    },
    async dispatch(action: BoardSessionAction) {
      socket.send(
        JSON.stringify({
          action,
          matchId: snapshot.matchId,
          type: "action"
        })
      );
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);

      return () => {
        listeners.delete(listener);
      };
    }
  };
}

