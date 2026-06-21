# ngx-smart-image-cropper

`@ramanacr/ngx-smart-image-cropper` is an Angular 21 standalone image cropper with signal-backed state,
mouse and touch interactions, keyboard nudging, undo/redo history, and canvas-based export.

This repository contains both:

- the publishable library in `projects/ngx-smart-image-cropper`
- the demo app in `projects/demo`

## What it supports

- standalone Angular component API
- Angular signals for crop state updates
- image input from either a `File` or a URL
- rectangle or circle crop overlays
- optional fixed aspect ratio
- draw, move, and resize crop selection
- zoom, rotate, horizontal flip, and vertical flip
- keyboard crop nudging with arrow keys
- undo and redo of crop rectangle changes
- Blob, File, and Base64 export helpers
- stable `data-agent-*` attributes for automation and E2E tests

## Repository layout

```text
projects/
  ngx-smart-image-cropper/   Publishable Angular library
  demo/                      Demo application
e2e/                         Playwright end-to-end tests
```

## Requirements

- Node.js 20 or newer is recommended for Angular 21 tooling
- npm 11 is used in this workspace
- Angular 21 consumer application

## Install and run this repository

Clone the repo and install dependencies:

```bash
npm install
```

Start the demo app locally:

```bash
npm start
```

The Angular dev server runs the `demo` project.

## Build commands

Build both the library and the demo:

```bash
npm run build
```

Build only the library:

```bash
npm run build:lib
```

Build only the demo:

```bash
npm run build:demo
```

## Test commands

Run all unit tests:

```bash
npm run test
```

Run only library tests:

```bash
npm run test:lib
```

Run only demo tests:

```bash
npm run test:demo
```

Run end-to-end tests:

```bash
npm run e2e
```

If Playwright browser binaries are not installed yet, install Chromium first:

```bash
npx playwright install chromium
```

## Install the library in another Angular application

After publishing to npm, install it in a consumer app with:

```bash
npm install @ramanacr/ngx-smart-image-cropper
```

The package exposes standalone Angular APIs, so you can import the component directly into a
standalone component.

## Quick start in a consumer app

### 1. Import the standalone component

```ts
import { Component, signal } from '@angular/core';
import {
  CropChangedEvent,
  CroppedImageEvent,
  NgxSmartImageCropper,
} from '@ramanacr/ngx-smart-image-cropper';

@Component({
  selector: 'app-cropper-page',
  standalone: true,
  imports: [NgxSmartImageCropper],
  templateUrl: './cropper-page.html',
})
export class CropperPageComponent {
  readonly imageUrl = signal<string | null>(null);
  readonly aspectRatio = signal(1);
  readonly circularCrop = signal(false);
  readonly zoom = signal(1);
  readonly maxExportSize = signal<number | null>(512);
  readonly lastCrop = signal<CropChangedEvent | null>(null);
  readonly exportedImageUrl = signal('');

  handleFileSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.item(0);
    if (!file) {
      return;
    }

    this.imageUrl.set(URL.createObjectURL(file));
  }

  handleCropChanged(event: CropChangedEvent): void {
    this.lastCrop.set(event);
  }

  handleCropped(event: CroppedImageEvent): void {
    const previous = this.exportedImageUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }

    this.exportedImageUrl.set(URL.createObjectURL(event.blob));
  }
}
```

### 2. Render the cropper

```html
<input type="file" accept="image/*" (change)="handleFileSelected($event)" />

<ngx-smart-image-cropper
  [imageUrl]="imageUrl()"
  [aspectRatio]="aspectRatio()"
  [circularCrop]="circularCrop()"
  [maxExportSize]="maxExportSize()"
  [zoom]="zoom()"
  (cropChanged)="handleCropChanged($event)"
  (cropped)="handleCropped($event)"
/>

@if (exportedImageUrl()) {
  <img [src]="exportedImageUrl()" alt="Cropped result preview" />
}
```

## Full component API

### Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `imageFile` | `File \| null` | `null` | Source image file. Use this when you want to pass a `File` object directly. |
| `imageUrl` | `string \| null` | `null` | Source image URL or object URL. If both `imageUrl` and `imageFile` are set, `imageUrl` wins. |
| `aspectRatio` | `number \| null` | `null` | Locks the crop box to a ratio such as `1`, `4 / 3`, or `16 / 9`. |
| `circularCrop` | `boolean` | `false` | Renders a circular crop overlay and forces an effective `1:1` crop ratio. |
| `maxExportSize` | `number \| null` | `null` | Scales the exported crop so its longest side does not exceed this value. |
| `zoom` | `number` | `1` | Initial and externally controlled zoom value. Valid range is clamped from `1` to `5`. |

### Outputs

| Output | Type | Description |
| --- | --- | --- |
| `cropped` | `CroppedImageEvent` | Fired after the built-in export button runs. Emits the exported `Blob` and the current crop state. |
| `imageLoaded` | `HTMLImageElement` | Fired after the source image is loaded into the cropper. |
| `cropChanged` | `CropChangedEvent` | Fired whenever crop state changes, including crop rectangle updates, zoom changes, and image initialization. |

### Event shapes

```ts
export interface CroppedImageEvent {
  readonly blob: Blob;
  readonly state: CropState;
}

export interface CropChangedEvent {
  readonly state: CropState;
}
```

### Exported types and services

The public API exports:

- `NgxSmartImageCropper`
- `CroppedImageEvent`
- `CropChangedEvent`
- `CropRect`
- `CropState`
- `ImageSize`
- crop state helpers from `crop-engine`
- `ExportService`

## Crop behavior

When an image loads, the cropper creates an initial centered crop based on:

- the full image dimensions
- the requested `aspectRatio`, if provided
- a forced `1:1` ratio when `circularCrop` is enabled

The crop rectangle is always clamped to image boundaries.

## User interactions

### Mouse and touch

- drag on the stage to draw a new crop
- drag the selection to move it
- drag one of the eight resize handles to resize it

### Keyboard

- focus the cropper
- use arrow keys to move the crop box by `10` pixels
- hold `Shift` and use arrow keys to move it by `25` pixels

### Toolbar actions

The built-in toolbar supports:

- zoom out
- zoom in
- rotate clockwise in 90-degree steps
- flip horizontally
- flip vertically
- pan left, up, down, and right
- undo
- redo
- export

## Export behavior

The built-in `Export` button emits the `cropped` output as a PNG `Blob`.

If `maxExportSize` is:

- `null`, empty, or invalid, export keeps the crop rectangle's original pixel size
- a positive number, the exported image is scaled so its longest side matches that number

## Using `ExportService` directly

If you need programmatic export logic outside the component event flow, inject `ExportService`.

```ts
import { inject } from '@angular/core';
import { ExportService, CropState } from '@ramanacr/ngx-smart-image-cropper';

export class CropExportFacade {
  private readonly exportService = inject(ExportService);

  exportBlob(source: HTMLCanvasElement, state: CropState): Promise<Blob> {
    return this.exportService.exportBlob(source, state, 'image/png', 512);
  }

  exportFile(source: HTMLCanvasElement, state: CropState): Promise<File> {
    return this.exportService.exportFile(source, state, 'avatar.png', 'image/png', 512);
  }

  exportBase64(source: HTMLCanvasElement, state: CropState): Promise<string> {
    return this.exportService.exportBase64(source, state, 'image/webp', 512);
  }
}
```

Available export MIME types:

- `image/png`
- `image/jpeg`
- `image/webp`

## Demo application

The demo app in `projects/demo` shows the intended integration pattern:

- upload an image from a file input
- change aspect ratio between `1:1`, `4:3`, and `16:9`
- toggle circular crop
- control zoom from `1` to `5`
- set a max export size
- inspect the live crop state
- export and download the generated image

## Automation and testing selectors

The component exposes stable attributes for automation:

- `data-agent-id="ngx-smart-image-cropper"`
- `data-agent-id="crop-stage"`
- `data-agent-id="crop-selection"`
- `data-agent-handle="n"`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`
- `data-agent-action="zoom-out"`, `zoom-in`, `rotate`, `flip-x`, `flip-y`, `pan-left`, `pan-up`, `pan-down`, `pan-right`, `undo`, `redo`, `export`

The demo also exposes:

- `data-agent-control="image-file"`
- `data-agent-control="aspect-ratio"`
- `data-agent-control="circular-crop"`
- `data-agent-control="zoom"`
- `data-agent-control="max-export-size"`

## Accessibility notes

- the cropper root uses `role="application"`
- the cropper is keyboard-focusable with `tabindex="0"`
- resize handles have `aria-label` values
- toolbar actions expose explicit `aria-label` values

## Publish to npm

Build the library first:

```bash
npm run build:lib
```

Then publish from the generated package directory:

```bash
cd dist/ngx-smart-image-cropper
npm publish --access public
```

## Development notes

- workspace package manager: `npm`
- Angular CLI workspace file: `angular.json`
- library package metadata: `projects/ngx-smart-image-cropper/package.json`
- root package metadata and scripts: `package.json`

## License

MIT
