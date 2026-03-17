import { Href, router } from "expo-router";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake
} from "expo-keep-awake";
import { useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { runtimeConfig } from "../config/runtime";
import { AppBackdrop } from "../components/layout/AppBackdrop";
import { GameButton } from "../components/ui/GameButton";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { useHubSession } from "../platform/auth/session";
import { formatChipCount } from "../platform/lib/format";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";
import { BoardViewport } from "./BoardViewport";
import { PurchaseOverlay } from "./PurchaseOverlay";
import { useBoardSession } from "./useBoardSession";

function formatPhaseLabel(phase: string) {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

export function GameExperience() {
  const device = useDeviceProfile();
  const { currentProduct, status } = useHubSession();
  const { settings } = useGameSettings();
  const {
    buyPendingSpace,
    canEndTurn,
    canResolvePurchase,
    canRoll,
    canToggleReady,
    endTurn,
    localPlayer,
    passPendingSpace,
    pendingPurchaseSpace,
    resetMatch,
    rollDice,
    snapshot,
    toggleReady,
    turnPlayer
  } = useBoardSession();
  const isWide = device.isLandscape || device.width >= 960;
  const titleSize = Math.round(clamp(34 * device.textScale, 28, 40));
  const connectedCount = snapshot.players.filter((player) => player.connected).length;
  const readyCount = snapshot.players.filter((player) => player.ready).length;
  const localReady = Boolean(localPlayer?.ready);
  const pendingPurchaseRevealKey = snapshot.pendingPurchase
    ? `${snapshot.pendingPurchase.playerId}:${snapshot.pendingPurchase.spaceIndex}:${snapshot.turnNumber}`
    : null;
  const [purchasePresentationReadyKey, setPurchasePresentationReadyKey] = useState<string | null>(null);
  const canRevealPurchasePresentation =
    pendingPurchaseRevealKey !== null &&
    purchasePresentationReadyKey === pendingPurchaseRevealKey;
  const showPurchaseOverlay =
    canResolvePurchase && Boolean(pendingPurchaseSpace) && canRevealPurchasePresentation;
  const focusedSpaceIndex = canRevealPurchasePresentation
    ? snapshot.pendingPurchase?.spaceIndex ?? null
    : null;
  const actionLabel =
    snapshot.phase === "lobby"
      ? localReady
        ? "Stand Down"
        : "Ready Up"
      : canResolvePurchase
        ? "Purchase Board"
        : canRoll
          ? "Roll Dice"
          : canEndTurn
            ? "End Turn"
            : "Waiting";

  useEffect(() => {
    if (!pendingPurchaseRevealKey) {
      setPurchasePresentationReadyKey(null);
    }
  }, [pendingPurchaseRevealKey]);

  useEffect(() => {
    if (settings.keepAwake) {
      void activateKeepAwakeAsync("board-session");
    } else {
      void deactivateKeepAwake("board-session");
    }

    return () => {
      void deactivateKeepAwake("board-session");
    };
  }, [settings.keepAwake]);

  function leaveGame() {
    void fireHaptic(settings.haptics, "tap");
    router.replace("/" as Href);
  }

  function runPrimaryAction() {
    if (snapshot.phase === "lobby" && canToggleReady) {
      void fireHaptic(settings.haptics, "confirm");
      void toggleReady();
      return;
    }

    if (canRoll) {
      void fireHaptic(settings.haptics, "boost");
      void rollDice();
      return;
    }

    if (canEndTurn) {
      void fireHaptic(settings.haptics, "confirm");
      void endTurn();
    }
  }

  function runBuyPendingSpace() {
    if (!canResolvePurchase) {
      return;
    }

    void fireHaptic(settings.haptics, "confirm");
    void buyPendingSpace();
  }

  function runPassPendingSpace() {
    if (!canResolvePurchase) {
      return;
    }

    void fireHaptic(settings.haptics, "tap");
    void passPendingSpace();
  }

  function runReset() {
    void fireHaptic(settings.haptics, "pause");
    void resetMatch();
  }

  function handlePurchasePresentationReady(purchaseKey: string) {
    setPurchasePresentationReadyKey((current) =>
      current === purchaseKey ? current : purchaseKey
    );
  }

  const metrics = (
    <View style={[styles.metricRow, isWide && styles.metricRowWide]}>
      <MetricCard label="Room" value={snapshot.roomCode} />
      <MetricCard label="Players" value={`${connectedCount}/4 online`} />
      <MetricCard
        label="Turn"
        value={turnPlayer ? turnPlayer.displayName : "Waiting"}
      />
      <MetricCard
        label="Dice"
        value={snapshot.dice ? `${snapshot.dice[0]} + ${snapshot.dice[1]}` : "Pending"}
      />
    </View>
  );

  const stageCard = (
    <View style={[styles.stageCard, isWide && styles.stageCardWide]}>
      <View style={styles.stageHeader}>
        <Text style={styles.stageKicker}>3D Realtime Foundation</Text>
        <Text style={[styles.stageTitle, { fontSize: titleSize, lineHeight: titleSize + 4 }]}>
          PokerOpoly development board.
        </Text>
        <Text style={styles.stageBody}>
          React Three Fiber now drives the core scene, the shared hub session
          stays intact, and the gameplay route is wired for a 4-player online
          board-game loop instead of the old 2D arcade placeholder.
        </Text>
      </View>
      <View style={[styles.viewportShell, isWide ? styles.viewportWide : styles.viewportTall]}>
        <BoardViewport
          focusedSpaceIndex={focusedSpaceIndex}
          onPurchaseRevealReady={handlePurchasePresentationReady}
          pendingPurchaseRevealKey={pendingPurchaseRevealKey}
          snapshot={snapshot}
        />
        <PurchaseOverlay
          isVisible={showPurchaseOverlay}
          onBuy={runBuyPendingSpace}
          onPass={runPassPendingSpace}
          playerName={localPlayer?.displayName ?? turnPlayer?.displayName ?? "Player One"}
          space={pendingPurchaseSpace}
        />
      </View>
    </View>
  );

  const panels = (
    <>
      <PanelCard
        subtitle="Shared shell styling with a dedicated board-session runtime."
        title="Session"
      >
        <View style={styles.sessionSummary}>
          <Text style={styles.sessionLine}>Product: {currentProduct.title}</Text>
          <Text style={styles.sessionLine}>Hub status: {status}</Text>
          <Text style={styles.sessionLine}>
            Transport: {snapshot.transportMode} / {snapshot.connectionState}
          </Text>
          <Text style={styles.sessionLine}>Phase: {formatPhaseLabel(snapshot.phase)}</Text>
          <Text style={styles.sessionLine}>
            Backend: {runtimeConfig.backendLabel}
          </Text>
          <Text style={styles.sessionLine}>
            Socket mode: {runtimeConfig.boardTransportLabel}
          </Text>
        </View>
      </PanelCard>

      <PanelCard
        subtitle="Seat order, bankroll, readiness, and current table status."
        title="Table Seats"
      >
        <View style={styles.seatStack}>
          {snapshot.players.map((player) => {
            const isTurn = snapshot.currentTurnPlayerId === player.id;

            return (
              <View
                key={player.id}
                style={[
                  styles.seatCard,
                  isTurn && styles.seatCardActive,
                  player.isLocal && styles.seatCardLocal
                ]}
              >
                <View
                  style={[
                    styles.seatColor,
                    {
                      backgroundColor: player.colorHex
                    }
                  ]}
                />
                <View style={styles.seatCopy}>
                  <Text style={styles.seatName}>
                    {player.displayName}
                    {player.isLocal ? " (You)" : ""}
                  </Text>
                  <Text style={styles.seatMeta}>
                    Seat {player.seatIndex + 1} - {player.status}
                  </Text>
                  <Text style={styles.seatMeta}>
                    Position {player.lastRoll ? `Card ${player.tokenSpaceIndex + 1}` : `Home -> Card ${player.tokenSpaceIndex + 1}`}
                  </Text>
                  <Text style={styles.seatMeta}>
                    Stack {formatChipCount(player.bankroll)}
                    {player.lastRoll ? ` - Last roll ${player.lastRoll[0]} + ${player.lastRoll[1]}` : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </PanelCard>

      <PanelCard
        subtitle="Primary input is reduced to turn actions, reset, and navigation while the 3D board renders the state."
        title="Controls"
      >
        <View style={styles.buttonStack}>
          <GameButton
            disabled={actionLabel === "Waiting" || actionLabel === "Purchase Board"}
            label={actionLabel}
            onPress={runPrimaryAction}
            subtitle={
              canResolvePurchase
                ? showPurchaseOverlay
                  ? "Choose Buy or Pass on the purchase board over the viewport"
                  : "Camera is returning to the board before the purchase prompt opens"
                : snapshot.phase === "lobby"
                  ? `${readyCount}/4 players ready`
                  : turnPlayer
                    ? `${turnPlayer.displayName} is the active player`
                    : "Waiting for turn sync"
            }
            tone="primary"
          />
          <GameButton
            label="Reset Match"
            onPress={runReset}
            subtitle="Rebuild the local table state and replay the multiplayer bootstrap"
          />
          <GameButton
            label="Return to Menu"
            onPress={leaveGame}
            subtitle="Leave the board surface and go back to the app shell"
          />
        </View>
      </PanelCard>

      <PanelCard
        subtitle="Latest transport and game-state messages from the current runtime."
        title="Diagnostics"
      >
        <View style={styles.logStack}>
          {snapshot.diagnostics.map((entry) => (
            <Text key={entry} style={styles.logLine}>
              {entry}
            </Text>
          ))}
        </View>
      </PanelCard>

      <PanelCard
        subtitle="This is the event stream your real backend and rules engine will eventually own."
        title="Action Log"
      >
        <View style={styles.logStack}>
          {snapshot.activity.map((entry) => (
            <View key={entry.id} style={styles.logEntry}>
              <Text
                style={[
                  styles.logTone,
                  entry.tone === "positive" && styles.logTonePositive,
                  entry.tone === "warning" && styles.logToneWarning
                ]}
              >
                {entry.tone.toUpperCase()}
              </Text>
              <Text style={styles.logLine}>{entry.message}</Text>
            </View>
          ))}
        </View>
      </PanelCard>
    </>
  );

  return (
    <View style={styles.root}>
      <AppBackdrop />
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={styles.safeArea}
      >
        {isWide ? (
          <View style={styles.wideShell}>
            <View style={styles.stageColumn}>
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroKicker}>{currentProduct.title}</Text>
                  <Pressable
                    onPress={leaveGame}
                    style={({ pressed }) => [
                      styles.menuPill,
                      pressed && styles.menuPillPressed
                    ]}
                  >
                    <Text style={styles.menuPillLabel}>Menu</Text>
                  </Pressable>
                </View>
                <Text style={styles.heroDescription}>
                  Four seats, shared backend session context, cross-platform 3D
                  rendering, and a mock-to-hub realtime path for development.
                </Text>
              </View>
              {metrics}
              {stageCard}
            </View>

            <ScrollView
              contentContainerStyle={styles.sidebarContent}
              showsVerticalScrollIndicator={false}
              style={styles.sidebar}
            >
              {panels}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.mobileContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.heroKicker}>{currentProduct.title}</Text>
                <Pressable
                  onPress={leaveGame}
                  style={({ pressed }) => [
                    styles.menuPill,
                    pressed && styles.menuPillPressed
                  ]}
                >
                  <Text style={styles.menuPillLabel}>Menu</Text>
                </Pressable>
              </View>
              <Text style={styles.heroDescription}>
                Four seats, shared backend session context, cross-platform 3D
                rendering, and a mock-to-hub realtime path for development.
              </Text>
            </View>
            {metrics}
            {stageCard}
            {panels}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PanelCard({
  children,
  subtitle,
  title
}: {
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelSubtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  wideShell: {
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.lg,
    minHeight: 0,
    paddingBottom: theme.spacing.md
  },
  stageColumn: {
    flex: 1,
    gap: theme.spacing.md,
    minHeight: 0,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm
  },
  sidebar: {
    flexBasis: 390,
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: theme.spacing.sm
  },
  sidebarContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl
  },
  mobileContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    paddingTop: theme.spacing.sm
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroKicker: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  heroDescription: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22
  },
  menuPill: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8
  },
  menuPillPressed: {
    opacity: 0.82
  },
  menuPillLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  metricRowWide: {
    flexWrap: "nowrap"
  },
  metricCard: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.lg,
    flexGrow: 1,
    gap: 6,
    minWidth: 140,
    padding: theme.spacing.md
  },
  metricLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  metricValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16
  },
  stageCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  stageCardWide: {
    flex: 1,
    minHeight: 0
  },
  stageHeader: {
    gap: theme.spacing.sm
  },
  stageKicker: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  stageTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display
  },
  stageBody: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22
  },
  viewportShell: {
    backgroundColor: "rgba(6, 16, 28, 0.76)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative"
  },
  viewportWide: {
    flex: 1,
    minHeight: 0
  },
  viewportTall: {
    height: 360
  },
  panelCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  panelTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  panelSubtitle: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  sessionSummary: {
    gap: 8
  },
  sessionLine: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  seatStack: {
    gap: theme.spacing.sm
  },
  seatCard: {
    alignItems: "center",
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  seatCardActive: {
    borderColor: theme.colors.surface,
    borderWidth: 1
  },
  seatCardLocal: {
    backgroundColor: "rgba(15, 31, 54, 0.96)"
  },
  seatColor: {
    borderRadius: 999,
    height: 14,
    width: 14
  },
  seatCopy: {
    flex: 1,
    gap: 4
  },
  seatName: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  seatMeta: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  buttonStack: {
    gap: theme.spacing.md
  },
  logStack: {
    gap: theme.spacing.sm
  },
  logEntry: {
    gap: 4
  },
  logTone: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  logTonePositive: {
    color: "#34d399"
  },
  logToneWarning: {
    color: theme.colors.warning
  },
  logLine: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19
  }
});
