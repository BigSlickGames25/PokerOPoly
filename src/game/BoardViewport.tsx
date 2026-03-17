import { Platform, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import type { BoardMatchSnapshot } from "./board/types";
import { useBoardSpinController } from "./board-spin";

export function BoardViewport({
  focusedSpaceIndex,
  snapshot
}: {
  focusedSpaceIndex?: number | null;
  snapshot: BoardMatchSnapshot;
}) {
  const {
    beginInteraction,
    endInteraction,
    isDragging,
    moveInteraction,
    onLayout,
    panHandlers,
    spinState
  } = useBoardSpinController();

  if (Platform.OS === "web") {
    const { BoardViewport: WebBoardViewport } = require("./BoardViewport.web");

    return (
      <View
        collapsable={false}
        onLayout={(event) => {
          const { height, width } = event.nativeEvent.layout;
          onLayout(width, height);
        }}
        style={styles.root}
      >
        <WebBoardViewport
          beginInteraction={beginInteraction}
          endInteraction={endInteraction}
          focusedSpaceIndex={focusedSpaceIndex}
          moveInteraction={moveInteraction}
          snapshot={snapshot}
          spinState={spinState}
        />
        <View pointerEvents="none" style={styles.hintCard}>
          <Text style={styles.hintText}>
            {isDragging ? "Spinning board..." : "Drag to spin the board on Z"}
          </Text>
        </View>
      </View>
    );
  }

  const { BoardViewport: NativeBoardViewport } = require("./BoardViewport.native");
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
      <NativeBoardViewport
        focusedSpaceIndex={focusedSpaceIndex}
        snapshot={snapshot}
        spinState={spinState}
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
    overscrollBehavior: "none",
    touchAction: "none"
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
