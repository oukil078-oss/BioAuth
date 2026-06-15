export type OverlayObjectFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayLayoutInput {
  sourceWidth: number;
  sourceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  objectFit: OverlayObjectFit;
  objectPosition: string;
}

interface AxisPosition {
  ratio: number;
  pixelOffset: number;
  isPixel: boolean;
}

function parseAxisPositionToken(token: string, axis: 'x' | 'y'): AxisPosition {
  const value = token.trim().toLowerCase();

  if (value.endsWith('%')) {
    const pct = Number.parseFloat(value);
    if (!Number.isNaN(pct)) return { ratio: pct / 100, pixelOffset: 0, isPixel: false };
  }

  if (value.endsWith('px')) {
    const px = Number.parseFloat(value);
    if (!Number.isNaN(px)) return { ratio: 0, pixelOffset: px, isPixel: true };
  }

  const keywords: Record<string, number> = axis === 'x'
    ? { left: 0, center: 0.5, right: 1 }
    : { top: 0, center: 0.5, bottom: 1 };

  if (value in keywords) {
    return { ratio: keywords[value], pixelOffset: 0, isPixel: false };
  }

  return { ratio: 0.5, pixelOffset: 0, isPixel: false };
}

function parseObjectPosition(position: string): { x: AxisPosition; y: AxisPosition } {
  const tokens = position.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      x: { ratio: 0.5, pixelOffset: 0, isPixel: false },
      y: { ratio: 0.5, pixelOffset: 0, isPixel: false },
    };
  }

  const first = parseAxisPositionToken(tokens[0], 'x');
  const second = parseAxisPositionToken(tokens[1] ?? '50%', 'y');

  return { x: first, y: second };
}

function resolveRenderedRect({
  sourceWidth,
  sourceHeight,
  viewportWidth,
  viewportHeight,
  objectFit,
  objectPosition,
}: OverlayLayoutInput) {
  const safeSourceWidth = Math.max(sourceWidth, 1);
  const safeSourceHeight = Math.max(sourceHeight, 1);
  const safeViewportWidth = Math.max(viewportWidth, 1);
  const safeViewportHeight = Math.max(viewportHeight, 1);

  const scaleX = safeViewportWidth / safeSourceWidth;
  const scaleY = safeViewportHeight / safeSourceHeight;

  let drawScaleX = scaleX;
  let drawScaleY = scaleY;

  if (objectFit === 'contain') {
    const uniform = Math.min(scaleX, scaleY);
    drawScaleX = uniform;
    drawScaleY = uniform;
  } else if (objectFit === 'cover') {
    const uniform = Math.max(scaleX, scaleY);
    drawScaleX = uniform;
    drawScaleY = uniform;
  } else if (objectFit === 'none') {
    drawScaleX = 1;
    drawScaleY = 1;
  } else if (objectFit === 'scale-down') {
    const containScale = Math.min(scaleX, scaleY, 1);
    drawScaleX = containScale;
    drawScaleY = containScale;
  }

  const renderedWidth = safeSourceWidth * drawScaleX;
  const renderedHeight = safeSourceHeight * drawScaleY;

  const freeX = safeViewportWidth - renderedWidth;
  const freeY = safeViewportHeight - renderedHeight;
  const position = parseObjectPosition(objectPosition);

  const offsetX = position.x.isPixel ? position.x.pixelOffset : freeX * position.x.ratio;
  const offsetY = position.y.isPixel ? position.y.pixelOffset : freeY * position.y.ratio;

  return {
    offsetX,
    offsetY,
    drawScaleX,
    drawScaleY,
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
  };
}

export function mapDetectionBoxToOverlay(
  box: FaceBox,
  layoutInput: OverlayLayoutInput,
  mirrorX: boolean
): FaceBox {
  const layout = resolveRenderedRect(layoutInput);

  const width = box.width * layout.drawScaleX;
  const height = box.height * layout.drawScaleY;
  let x = layout.offsetX + box.x * layout.drawScaleX;
  const y = layout.offsetY + box.y * layout.drawScaleY;

  if (mirrorX) {
    x = layout.viewportWidth - (x + width);
  }

  return { x, y, width, height };
}

export function isMirroredOnXAxis(video: HTMLVideoElement): boolean {
  const inlineTransform = video.style.transform || '';
  if (inlineTransform.includes('scaleX(-1)')) return true;

  const computed = window.getComputedStyle(video).transform;
  if (!computed || computed === 'none') return false;
  return computed.startsWith('matrix(-1') || computed.startsWith('matrix3d(-1');
}
