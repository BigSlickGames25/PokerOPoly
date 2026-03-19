import { Href, router } from "expo-router";
import { startTransition } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { HeroSplitPreset } from "../components/presets/HeroSplitPreset";
import { runtimeConfig } from "../config/runtime";
import { homeScreenLayout } from "../content/home-screen-layout";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { coreHubCapabilities, hubProducts } from "../platform/catalog/products";
import { useHubSession } from "../platform/auth/session";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";
import type {
  ScreenDefinition,
  ScreenElementAlignY,
  ScreenElementDefinition
} from "../types/screen-builder";

export function HomeScreen() {
  const device = useDeviceProfile();
  const { settings } = useGameSettings();
  const { currentProduct, hasToken, profile, status } = useHubSession();
  const isWide = device.isLandscape || device.width >= 860;
  const isCompact = device.width < 390;
  const titleFontSize = Math.round(clamp(34 * device.textScale, 28, 38));
  const homeScreen: ScreenDefinition = homeScreenLayout.screens[0] ?? {
    id: "home-fallback",
    name: "Home",
    elements: []
  };
  const sessionLabel = profile?.sUserName
    ? [
        profile.sUserName,
        typeof profile.nChips === "number" ? `${profile.nChips} chips` : null
      ]
        .filter((value): value is string => Boolean(value))
        .join(" - ")
    : status === "guest"
      ? "Guest session bootstrap ready"
      : hasToken
        ? "Stored hub token"
        : "No session yet";
  const orientationLabel =
    settings.orientation === "adaptive"
      ? "Adaptive"
      : settings.orientation === "portrait"
        ? "Portrait"
        : "Landscape";
  const inputLabel =
    settings.handPreference === "left"
      ? "Left-handed HUD"
      : "Right-handed HUD";
  const hapticsLabel = `Haptics ${settings.haptics}`;

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
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View
        style={[
          styles.canvas,
          getCanvasVerticalStyle(homeScreen.elements[0]?.alignY ?? "top")
        ]}
      >
        {homeScreen.elements.map((element) => (
          <View
            key={element.id}
            style={[
              styles.elementFrame,
              getElementFrameStyle(element),
              {
                marginTop: element.offsetY,
                transform: [
                  { translateX: element.offsetX },
                  { scale: element.scale }
                ]
              }
            ]}
          >
            {renderElement({
              backendLabel: runtimeConfig.backendLabel,
              catalogCount: hubProducts.length,
              coreCapabilityCount: coreHubCapabilities.length,
              currentProductTitle: currentProduct.title,
              element,
              hapticsLabel,
              inputLabel,
              isCompact,
              isWide,
              onGuide: goToHowToPlay,
              onHub: goToHub,
              onLauncher: goToLauncher,
              onPlay: goToGame,
              onSettings: goToSettings,
              orientationLabel,
              sessionLabel,
              titleFontSize
            })}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

function renderElement({
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
}: {
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
}) {
  switch (element.presetId) {
    case "hero-split":
      return (
        <HeroSplitPreset
          backendLabel={backendLabel}
          catalogCount={catalogCount}
          coreCapabilityCount={coreCapabilityCount}
          currentProductTitle={currentProductTitle}
          element={element}
          hapticsLabel={hapticsLabel}
          inputLabel={inputLabel}
          isCompact={isCompact}
          isWide={isWide}
          onGuide={onGuide}
          onHub={onHub}
          onLauncher={onLauncher}
          onPlay={onPlay}
          onSettings={onSettings}
          orientationLabel={orientationLabel}
          sessionLabel={sessionLabel}
          titleFontSize={titleFontSize}
        />
      );
    default:
      return null;
  }
}

function getElementFrameStyle(element: ScreenElementDefinition): ViewStyle {
  switch (element.alignX) {
    case "left":
      return styles.elementAlignLeft;
    case "right":
      return styles.elementAlignRight;
    case "center":
    default:
      return styles.elementAlignCenter;
  }
}

function getCanvasVerticalStyle(alignY: ScreenElementAlignY): ViewStyle {
  switch (alignY) {
    case "center":
      return styles.canvasCenter;
    case "bottom":
      return styles.canvasBottom;
    case "top":
    default:
      return styles.canvasTop;
  }
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    gap: theme.spacing.lg
  },
  canvasBottom: {
    justifyContent: "flex-end"
  },
  canvasCenter: {
    justifyContent: "center"
  },
  canvasTop: {
    justifyContent: "flex-start"
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxxl + 96,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  elementAlignCenter: {
    alignItems: "center"
  },
  elementAlignLeft: {
    alignItems: "flex-start"
  },
  elementAlignRight: {
    alignItems: "flex-end"
  },
  elementFrame: {
    width: "100%"
  }
});
