import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import { BoardSceneContent } from "./BoardSceneContent";
import { useBoardSpinController } from "./board-spin";
import type { BoardMatchSnapshot } from "./board/types";

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
  snapshot
}: {
  snapshot: BoardMatchSnapshot;
}) {
  const {
    beginInteraction,
    endInteraction,
    isDragging,
    moveInteraction,
    onLayout,
    spinState
  } = useBoardSpinController();
  const dragSurfaceRef = useRef<HTMLDivElement | null>(null);
  const mouseActiveRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);
  const dragSurfaceStyle: React.CSSProperties = {
    bottom: 0,
    cursor: mouseActiveRef.current ? "grabbing" : "grab",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    touchAction: "none"
  };

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!mouseActiveRef.current) {
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
      if (touchIdRef.current === null) {
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
  }, [endInteraction, moveInteraction]);

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
        <BoardSceneContent snapshot={snapshot} spinState={spinState} />
      </Canvas>
      <div
        onMouseDown={(event) => {
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
      <View pointerEvents="none" style={styles.hintCard}>
        <Text style={styles.hintText}>
          {isDragging ? "Spinning board..." : "Drag to spin the board on Z"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: "relative"
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
    position: "absolute"
  },
  hintText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  }
});
