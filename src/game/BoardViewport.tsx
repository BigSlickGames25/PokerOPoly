import { Platform } from "react-native";

import type { BoardMatchSnapshot } from "./board/types";

export interface BoardViewportProps {
  focusedSpaceIndex?: number | null;
  onPurchaseRevealReady?: (purchaseRevealKey: string) => void;
  pendingPurchaseRevealKey?: string | null;
  snapshot: BoardMatchSnapshot;
}

export function BoardViewport(props: BoardViewportProps) {
  if (Platform.OS === "web") {
    const { BoardViewport: WebBoardViewport } = require("./BoardViewport.web");

    return <WebBoardViewport {...props} />;
  }

  const { BoardViewport: NativeBoardViewport } = require("./BoardViewport.native");

  return <NativeBoardViewport {...props} />;
}
