import { expect, test } from '@playwright/test';
import path from 'node:path';

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
  await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 60, resizeBox.y + resizeBox.height / 2 + 45);
  await page.mouse.up();

  const resizedBox = await selection.boundingBox();
  expect(resizedBox?.width).toBeGreaterThan(movedBox?.width ?? 0);
});
