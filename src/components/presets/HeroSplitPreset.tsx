import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme";
import type { ScreenElementDefinition } from "../../types/screen-builder";
import { GameButton } from "../ui/GameButton";

interface HeroSplitPresetProps {
  backendLabel: string;
  catalogCount: number;
  coreCapabilityCount: number;
  currentProductTitle: string;
  element: ScreenElementDefinition;
  hapticsLabel: string;
  inputLabel: string;
  isCompact: boolean;
  isWide: boolean;
  onGuide: () => void;
  onHub: () => void;
  onLauncher: () => void;
  onPlay: () => void;
  onSettings: () => void;
  orientationLabel: string;
  sessionLabel: string;
  titleFontSize: number;
}

export function HeroSplitPreset({
  backendLabel,
  catalogCount,
  coreCapabilityCount,
  currentProductTitle,
  element,
  hapticsLabel,
  inputLabel,
  isCompact,
  isWide,
  onGuide,
  onHub,
  onLauncher,
  onPlay,
  onSettings,
  orientationLabel,
  sessionLabel,
  titleFontSize
}: HeroSplitPresetProps) {
  return (
    <View style={styles.shell}>
      <View style={[styles.heroRow, isWide && styles.heroRowWide]}>
        <View
          style={[
            styles.heroCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.eyebrow}>
            {element.category} preset | {element.label}
          </Text>
          <Text
            style={[
              styles.title,
              {
                fontSize: titleFontSize,
                lineHeight: titleFontSize + 6
              }
            ]}
          >
            Touch-first game shell with shared hub routes already wired in.
          </Text>
          <Text style={styles.description}>
            The provided screen schema now drives this landing view. The
            hero-split preset keeps the Expo starter focused on fast launch
            paths, session visibility, and reusable platform navigation.
          </Text>
          <View
            style={[
              styles.primaryActions,
              isCompact && styles.primaryActionsCompact
            ]}
          >
            <View style={styles.primaryButtonWrap}>
              <GameButton
                label="Play sample now"
                onPress={onPlay}
                subtitle="Open the gameplay shell and replace the loop later"
                tone="primary"
              />
            </View>
            <View style={styles.primaryButtonWrap}>
              <GameButton
                label="Launcher"
                onPress={onLauncher}
                subtitle="Switch the active product identity for this build"
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.summaryTitle}>Build snapshot</Text>
          <Text style={styles.summaryBody}>
            Use the shared hub routes for auth, profile, wallet, rewards, and
            settings while game-specific systems evolve independently.
          </Text>
          <View style={styles.statGrid}>
            <StatTile label="Active product" value={currentProductTitle} />
            <StatTile label="Session" value={sessionLabel} />
            <StatTile label="Backend" value={backendLabel} />
            <StatTile label="Shared catalog" value={`${catalogCount} products`} />
            <StatTile
              label="Core services"
              value={`${coreCapabilityCount} modules`}
            />
            <StatTile label="Feedback" value={hapticsLabel} />
          </View>
          <View style={styles.linkRow}>
            <LinkChip label="Hub Console" onPress={onHub} />
            <LinkChip label="Settings" onPress={onSettings} />
            <LinkChip label="Guide" onPress={onGuide} />
          </View>
        </View>
      </View>

      <View style={[styles.detailGrid, isCompact && styles.detailGridCompact]}>
        <DetailCard label="Orientation" value={orientationLabel} />
        <DetailCard label="Input" value={inputLabel} />
        <DetailCard label="Shape" value={element.shape} />
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function LinkChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkChip,
        pressed && styles.linkChipPressed
      ]}
    >
      <Text style={styles.linkChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    padding: theme.spacing.lg
  },
  description: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24
  },
  detailCard: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.lg,
    flex: 1,
    gap: 6,
    minWidth: 180,
    padding: theme.spacing.md
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  detailGridCompact: {
    flexDirection: "column"
  },
  detailLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  detailValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  eyebrow: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  heroRow: {
    gap: theme.spacing.lg
  },
  heroRowWide: {
    flexDirection: "row"
  },
  linkChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  linkChipPressed: {
    backgroundColor: theme.colors.surfacePressed
  },
  linkChipText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  primaryActions: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  primaryActionsCompact: {
    flexDirection: "column"
  },
  primaryButtonWrap: {
    flex: 1,
    minWidth: 220
  },
  shell: {
    gap: theme.spacing.lg,
    maxWidth: 1180,
    width: "100%"
  },
  splitPanel: {
    flex: 1
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  statLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  statTile: {
    backgroundColor: "rgba(7, 17, 31, 0.4)",
    borderRadius: theme.radius.lg,
    flex: 1,
    gap: 6,
    minWidth: 150,
    padding: theme.spacing.md
  },
  statValue: {
    color: theme.colors.text,
    flexShrink: 1,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  summaryBody: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 23
  },
  summaryCard: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.xl,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  summaryTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 22
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display
  }
});
