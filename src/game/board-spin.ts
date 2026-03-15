import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { PanResponder } from "react-native";

export interface BoardSpinState {
  angleRef: MutableRefObject<number>;
  draggingRef: MutableRefObject<boolean>;
  velocityRef: MutableRefObject<number>;
}

interface SpinLayout {
  height: number;
  width: number;
}

function normalizeAngle(angle: number) {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }

  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }

  return angle;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPointerAngle(
  x: number,
  y: number,
  layout: SpinLayout
) {
  const centerX = layout.width / 2;
  const centerY = layout.height / 2;

  return Math.atan2(y - centerY, x - centerX);
}

export function useBoardSpinController() {
  const angleRef = useRef(Math.PI / 4);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);
  const layoutRef = useRef({ height: 1, width: 1 });
  const [isDragging, setIsDragging] = useState(false);

  function beginInteraction(x: number, y: number, layout?: Partial<SpinLayout>) {
    if (layout) {
      layoutRef.current = {
        height: Math.max(layout.height ?? layoutRef.current.height, 1),
        width: Math.max(layout.width ?? layoutRef.current.width, 1)
      };
    }

    draggingRef.current = true;
    velocityRef.current = 0;
    lastAngleRef.current = getPointerAngle(x, y, layoutRef.current);
    lastTimestampRef.current = Date.now();
    setIsDragging(true);
  }

  function moveInteraction(x: number, y: number, layout?: Partial<SpinLayout>) {
    if (!draggingRef.current) {
      return;
    }

    if (layout) {
      layoutRef.current = {
        height: Math.max(layout.height ?? layoutRef.current.height, 1),
        width: Math.max(layout.width ?? layoutRef.current.width, 1)
      };
    }

    const pointerAngle = getPointerAngle(x, y, layoutRef.current);
    const now = Date.now();

    if (lastAngleRef.current === null) {
      lastAngleRef.current = pointerAngle;
      lastTimestampRef.current = now;
      return;
    }

    const deltaAngle = normalizeAngle(pointerAngle - lastAngleRef.current);
    const elapsedSeconds = Math.max((now - lastTimestampRef.current) / 1000, 1 / 120);

    angleRef.current += deltaAngle;
    velocityRef.current = clamp(deltaAngle / elapsedSeconds, -8, 8);
    lastAngleRef.current = pointerAngle;
    lastTimestampRef.current = now;
  }

  function finishDrag() {
    draggingRef.current = false;
    lastAngleRef.current = null;
    lastTimestampRef.current = 0;
    setIsDragging(false);
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          beginInteraction(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY
          );
        },
        onPanResponderMove: (event) => {
          moveInteraction(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY
          );
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
        onShouldBlockNativeResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onStartShouldSetPanResponder: () => true
      }),
    []
  );

  return {
    beginInteraction,
    endInteraction: finishDrag,
    isDragging,
    moveInteraction,
    onLayout: (width: number, height: number) => {
      layoutRef.current = {
        height: Math.max(height, 1),
        width: Math.max(width, 1)
      };
    },
    panHandlers: panResponder.panHandlers,
    spinState: {
      angleRef,
      draggingRef,
      velocityRef
    } satisfies BoardSpinState
  };
}
