import { Canvas } from "@react-three/fiber/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View
} from "react-native";

import { theme } from "../theme";
import type { BoardMatchSnapshot } from "./board/types";
import type { BoardCameraPresentation } from "./BoardSceneContent";
import { BoardSceneContent } from "./BoardSceneContent";
import { useBoardSpinController } from "./board-spin";

interface BoardViewportProps {
  focusedSpaceIndex?: number | null;
  onPurchaseRevealReady?: (purchaseRevealKey: string) => void;
  pendingPurchaseRevealKey?: string | null;
  snapshot: BoardMatchSnapshot;
}

export function BoardViewport({
  focusedSpaceIndex,
  onPurchaseRevealReady,
  pendingPurchaseRevealKey,
  snapshot
}: BoardViewportProps) {
  const { isDragging, onLayout, panHandlers, spinState } = useBoardSpinController();
  const [cameraPresentation, setCameraPresentation] = useState<BoardCameraPresentation>("board");
  const fadeValue = useRef(new Animated.Value(0)).current;
  const isInteractionBlocked = cameraPresentation !== "board";

  useEffect(() => {
    const targetOpacity =
      cameraPresentation === "cut-in" || cameraPresentation === "cut-out" ? 1 : 0;

    Animated.timing(fadeValue, {
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      toValue: targetOpacity,
      useNativeDriver: true
    }).start();
  }, [cameraPresentation, fadeValue]);

  const hintLabel =
    cameraPresentation === "follow"
      ? "Tracking active token..."
      : cameraPresentation === "cut-in" || cameraPresentation === "cut-out"
        ? "Switching camera..."
        : isDragging
          ? "Spinning board..."
          : "Drag to spin the board on Z";

  return (
    <View
      collapsable={false}
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;
        onLayout(width, height);
      }}
      style={styles.root}
      {...(isInteractionBlocked ? {} : panHandlers)}
    >
      <Canvas
        camera={{ fov: 40, position: [8.5, -10, 7.2] }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1);
          camera.lookAt(0, 0, 0.4);
        }}
      >
        <BoardSceneContent
          focusedSpaceIndex={focusedSpaceIndex}
          onCameraPresentationChange={setCameraPresentation}
          onPurchaseRevealReady={onPurchaseRevealReady}
          pendingPurchaseRevealKey={pendingPurchaseRevealKey}
          snapshot={snapshot}
          spinState={spinState}
        />
      </Canvas>
      <Animated.View pointerEvents="none" style={[styles.cameraFade, { opacity: fadeValue }]} />
      <View pointerEvents="none" style={styles.hintCard}>
        <Text style={styles.hintText}>{hintLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  cameraFade: {
    backgroundColor: "#020617",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2
  },
  hintCard: {
    backgroundColor: "rgba(7, 17, 31, 0.78)",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    position: "absolute",
    zIndex: 3
  },
  hintText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  }
});
