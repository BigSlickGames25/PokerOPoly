import { Href, router } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButtons } from "../components/controls/ActionButtons";
import { VirtualJoystick } from "../components/controls/VirtualJoystick";
import { AppBackdrop } from "../components/layout/AppBackdrop";
import { useGameLoop } from "../engine/useGameLoop";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";
import { GameState, PokeropolyPlayer } from "./types";
import { initGame, movePlayer } from "./logic";
import { Board } from "./Board";


  // Pokeropoly demo state
  const [state, setState] = useState<GameState>(() => initGame(["Alice", "Bob", "Carol", "Dave"]));

  // Demo: move current player on tap
  function handleBoardPress() {
    setState((prev) => {
      const steps = Math.floor(Math.random() * 6) + 1;
      const idx = prev.currentPlayer;
      const next = movePlayer(prev, idx, steps);
      // Advance turn
      return {
        ...next,
        currentPlayer: (idx + 1) % prev.players.length,
      };
    });
  }

  return (
    <View style={styles.root}>
      <AppBackdrop />
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
        <Text style={{ textAlign: "center", marginTop: 16, fontSize: 18, fontWeight: "bold" }}>
          Pokeropoly Board Demo
        </Text>
        <Text style={{ textAlign: "center", marginBottom: 8 }}>
          Tap the board to move the current player
        </Text>
        <View style={{ alignItems: "center" }}>
          <Pressable onPress={handleBoardPress}>
            <Board state={state} />
          </Pressable>
        </View>
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <Text>Current Player: {state.players[state.currentPlayer].name}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GameOverlay({
  onLeave,
  onRestart,
  paused,
  world
}: {
  onLeave: () => void;
  onRestart: () => void;
  paused: boolean;
  world: GameWorld | null;
}) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.overlayTitle}>
        {world?.gameOver ? "Run Over" : "Paused"}
      </Text>
      <Text style={styles.overlayText}>
        {world?.gameOver
          ? "Restart the loop or head back to the menu shell."
          : "The session is frozen. Resume when you are ready."}
      </Text>
      <View style={styles.overlayButtons}>
        <Pressable onPress={onRestart} style={styles.overlayPrimary}>
          <Text style={styles.overlayPrimaryText}>Restart</Text>
        </Pressable>
        <Pressable onPress={onLeave} style={styles.overlaySecondary}>
          <Text style={styles.overlaySecondaryText}>Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Arena({ world }: { world: GameWorld }) {
  const blink =
    world.player.invulnerableFor > 0 && Math.floor(world.time * 10) % 2 === 0;

  return (
    <View style={styles.arena}>
      <View
        style={[
          styles.orb,
          {
            height: world.orb.radius * 2,
            left: world.orb.position.x - world.orb.radius,
            top: world.orb.position.y - world.orb.radius,
            width: world.orb.radius * 2
          }
        ]}
      />
      {world.hazards.map((hazard) => (
        <View
          key={hazard.id}
          style={[
            styles.hazard,
            {
              borderRadius: hazard.radius,
              height: hazard.radius * 2,
              left: hazard.position.x - hazard.radius,
              top: hazard.position.y - hazard.radius,
              width: hazard.radius * 2
            }
          ]}
        />
      ))}
      <View
        style={[
          styles.player,
          blink && styles.playerBlink,
          {
            borderRadius: world.player.radius,
            height: world.player.radius * 2,
            left: world.player.position.x - world.player.radius,
            top: world.player.position.y - world.player.radius,
            width: world.player.radius * 2
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
    overflow: "hidden",
    overscrollBehavior: "none",
    touchAction: "none"
  },
  safeArea: {
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.md
  },
  gameShell: {
    flex: 1,
    gap: theme.spacing.md
  },
  gameShellLandscape: {
    gap: theme.spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm
  },
  headerLandscape: {
    paddingBottom: theme.spacing.sm
  },
  metricBlock: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    minWidth: 74,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  metricLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  metricValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  pauseButton: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  pauseButtonPressed: {
    opacity: 0.82
  },
  pauseLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14
  },
  arenaShell: {
    backgroundColor: "rgba(9, 18, 31, 0.72)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    overscrollBehavior: "none",
    position: "relative"
  },
  arenaShellLandscape: {
    minHeight: 0
  },
  arena: {
    flex: 1
  },
  orb: {
    backgroundColor: theme.colors.orb,
    borderRadius: 999,
    position: "absolute"
  },
  hazard: {
    backgroundColor: theme.colors.hazard,
    position: "absolute"
  },
  player: {
    backgroundColor: theme.colors.player,
    position: "absolute"
  },
  playerBlink: {
    opacity: 0.45
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(7, 17, 31, 0.76)",
    gap: theme.spacing.md,
    inset: 0,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    position: "absolute"
  },
  overlayTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: 32
  },
  overlayText: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  overlayButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  overlayPrimary: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  overlayPrimaryText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  overlaySecondary: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  overlaySecondaryText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  controlsRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md
  },
  landscapeSession: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 0
  },
  landscapeCenterColumn: {
    flex: 1,
    minHeight: 0
  },
  landscapeRail: {
    justifyContent: "center",
    paddingBottom: theme.spacing.sm,
    width: 188
  },
  landscapeRailLeft: {
    alignItems: "flex-start"
  },
  landscapeRailRight: {
    alignItems: "flex-end"
  }
});
