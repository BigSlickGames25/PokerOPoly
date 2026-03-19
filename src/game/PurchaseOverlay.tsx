import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View
} from "react-native";

import { GameButton } from "../components/ui/GameButton";
import { theme } from "../theme";
import type { BoardSpace } from "./board/types";

function DetailPill({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailPill}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function PurchaseOverlay({
  isVisible,
  onBuy,
  onPass,
  playerName,
  space
}: {
  isVisible: boolean;
  onBuy: () => void;
  onPass: () => void;
  playerName: string;
  space: BoardSpace | null;
}) {
  if (!isVisible || !space) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={[styles.overlay, { opacity: 1 }]}> 
      <LinearGradient
        colors={["rgba(3, 8, 18, 0.26)", "rgba(3, 8, 18, 0.88)"]}
        end={{ x: 0.82, y: 1 }}
        start={{ x: 0.18, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={styles.previewShell}>
          <View style={[styles.previewCard, { borderColor: space.accentColor }]}
          >
            <View
              style={[
                styles.previewGlow,
                { backgroundColor: space.accentColor }
              ]}
            />
            <View style={styles.previewHeader}>
              <Text style={styles.previewKicker}>Card {space.index + 1}</Text>
              <Text style={styles.previewStatus}>Available</Text>
            </View>
            <Text style={styles.previewTitle}>{space.label}</Text>
            <Text style={styles.previewBody}>Unowned property ready for a claim.</Text>
            <View style={styles.detailRow}>
              <DetailPill label="Type" value="Property" />
              <DetailPill label="Rent" value={`${space.rent}`} />
              <DetailPill label="Owner" value="None" />
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelKicker}>Purchase Board</Text>
          <Text style={styles.panelTitle}>{playerName}, buy this card?</Text>
          <Text style={styles.panelBody}>
            Buy claims ownership of the landed card. Pass leaves it open. Currency and pricing hooks can plug into this flow later.
          </Text>
          <View style={styles.metaRow}>
            <DetailPill label="Space" value={`${space.index + 1}`} />
            <DetailPill label="Track" value={space.label} />
          </View>
          <View style={styles.actionRow}>
            <View style={styles.actionCell}>
              <GameButton
                label="Buy"
                onPress={onBuy}
                subtitle="Claim ownership and close the purchase board"
                tone="primary"
              />
            </View>
            <View style={styles.actionCell}>
              <GameButton
                label="Pass"
                onPress={onPass}
                subtitle="Leave it unowned and continue the turn"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: theme.spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4
  },
  content: {
    alignItems: "center",
    gap: theme.spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  previewShell: {
    width: "100%"
  },
  previewCard: {
    backgroundColor: "rgba(245, 248, 255, 0.96)",
    borderRadius: 26,
    borderWidth: 2,
    overflow: "hidden",
    padding: theme.spacing.lg
  },
  previewGlow: {
    height: 10,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    right: 0,
    top: 0
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm
  },
  previewKicker: {
    color: "#0f172a",
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: "uppercase"
  },
  previewStatus: {
    color: "#0f172a",
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  },
  previewTitle: {
    color: "#0f172a",
    fontFamily: theme.fonts.display,
    fontSize: 30,
    lineHeight: 34
  },
  previewBody: {
    color: "#334155",
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.sm
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg
  },
  detailPill: {
    backgroundColor: "rgba(226, 232, 240, 0.72)",
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  detailLabel: {
    color: "#475569",
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  detailValue: {
    color: "#0f172a",
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13
  },
  panel: {
    backgroundColor: "rgba(8, 17, 31, 0.96)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    width: "100%"
  },
  panelKicker: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  panelTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: 28,
    lineHeight: 32
  },
  panelBody: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  actionCell: {
    flexBasis: 220,
    flexGrow: 1
  }
});
