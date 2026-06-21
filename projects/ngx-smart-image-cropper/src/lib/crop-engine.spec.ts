import {
  centerCrop,
  clampCrop,
  createInitialCropState,
  flipHorizontal,
  flipVertical,
  rotateClockwise,
  updateCrop,
  updateZoom,
} from './crop-engine';

describe('crop engine', () => {
  it('creates a centered crop locked to the requested aspect ratio', () => {
    const crop = centerCrop({ width: 800, height: 600 }, 1);

    expect(crop).toEqual({ x: 100, y: 0, width: 600, height: 600 });
  });

  it('clamps crop bounds inside the source image', () => {
    const crop = clampCrop(
      { x: -20, y: 550, width: 900, height: 200 },
      { width: 800, height: 600 },
    );

    expect(crop).toEqual({ x: 0, y: 400, width: 800, height: 200 });
  });

  it('updates crop state and records undo history', () => {
    const initial = createInitialCropState({ width: 800, height: 600 }, 1);
    const updated = updateCrop(initial, { x: 50, y: 80 });

    expect(updated.crop).toEqual({ x: 50, y: 0, width: 600, height: 600 });
    expect(updated.history).toEqual([initial.crop]);
  });

  it('clamps zoom to a practical range', () => {
    const state = createInitialCropState({ width: 800, height: 600 }, 1);

    expect(updateZoom(state, 0.1).zoom).toBe(1);
    expect(updateZoom(state, 8).zoom).toBe(5);
  });

  it('rotates in 90 degree increments and wraps at 360 degrees', () => {
    const state = createInitialCropState({ width: 800, height: 600 }, 1);

    const rotated = rotateClockwise(rotateClockwise(rotateClockwise(rotateClockwise(state))));

    expect(rotated.rotation).toBe(0);
  });

  it('toggles horizontal and vertical flips independently', () => {
    const state = createInitialCropState({ width: 800, height: 600 }, 1);

    expect(flipHorizontal(state).flipX).toBe(true);
    expect(flipVertical(state).flipY).toBe(true);
  });
});
