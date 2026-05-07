// Shared positioning helpers for content-overlay operations (watermark, page
// numbers, etc.). The named anchors compute a top-left origin offset using a
// 0.5-inch margin; callers pass page and content dimensions and get back PDF
// points in the bottom-left coordinate system pdf-lib expects.

import type { Position } from "../operations/addWatermark.js";

export const MARGIN = 36; // 0.5 inch in PDF points

export function resolvePosition(
  position: Position,
  pageWidth: number,
  pageHeight: number,
  contentWidth: number,
  contentHeight: number,
): { x: number; y: number } {
  if (typeof position !== "string") return position;

  const left = MARGIN;
  const right = pageWidth - MARGIN - contentWidth;
  const middleX = (pageWidth - contentWidth) / 2;
  const top = pageHeight - MARGIN - contentHeight;
  const middleY = (pageHeight - contentHeight) / 2;
  const bottom = MARGIN;

  switch (position) {
    case "top-left":
      return { x: left, y: top };
    case "top-center":
      return { x: middleX, y: top };
    case "top-right":
      return { x: right, y: top };
    case "middle-left":
      return { x: left, y: middleY };
    case "center":
      return { x: middleX, y: middleY };
    case "middle-right":
      return { x: right, y: middleY };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-center":
      return { x: middleX, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}
