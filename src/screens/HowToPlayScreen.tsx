import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { theme } from "../theme";

export function HowToPlayScreen() {
  const device = useDeviceProfile();
  const isWide = device.isLandscape || device.width >= 860;
  const isCompact = device.width < 390;

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
    >
      <InfoCard
        body="The game route now renders a 3D board scene, a four-seat table state, and turn-based controls. The default runtime uses a local mock transport so frontend work can continue before the realtime backend is ready."
        compact={isCompact}
        title="Gameplay loop"
        wide={isWide}
      />
      <InfoCard
        body="Replace the board rules, tile effects, lobby flow, and final art pipeline inside src/game and src/game/board. Keep the navigation shell, shared settings, and hub session plumbing unless the product needs different UX."
        compact={isCompact}
        title="Replace points"
        wide={isWide}
      />
      <InfoCard
        body="Shared hub integration still lives in src/platform. That layer wraps auth, profile, wallet, transactions, rewards, analytics, and session bootstrap. The board-game transport is now a product-specific adapter layered on top."
        compact={isCompact}
        title="Hub layer"
        wide={isWide}
      />
      <InfoCard
        body="Safe areas, modal navigation, screen orientation control, haptics, and keep-awake are already wired. The gameplay surface remains full-screen and still respects the template's mobile-first behavior."
        compact={isCompact}
        title="iOS behavior"
        wide={isWide}
      />
      <InfoCard
        body="Brand the app config, add your GLB assets and textures, point the env at the correct hub backend and socket, test on physical devices, and export web separately to S3 and CloudFront."
        compact={isCompact}
        title="Before shipping"
        wide={isWide}
      />
    </ScreenContainer>
  );
}

function InfoCard({
  body,
  compact,
  title,
  wide
}: {
  body: string;
  compact?: boolean;
  title: string;
  wide?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        compact && styles.cardCompact
      ]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg,
    marginHorizontal: "auto",
    maxWidth: 1180,
    paddingBottom: theme.spacing.xxxl + 96,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  contentWide: {
    alignItems: "flex-start"
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    width: "100%"
  },
  cardCompact: {
    padding: theme.spacing.md
  },
  cardWide: {
    minWidth: "48%",
    width: "48%"
  },
  cardTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  cardBody: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22
  }
});
