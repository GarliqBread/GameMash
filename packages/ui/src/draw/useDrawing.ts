import { type PointerEvent, type RefCallback, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BrushSize,
  type DrawColor,
  type Drawing,
  type DrawTool,
  type Mark,
  normalizePoint,
  type Stroke,
} from "../lib/drawing.js";
import { computeFill } from "../lib/fill.js";
import { colorsOf, paintMarks } from "../lib/paint.js";

type ActiveStroke = {
  pointerId: number;
  stroke: Stroke;
};

const paint = (canvas: HTMLCanvasElement, marks: Mark[], active: Stroke | undefined) => {
  const context = canvas.getContext("2d");
  if (context) paintMarks(context, active ? [...marks, active] : marks, colorsOf(canvas));
};

const pointsFrom = (event: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
  const samples = events.length > 0 ? events : [event.nativeEvent];
  return samples.map((sample) =>
    normalizePoint(
      sample.clientX - rect.left,
      sample.clientY - rect.top,
      sample.pressure || 0.5,
      rect.width,
      rect.height,
    ),
  );
};

export type UseDrawingOptions = {
  initialColor?: DrawColor | undefined;
  initialSize?: BrushSize | undefined;
};

export const useDrawing = ({ initialColor = "black", initialSize = "medium" }: UseDrawingOptions = {}) => {
  const [strokes, setStrokes] = useState<Mark[]>([]);
  const [color, setColorState] = useState<DrawColor>(initialColor);
  const [size, setSize] = useState<BrushSize>(initialSize);
  const [tool, setTool] = useState<DrawTool>("brush");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef<ActiveStroke | undefined>(undefined);
  const frameRef = useRef(0);
  const strokesRef = useRef(strokes);

  const requestPaint = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (canvas) paint(canvas, strokesRef.current, activeRef.current?.stroke);
    });
  }, []);

  useEffect(() => {
    strokesRef.current = strokes;
    requestPaint();
  }, [strokes, requestPaint]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const commitActiveStroke = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = undefined;
    setStrokes((current) => [...current, active.stroke]);
  }, []);

  const attachCanvas: RefCallback<HTMLCanvasElement> = useCallback(
    (canvas) => {
      canvasRef.current = canvas;
      if (!canvas) return;
      const resize = () => {
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(canvas.clientWidth * ratio);
        canvas.height = Math.round(canvas.clientHeight * ratio);
        requestPaint();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(frameRef.current);
        commitActiveStroke();
        canvasRef.current = null;
      };
    },
    [requestPaint, commitActiveStroke],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activeRef.current || !event.isPrimary || event.button > 0) return;
      const [point] = pointsFrom(event, event.currentTarget);
      if (tool === "fill") {
        if (!point) return;
        const fill = computeFill(strokesRef.current, colorsOf(event.currentTarget), [point[0], point[1]], color);
        if (fill) setStrokes((current) => [...current, fill]);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      activeRef.current = {
        pointerId: event.pointerId,
        stroke: {
          color: tool === "eraser" ? "eraser" : color,
          size,
          points: pointsFrom(event, event.currentTarget),
        },
      };
      requestPaint();
    },
    [color, size, tool, requestPaint],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const active = activeRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      activeRef.current = {
        ...active,
        stroke: { ...active.stroke, points: [...active.stroke.points, ...pointsFrom(event, event.currentTarget)] },
      };
      requestPaint();
    },
    [requestPaint],
  );

  const finishStroke = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activeRef.current?.pointerId !== event.pointerId) return;
      commitActiveStroke();
    },
    [commitActiveStroke],
  );

  const setColor = useCallback((next: DrawColor) => {
    setColorState(next);
    setTool((current) => (current === "eraser" ? "brush" : current));
  }, []);

  const undo = useCallback(() => setStrokes((current) => current.slice(0, -1)), []);
  const load = useCallback((next: Drawing) => setStrokes(next.strokes), []);
  const clear = useCallback(() => setStrokes([]), []);

  const toBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve(null);
        canvas.toBlob(resolve, "image/png");
      }),
    [],
  );

  const drawing: Drawing = useMemo(() => ({ strokes }), [strokes]);

  const canvasProps = useMemo(
    () => ({
      ref: attachCanvas,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishStroke,
      onPointerCancel: finishStroke,
      onLostPointerCapture: finishStroke,
    }),
    [attachCanvas, onPointerDown, onPointerMove, finishStroke],
  );

  return {
    drawing,
    isEmpty: strokes.length === 0,
    color,
    setColor,
    size,
    setSize,
    tool,
    setTool,
    undo,
    clear,
    load,
    toBlob,
    canvasProps,
  };
};

export type DrawingController = ReturnType<typeof useDrawing>;
