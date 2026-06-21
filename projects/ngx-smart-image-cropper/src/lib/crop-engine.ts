export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CropState {
  readonly crop: CropRect;
  readonly imageSize: ImageSize;
  readonly zoom: number;
  readonly rotation: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly history: readonly CropRect[];
  readonly future: readonly CropRect[];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export function centerCrop(imageSize: ImageSize, aspectRatio?: number | null): CropRect {
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : imageSize.width / imageSize.height;
  const imageRatio = imageSize.width / imageSize.height;

  if (imageRatio > ratio) {
    const width = Math.round(imageSize.height * ratio);
    return {
      x: Math.round((imageSize.width - width) / 2),
      y: 0,
      width,
      height: imageSize.height,
    };
  }

  const height = Math.round(imageSize.width / ratio);
  return {
    x: 0,
    y: Math.round((imageSize.height - height) / 2),
    width: imageSize.width,
    height,
  };
}

export function clampCrop(crop: CropRect, imageSize: ImageSize): CropRect {
  const width = Math.min(Math.max(Math.round(crop.width), 1), imageSize.width);
  const height = Math.min(Math.max(Math.round(crop.height), 1), imageSize.height);
  const x = Math.min(Math.max(Math.round(crop.x), 0), imageSize.width - width);
  const y = Math.min(Math.max(Math.round(crop.y), 0), imageSize.height - height);

  return { x, y, width, height };
}

export function createInitialCropState(imageSize: ImageSize, aspectRatio?: number | null): CropState {
  return {
    crop: centerCrop(imageSize, aspectRatio),
    imageSize,
    zoom: MIN_ZOOM,
    rotation: 0,
    flipX: false,
    flipY: false,
    history: [],
    future: [],
  };
}

export function updateCrop(state: CropState, crop: Partial<CropRect>): CropState {
  const nextCrop = clampCrop({ ...state.crop, ...crop }, state.imageSize);
  return {
    ...state,
    crop: nextCrop,
    history: [...state.history, state.crop],
    future: [],
  };
}

export function updateZoom(state: CropState, zoom: number): CropState {
  return {
    ...state,
    zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

export function rotateClockwise(state: CropState): CropState {
  return {
    ...state,
    rotation: (state.rotation + 90) % 360,
  };
}

export function flipHorizontal(state: CropState): CropState {
  return {
    ...state,
    flipX: !state.flipX,
  };
}

export function flipVertical(state: CropState): CropState {
  return {
    ...state,
    flipY: !state.flipY,
  };
}

export function undoCrop(state: CropState): CropState {
  const previous = state.history.at(-1);
  if (!previous) {
    return state;
  }

  return {
    ...state,
    crop: previous,
    history: state.history.slice(0, -1),
    future: [state.crop, ...state.future],
  };
}

export function redoCrop(state: CropState): CropState {
  const next = state.future[0];
  if (!next) {
    return state;
  }

  return {
    ...state,
    crop: next,
    history: [...state.history, state.crop],
    future: state.future.slice(1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
