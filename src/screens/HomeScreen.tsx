import { Href, router } from "expo-router";
import { startTransition } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { GameButton } from "../components/ui/GameButton";
import { runtimeConfig } from "../config/runtime";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import {
  coreHubCapabilities,
  hubProducts
} from "../platform/catalog/products";
import { useHubSession } from "../platform/auth/session";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";

export function HomeScreen() {
  const device = useDeviceProfile();
  const { settings } = useGameSettings();
  const { currentProduct, hasToken, profile, status } = useHubSession();
  const isWide = device.isLandscape || device.width >= 860;
  const isCompact = device.width < 390;
  const titleFontSize = Math.round(clamp(34 * device.textScale, 28, 38));
  const sessionLabel = profile?.sUserName
    ? `${profile.sUserName}${typeof profile.nChips === "number" ? ` - ${profile.nChips} chips` : ""}`
    : status === "guest"
      ? "Guest session bootstrap ready"
      : hasToken
        ? "Stored hub token"
        : "No session yet";

  function goToGame() {
    void fireHaptic(settings.haptics, "confirm");
    startTransition(() => {
      router.push("/game" as Href);
    });
  }

  function goToLauncher() {
    void fireHaptic(settings.haptics, "tap");
    router.navigate("/launcher" as Href);
  }

  function goToHub() {
    void fireHaptic(settings.haptics, "tap");
    router.navigate("/hub" as Href);
  }

  function goToSettings() {
    void fireHaptic(settings.haptics, "tap");
    router.navigate("/settings" as Href);
  }

  function goToHowToPlay() {
    void fireHaptic(settings.haptics, "tap");
    router.navigate("/how-to-play" as Href);
  }

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
    >
      <View style={[styles.topRow, isWide && styles.topRowWide]}>
        <View
          style={[
            styles.heroCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.kicker}>3D Board Game Runtime</Text>
          <Text
            style={[
              styles.title,
              {
                fontSize: titleFontSize,
                lineHeight: titleFontSize + 4
              }
            ]}
          >
            PokerOpoly now runs as a 4-player online 3D board game.
          </Text>
          <Text style={styles.description}>
            The shell still provides safe areas, routing, haptics, and shared
            platform access. The gameplay route now mounts a React Three Fiber
            scene and a multiplayer board-session scaffold instead of the old
            2D sample loop.
          </Text>
        </View>

        <View
          style={[
            styles.notesCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.notesTitle}>Shared Platform + 3D Scene</Text>
          <Text style={styles.notesText}>
            Auth, profile, wallet, rewards, and session bootstrap still live in
            the shared platform layer. The new gameplay stack sits on top as a
            dedicated board-game adapter instead of a disconnected prototype.
          </Text>
          <Text style={styles.notesMeta}>Active product: {currentProduct.title}</Text>
          <Text style={styles.notesMeta}>Shared catalog: {hubProducts.length} products</Text>
          <Pressable
            onPress={goToGame}
            style={({ pressed }) => [
              styles.inlineAction,
              pressed && styles.inlineActionPressed
            ]}
          >
            <Text style={styles.inlineActionText}>Open board preview</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomRow, isWide && styles.bottomRowWide]}>
        <View style={[styles.featureGrid, isWide && styles.bottomPanel]}>
          <FeatureChip
            compact={isCompact}
            label="Safe Areas"
            value="Top notch + home indicator aware"
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Orientation"
            value={
              settings.orientation === "adaptive"
                ? "Adaptive"
                : settings.orientation === "portrait"
                  ? "Portrait"
                  : "Landscape"
            }
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Renderer"
            value="React Three Fiber"
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Feedback"
            value={`Haptics ${settings.haptics}`}
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Backend"
            value={runtimeConfig.backendLabel}
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Session"
            value={sessionLabel}
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Core"
            value={`${coreHubCapabilities.length} shared services`}
            wide={isWide}
          />
        </View>

        <View style={[styles.buttonStack, isWide && styles.bottomPanel]}>
          <GameButton
            label="Launcher"
            onPress={goToLauncher}
            subtitle="Choose the active game or app identity for this build"
            tone="primary"
          />
          <GameButton
            label="Hub Console"
            onPress={goToHub}
            subtitle="Open auth, profile, wallet, and rewards routes"
          />
          <GameButton
            label="Open 3D Board"
            onPress={goToGame}
            subtitle="Open the 3D board route with mock realtime and shared hub session context"
          />
          <GameButton
            label="Settings"
            onPress={goToSettings}
            subtitle="Local device settings today, backend player settings next"
          />
          <GameButton
            label="How To Play"
            onPress={goToHowToPlay}
            subtitle="Board-game architecture, replacement points, and deployment flow"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function FeatureChip({
  compact,
  label,
  value,
  wide
}: {
  compact?: boolean;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View
      style={[
        styles.featureChip,
        wide && styles.featureChipWide,
        compact && styles.featureChipCompact
      ]}
    >
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: "auto",
    maxWidth: 1180,
    paddingBottom: theme.spacing.xxxl + 96,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  contentWide: {
    gap: theme.spacing.xl
  },
  topRow: {
    gap: theme.spacing.lg
  },
  topRowWide: {
    flexDirection: "row"
  },
  bottomRow: {
    gap: theme.spacing.lg
  },
  bottomRowWide: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  splitPanel: {
    flex: 1
  },
  bottomPanel: {
    flex: 1
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  compactCard: {
    padding: theme.spacing.lg
  },
  kicker: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    flexShrink: 1,
    fontFamily: theme.fonts.display,
    fontSize: 34,
    lineHeight: 38
  },
  description: {
    color: theme.colors.subtleText,
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  featureChip: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.lg,
    gap: 6,
    minWidth: "47%",
    padding: theme.spacing.md
  },
  featureChipWide: {
    minWidth: "31%"
  },
  featureChipCompact: {
    minWidth: "100%"
  },
  featureLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  featureValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  buttonStack: {
    gap: theme.spacing.md
  },
  notesCard: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.xl,
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  notesTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  notesText: {
    color: theme.colors.subtleText,
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 23
  },
  notesMeta: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.3
  },
  inlineAction: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  inlineActionPressed: {
    opacity: 0.8
  },
  inlineActionText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14
  }
});
