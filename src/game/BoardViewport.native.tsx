import { Canvas } from "@react-three/fiber/native";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import type { BoardMatchSnapshot } from "./board/types";
import { useBoardSpinController } from "./board-spin";
import { BoardSceneContent } from "./BoardSceneContent";

export function BoardViewport({
  focusedSpaceIndex,
  snapshot
}: {
  focusedSpaceIndex?: number | null;
  snapshot: BoardMatchSnapshot;
}) {
  const { isDragging, onLayout, panHandlers, spinState } = useBoardSpinController();

  return (
    <View
      collapsable={false}
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;
        onLayout(width, height);
      }}
      style={styles.root}
      {...panHandlers}
    >
      <Canvas
        camera={{ fov: 40, position: [8.5, -10, 7.2] }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1);
          camera.lookAt(0, 0, 0.4);
        }}
      >
        <BoardSceneContent focusedSpaceIndex={focusedSpaceIndex} snapshot={snapshot} spinState={spinState} />
      </Canvas>
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
    flex: 1
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
