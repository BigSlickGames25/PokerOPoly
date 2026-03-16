import { createBoardSnapshot } from "./board/definition";
import type {
  BoardLogEntry,
  BoardLogTone,
  BoardMatchSnapshot,
  BoardPlayerState,
  BoardSessionAction,
  BoardSessionController,
  CreateBoardSessionControllerOptions
} from "./board/types";

const remoteSeatIds = ["remote-ava", "remote-mason", "remote-riley"];
const chanceDeltas = [180, -70, 120, -110, 90, 150];

function createLog(message: string, tone: BoardLogTone = "info"): BoardLogEntry {
  return {
    id: `log-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    message,
    timestamp: new Date().toISOString(),
    tone
  };
}

function appendLog(
  snapshot: BoardMatchSnapshot,
  message: string,
  tone: BoardLogTone = "info"
) {
  return {
    ...snapshot,
    activity: [createLog(message, tone), ...snapshot.activity].slice(0, 10)
  };
}

function appendDiagnostic(snapshot: BoardMatchSnapshot, message: string) {
  return {
    ...snapshot,
    diagnostics: [message, ...snapshot.diagnostics].slice(0, 4)
  };
}

function syncStatuses(snapshot: BoardMatchSnapshot) {
  return {
    ...snapshot,
    players: snapshot.players.map((player) => {
      let status = player.status;

      if (!player.connected) {
        status = "Joining table...";
      } else if (snapshot.phase === "lobby") {
        status = player.ready ? "Ready" : player.isLocal ? "Awaiting ready" : "Loading in";
      } else if (snapshot.phase === "finished") {
        status = "Match complete";
      } else if (snapshot.currentTurnPlayerId === player.id) {
        status = player.isLocal ? "Your turn" : "Thinking";
      } else if (snapshot.phase === "resolving") {
        status = "Resolving move";
      } else {
        status = "Waiting";
      }

      return {
        ...player,
        status
      };
    })
  };
}

function replacePlayer(
  players: BoardPlayerState[],
  playerId: string,
  updater: (player: BoardPlayerState) => BoardPlayerState
) {
  return players.map((player) => (player.id === playerId ? updater(player) : player));
}

function maybeStartMatch(snapshot: BoardMatchSnapshot) {
  if (snapshot.phase !== "lobby") {
    return snapshot;
  }

  const everyoneReady = snapshot.players.every(
    (player) => player.connected && player.ready
  );

  if (!everyoneReady) {
    return syncStatuses(snapshot);
  }

  return syncStatuses(
    appendLog(
      {
        ...snapshot,
        currentTurnPlayerId: snapshot.players[0]?.id ?? null,
        phase: "rolling"
      },
      `${snapshot.players[0]?.displayName ?? "Player 1"} opens the table.`,
      "positive"
    )
  );
}

function nextPlayerId(snapshot: BoardMatchSnapshot) {
  if (!snapshot.currentTurnPlayerId) {
    return snapshot.players[0]?.id ?? null;
  }

  const currentIndex = snapshot.players.findIndex(
    (player) => player.id === snapshot.currentTurnPlayerId
  );
  const nextIndex = (currentIndex + 1) % snapshot.players.length;

  return snapshot.players[nextIndex]?.id ?? null;
}

function maybeFinish(snapshot: BoardMatchSnapshot) {
  const bankruptPlayer = snapshot.players.find((player) => player.bankroll <= 0);

  if (!bankruptPlayer) {
    return snapshot;
  }

  const winner = [...snapshot.players].sort((a, b) => b.bankroll - a.bankroll)[0];

  return syncStatuses(
    appendLog(
      {
        ...snapshot,
        currentTurnPlayerId: null,
        phase: "finished"
      },
      `${winner?.displayName ?? "A player"} closes the table with the biggest stack.`,
      "positive"
    )
  );
}

function applyLandingEffects(snapshot: BoardMatchSnapshot, playerId: string) {
  const player = snapshot.players.find((entry) => entry.id === playerId);

  if (!player) {
    return snapshot;
  }

  const landedSpace = snapshot.spaces[player.tokenSpaceIndex];

  if (!landedSpace) {
    return snapshot;
  }

  let nextSnapshot = snapshot;
  const nextSpaces = snapshot.spaces.map((space) => ({ ...space }));
  const nextPlayers = snapshot.players.map((entry) => ({ ...entry }));
  const actingPlayer = nextPlayers.find((entry) => entry.id === playerId);

  if (!actingPlayer) {
    return snapshot;
  }

  switch (landedSpace.kind) {
    case "property": {
      if (!landedSpace.ownerId && actingPlayer.bankroll >= landedSpace.price + 180) {
        actingPlayer.bankroll -= landedSpace.price;
        nextSpaces[landedSpace.index] = {
          ...landedSpace,
          ownerId: actingPlayer.id
        };
        nextSnapshot = appendLog(
          {
            ...nextSnapshot,
            players: nextPlayers,
            spaces: nextSpaces
          },
          `${actingPlayer.displayName} buys ${landedSpace.label} for ${landedSpace.price}.`,
          "positive"
        );
      } else if (landedSpace.ownerId && landedSpace.ownerId !== actingPlayer.id) {
        const owner = nextPlayers.find((entry) => entry.id === landedSpace.ownerId);

        actingPlayer.bankroll -= landedSpace.rent;

        if (owner) {
          owner.bankroll += landedSpace.rent;
        }

        nextSnapshot = appendLog(
          {
            ...nextSnapshot,
            players: nextPlayers,
            spaces: nextSpaces
          },
          `${actingPlayer.displayName} pays ${landedSpace.rent} rent on ${landedSpace.label}.`,
          "warning"
        );
      }
      break;
    }
    case "chance": {
      const delta = chanceDeltas[nextSnapshot.turnNumber % chanceDeltas.length];
      actingPlayer.bankroll += delta;
      nextSnapshot = appendLog(
        {
          ...nextSnapshot,
          players: nextPlayers,
          spaces: nextSpaces
        },
        delta >= 0
          ? `${actingPlayer.displayName} spikes a chance card for +${delta}.`
          : `${actingPlayer.displayName} eats a chance penalty for ${delta}.`,
        delta >= 0 ? "positive" : "warning"
      );
      break;
    }
    case "tax": {
      actingPlayer.bankroll -= 125;
      nextSnapshot = appendLog(
        {
          ...nextSnapshot,
          players: nextPlayers,
          spaces: nextSpaces
        },
        `${actingPlayer.displayName} pays 125 to the house.`,
        "warning"
      );
      break;
    }
    case "station": {
      actingPlayer.bankroll += 75;
      nextSnapshot = appendLog(
        {
          ...nextSnapshot,
          players: nextPlayers,
          spaces: nextSpaces
        },
        `${actingPlayer.displayName} cashes a station bonus for 75.`,
        "positive"
      );
      break;
    }
    case "bonus": {
      actingPlayer.bankroll += 100;
      nextSnapshot = appendLog(
        {
          ...nextSnapshot,
          players: nextPlayers,
          spaces: nextSpaces
        },
        `${actingPlayer.displayName} collects a 100 bonus on ${landedSpace.label}.`,
        "positive"
      );
      break;
    }
    case "start": {
      actingPlayer.bankroll += 150;
      nextSnapshot = appendLog(
        {
          ...nextSnapshot,
          players: nextPlayers,
          spaces: nextSpaces
        },
        `${actingPlayer.displayName} lands on Go All In and pockets 150.`,
        "positive"
      );
      break;
    }
  }

  return maybeFinish(syncStatuses(nextSnapshot));
}

function rollCurrentPlayer(snapshot: BoardMatchSnapshot) {
  if (snapshot.phase !== "rolling" || !snapshot.currentTurnPlayerId) {
    return snapshot;
  }

  const dice: [number, number] = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
  const total = dice[0] + dice[1];
  const players = snapshot.players.map((player) => ({ ...player }));
  const currentPlayer = players.find(
    (player) => player.id === snapshot.currentTurnPlayerId
  );

  if (!currentPlayer) {
    return snapshot;
  }

  const previousSpace = currentPlayer.tokenSpaceIndex;
  const stepOffset = currentPlayer.lastRoll === null ? 1 : 0;
  const boardSteps = Math.max(total - stepOffset, 0);
  const nextSpace = (previousSpace + boardSteps) % snapshot.spaces.length;
  const passedStart = previousSpace + boardSteps >= snapshot.spaces.length;

  currentPlayer.lastRoll = dice;
  currentPlayer.tokenSpaceIndex = nextSpace;

  if (passedStart) {
    currentPlayer.bankroll += 200;
  }

  const withRoll = appendLog(
    {
      ...snapshot,
      dice,
      phase: "resolving",
      players
    },
    `${currentPlayer.displayName} rolls ${dice[0]} + ${dice[1]} and advances ${total}.`,
    "info"
  );

  const withPassBonus = passedStart
    ? appendLog(withRoll, `${currentPlayer.displayName} crosses start for +200.`, "positive")
    : withRoll;

  return applyLandingEffects(withPassBonus, currentPlayer.id);
}

function advanceTurn(snapshot: BoardMatchSnapshot) {
  if (snapshot.phase !== "resolving" && snapshot.phase !== "rolling") {
    return snapshot;
  }

  const nextId = nextPlayerId(snapshot);
  const nextPlayer = snapshot.players.find((player) => player.id === nextId);

  return syncStatuses(
    appendLog(
      {
        ...snapshot,
        currentTurnPlayerId: nextId,
        dice: null,
        phase: "rolling",
        turnNumber: snapshot.turnNumber + 1
      },
      `${nextPlayer?.displayName ?? "Next player"} is on the clock.`,
      "info"
    )
  );
}

export function createMockBoardSessionController({
  diagnostics = [],
  localDisplayName,
  localPlayerId,
  roomCode
}: CreateBoardSessionControllerOptions): BoardSessionController {
  let snapshot = syncStatuses(
    appendDiagnostic(
      createBoardSnapshot({
        connectionState: "connected",
        diagnostics,
        localDisplayName,
        localPlayerId,
        roomCode,
        transportMode: "mock"
      }),
      "Mock transport active. Replace with hub mode when the realtime endpoint is ready."
    )
  );
  const listeners = new Set<(snapshot: BoardMatchSnapshot) => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let scheduledRemoteTurnId: string | null = null;

  function emit() {
    listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);

    timers.add(timer);
  }

  function clearAllTimers() {
    timers.forEach((timer) => {
      clearTimeout(timer);
    });
    timers.clear();
    scheduledRemoteTurnId = null;
  }

  function commit(updater: (current: BoardMatchSnapshot) => BoardMatchSnapshot) {
    snapshot = updater(snapshot);
    emit();
    ensureRemoteAutomation();
  }

  function scheduleRemoteLobbyBootstrap(immediate = false) {
    remoteSeatIds.forEach((playerId, index) => {
      const connectDelay = immediate ? 100 + index * 80 : 450 + index * 320;
      const readyDelay = immediate ? 260 + index * 80 : 1100 + index * 340;

      schedule(() => {
        commit((current) =>
          syncStatuses(
            appendLog(
              {
                ...current,
                players: replacePlayer(current.players, playerId, (player) => ({
                  ...player,
                  connected: true
                }))
              },
              `${
                current.players.find((player) => player.id === playerId)?.displayName ?? "Player"
              } joins the room.`,
              "info"
            )
          )
        );
      }, connectDelay);

      schedule(() => {
        commit((current) =>
          maybeStartMatch({
            ...current,
            players: replacePlayer(current.players, playerId, (player) => ({
              ...player,
              connected: true,
              ready: true
            }))
          })
        );
      }, readyDelay);
    });
  }

  function ensureRemoteAutomation() {
    if (
      snapshot.phase !== "rolling" ||
      !snapshot.currentTurnPlayerId ||
      snapshot.currentTurnPlayerId === snapshot.localPlayerId ||
      snapshot.currentTurnPlayerId === scheduledRemoteTurnId
    ) {
      return;
    }

    scheduledRemoteTurnId = snapshot.currentTurnPlayerId;

    schedule(() => {
      const activeRemoteId = snapshot.currentTurnPlayerId;

      if (!activeRemoteId || activeRemoteId !== scheduledRemoteTurnId) {
        return;
      }

      scheduledRemoteTurnId = null;
      commit((current) => rollCurrentPlayer(current));

      if (snapshot.phase === "resolving" && snapshot.currentTurnPlayerId === activeRemoteId) {
        schedule(() => {
          commit((current) => advanceTurn(current));
        }, 1100);
      }
    }, 900);
  }

  scheduleRemoteLobbyBootstrap();

  return {
    destroy() {
      clearAllTimers();
    },
    async dispatch(action: BoardSessionAction) {
      switch (action.type) {
        case "toggle-ready": {
          commit((current) =>
            maybeStartMatch({
              ...current,
              players: replacePlayer(current.players, current.localPlayerId, (player) => ({
                ...player,
                connected: true,
                ready: !player.ready
              }))
            })
          );
          break;
        }
        case "roll-dice": {
          if (
            snapshot.phase !== "rolling" ||
            snapshot.currentTurnPlayerId !== snapshot.localPlayerId
          ) {
            return;
          }

          commit((current) => rollCurrentPlayer(current));
          break;
        }
        case "end-turn": {
          if (
            snapshot.phase !== "resolving" ||
            snapshot.currentTurnPlayerId !== snapshot.localPlayerId
          ) {
            return;
          }

          commit((current) => advanceTurn(current));
          break;
        }
        case "reset-match": {
          clearAllTimers();
          snapshot = syncStatuses(
            appendDiagnostic(
              createBoardSnapshot({
                connectionState: "connected",
                diagnostics,
                localDisplayName,
                localPlayerId,
                roomCode,
                transportMode: "mock"
              }),
              "Development match reset."
            )
          );
          emit();
          scheduleRemoteLobbyBootstrap(true);
          break;
        }
      }
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

