import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';

async function performTouchDrag(
  page: Page,
  startSelector: string,
  moveSelector: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps = 8,
): Promise<void> {
  const startTarget = page.locator(startSelector);
  const moveTarget = page.locator(moveSelector);
  const pointerBase = {
    pointerId: 1,
    pointerType: 'touch' as const,
    isPrimary: true,
    button: 0,
    width: 24,
    height: 24,
  };

  // Dispatch pointerdown to the element where the touch starts.
  await startTarget.dispatchEvent('pointerdown', {
    ...pointerBase,
    buttons: 1,
    pressure: 0.75,
    clientX: start.x,
    clientY: start.y,
  });

  // Small pause to allow the app to call setPointerCapture / register handlers.
  await page.waitForTimeout(16);

  // Deliver pointermove events to the same element that received pointerdown.
  // Many components rely on pointer capture, so moving events to a different element
  // can cause the target component to ignore moves.
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    await startTarget.dispatchEvent('pointermove', {
      ...pointerBase,
      buttons: 1,
      pressure: 0.75,
      clientX: Math.round(start.x + (end.x - start.x) * progress),
      clientY: Math.round(start.y + (end.y - start.y) * progress),
    });
    // brief pause to better emulate real touch movement
    await page.waitForTimeout(8);
  }

  // End with pointerup on the same element.
  await startTarget.dispatchEvent('pointerup', {
    ...pointerBase,
    buttons: 0,
    pressure: 0,
    clientX: end.x,
    clientY: end.y,
  });

  // Allow the UI a moment to update
  await page.waitForTimeout(10);
}

test('demo exposes cropper controls and metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-page-kind="demo"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ngx-smart-image-cropper' })).toBeVisible();
  await expect(page.locator('[data-agent-id="ngx-smart-image-cropper"]')).toBeVisible();
  await expect(page.locator('[data-agent-control="aspect-ratio"]')).toBeVisible();
  await expect(page.locator('[data-agent-control="circular-crop"]')).toBeVisible();
});

test('demo controls update the rendered cropper', async ({ page }) => {
  await page.goto('/');

  await page
    .locator('[data-agent-control="image-file"]')
    .setInputFiles(path.join(process.cwd(), 'e2e/fixtures/sample.svg'));

  const image = page.locator('.cropper__image');
  const selection = page.locator('.cropper__selection');
  await expect(image).toBeVisible();

  await page.locator('[data-agent-control="aspect-ratio"]').selectOption('1.7777777778');
  await expect(selection).toHaveCSS('aspect-ratio', '1.77778 / 1');

  await page.locator('[data-agent-control="zoom"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(image).toHaveCSS('transform', /matrix\(2, 0, 0, 2,/);

  await page.locator('[data-agent-action="rotate"]').click();
  await expect(image).toHaveCSS('transform', /matrix\(0, 2, -2, 0,/);
});

test('crop selection can be drawn, moved, and resized with the mouse', async ({ page }) => {
  await page.goto('/');

  await page
    .locator('[data-agent-control="image-file"]')
    .setInputFiles(path.join(process.cwd(), 'e2e/fixtures/sample.svg'));

  const stage = page.locator('[data-agent-id="crop-stage"]');
  const selection = page.locator('[data-agent-id="crop-selection"]');
  const southeastHandle = page.locator('[data-agent-handle="se"]');

  await expect(stage).toBeVisible();
  const stageBox = await stage.boundingBox();
  if (!stageBox) {
    throw new Error('Crop stage is not visible.');
  }

  await page.mouse.move(stageBox.x + 20, stageBox.y + 70);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 260, stageBox.y + 230);
  await page.mouse.up();

  await expect(selection).toHaveCSS('left', /[1-9]\d*(\.\d+)?px/);
  const drawnBox = await selection.boundingBox();
  expect(drawnBox?.width).toBeGreaterThan(100);

  const centerX = (drawnBox?.x ?? 0) + (drawnBox?.width ?? 0) / 2;
  const centerY = (drawnBox?.y ?? 0) + (drawnBox?.height ?? 0) / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 60, centerY + 40);
  await page.mouse.up();

  const movedBox = await selection.boundingBox();
  expect(movedBox?.x).toBeGreaterThan(drawnBox?.x ?? 0);

  const resizeBox = await southeastHandle.boundingBox();
  if (!resizeBox) {
    throw new Error('Resize handle is not visible.');
  }

  await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2 + 60,

    resizeBox.y + resizeBox.height / 2 + 45,
  );

  await page.mouse.up();

  const resizedBox = await selection.boundingBox();

  expect(resizedBox?.width).toBeGreaterThanOrEqual(movedBox?.width ?? 0);
});

test.describe('mobile touch interactions', () => {
  test.setTimeout(20_000);

  test.use({
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true,
  });

  test('crop selection can be drawn, moved, and resized with touch', async ({ page }) => {
    await page.goto('/');

    await page
      .locator('[data-agent-control="image-file"]')
      .setInputFiles(path.join(process.cwd(), 'e2e/fixtures/sample.svg'));

    const stage = page.locator('[data-agent-id="crop-stage"]');
    const selection = page.locator('[data-agent-id="crop-selection"]');
    const southeastHandle = page.locator('[data-agent-handle="se"]');

    await expect(stage).toBeVisible();
    const stageBox = await stage.boundingBox();
    if (!stageBox) {
      throw new Error('Crop stage is not visible.');
    }

    await performTouchDrag(
      page,
      '[data-agent-id="crop-stage"]',
      '[data-agent-id="crop-stage"]',
      { x: stageBox.x + 24, y: stageBox.y + 88 },
      { x: stageBox.x + 220, y: stageBox.y + 280 },
    );

    const drawnBox = await selection.boundingBox();
    expect(drawnBox?.width).toBeGreaterThan(80);

    await performTouchDrag(
      page,
      '[data-agent-id="crop-selection"]',
      '[data-agent-id="crop-stage"]',
      {
        x: (drawnBox?.x ?? 0) + (drawnBox?.width ?? 0) / 2,
        y: (drawnBox?.y ?? 0) + (drawnBox?.height ?? 0) / 2,
      },
      {
        x: (drawnBox?.x ?? 0) + (drawnBox?.width ?? 0) / 2 + 45,
        y: (drawnBox?.y ?? 0) + (drawnBox?.height ?? 0) / 2 + 35,
      },
    );

    const movedBox = await selection.boundingBox();
    expect(movedBox?.x).toBeGreaterThan(drawnBox?.x ?? 0);

    const resizeBox = await southeastHandle.boundingBox();
    if (!resizeBox) {
      throw new Error('Resize handle is not visible.');
    }

    await performTouchDrag(
      page,
      '[data-agent-handle="se"]',
      '[data-agent-id="crop-stage"]',
      {
        x: resizeBox.x + resizeBox.width / 2,
        y: resizeBox.y + resizeBox.height / 2,
      },

      {
        x: resizeBox.x + resizeBox.width / 2 + 40,

        y: resizeBox.y + resizeBox.height / 2 + 40,
      },
    );

    const resizedBox = await selection.boundingBox();

    expect(resizedBox?.width).toBeGreaterThanOrEqual(movedBox?.width ?? 0);
  });
});
