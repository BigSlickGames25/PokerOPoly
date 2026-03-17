import { Canvas } from "@react-three/fiber";
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

function getLocalPoint(
  surface: HTMLDivElement | null,
  clientX: number,
  clientY: number
) {
  if (!surface) {
    return null;
  }

  const rect = surface.getBoundingClientRect();

  return {
    height: rect.height,
    width: rect.width,
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

export function BoardViewport({
  focusedSpaceIndex,
  onPurchaseRevealReady,
  pendingPurchaseRevealKey,
  snapshot
}: BoardViewportProps) {
  const {
    beginInteraction,
    endInteraction,
    isDragging,
    moveInteraction,
    onLayout,
    spinState
  } = useBoardSpinController();
  const [cameraPresentation, setCameraPresentation] = useState<BoardCameraPresentation>("board");
  const fadeValue = useRef(new Animated.Value(0)).current;
  const dragSurfaceRef = useRef<HTMLDivElement | null>(null);
  const mouseActiveRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);
  const isInteractionBlocked = cameraPresentation !== "board";
  const dragSurfaceStyle: React.CSSProperties = {
    bottom: 0,
    cursor: isInteractionBlocked ? "default" : mouseActiveRef.current ? "grabbing" : "grab",
    left: 0,
    pointerEvents: isInteractionBlocked ? "none" : "auto",
    position: "absolute",
    right: 0,
    top: 0,
    touchAction: "none"
  };

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

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!mouseActiveRef.current || isInteractionBlocked) {
        return;
      }

      const point = getLocalPoint(
        dragSurfaceRef.current,
        event.clientX,
        event.clientY
      );

      if (!point) {
        return;
      }

      event.preventDefault();
      moveInteraction(point.x, point.y, point);
    }

    function handleMouseUp() {
      if (!mouseActiveRef.current) {
        return;
      }

      mouseActiveRef.current = false;
      endInteraction();
    }

    function handleTouchMove(event: TouchEvent) {
      if (touchIdRef.current === null || isInteractionBlocked) {
        return;
      }

      const touch = Array.from(event.touches).find(
        (entry) => entry.identifier === touchIdRef.current
      );

      if (!touch) {
        return;
      }

      const point = getLocalPoint(
        dragSurfaceRef.current,
        touch.clientX,
        touch.clientY
      );

      if (!point) {
        return;
      }

      event.preventDefault();
      moveInteraction(point.x, point.y, point);
    }

    function handleTouchEnd(event: TouchEvent) {
      if (touchIdRef.current === null) {
        return;
      }

      const remainingTouch = Array.from(event.touches).find(
        (entry) => entry.identifier === touchIdRef.current
      );

      if (remainingTouch) {
        return;
      }

      touchIdRef.current = null;
      endInteraction();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [endInteraction, isInteractionBlocked, moveInteraction]);

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
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;
        onLayout(width, height);
      }}
      style={styles.root}
    >
      <Canvas
        camera={{ fov: 40, position: [8.5, -10, 7.2] }}
        dpr={[1, 1.6]}
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
      <div
        onMouseDown={(event) => {
          if (isInteractionBlocked) {
            return;
          }

          const point = getLocalPoint(
            dragSurfaceRef.current,
            event.clientX,
            event.clientY
          );

          if (!point) {
            return;
          }

          event.preventDefault();
          mouseActiveRef.current = true;
          beginInteraction(point.x, point.y, point);
        }}
        onTouchStart={(event) => {
          if (isInteractionBlocked) {
            return;
          }

          const touch = event.touches[0];

          if (!touch) {
            return;
          }

          const point = getLocalPoint(
            dragSurfaceRef.current,
            touch.clientX,
            touch.clientY
          );

          if (!point) {
            return;
          }

          touchIdRef.current = touch.identifier;
          beginInteraction(point.x, point.y, point);
        }}
        ref={dragSurfaceRef}
        style={dragSurfaceStyle}
      />
      <Animated.View pointerEvents="none" style={[styles.cameraFade, { opacity: fadeValue }]} />
      <View pointerEvents="none" style={styles.hintCard}>
        <Text style={styles.hintText}>{hintLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: "relative"
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
