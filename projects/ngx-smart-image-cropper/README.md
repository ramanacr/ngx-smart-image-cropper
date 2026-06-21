# ngx-smart-image-cropper

Angular 21 standalone image cropper library.

## Features

- Standalone component API.
- Signal-backed crop state.
- Rectangle and circular crop overlays.
- Aspect ratio lock.
- Zoom, rotate, flip, undo, redo, and keyboard nudge controls.
- Blob, File, and Base64 export helpers.
- Agent-addressable controls and metadata.

## Usage

```ts
import { NgxSmartImageCropper } from 'ngx-smart-image-cropper';
```

```html
<ngx-smart-image-cropper
  [imageFile]="file"
  [aspectRatio]="1"
  (cropped)="onCropped($event)"
/>
```

## Outputs

- `cropped`: emits `{ blob, state }`.
- `imageLoaded`: emits the loaded `HTMLImageElement`.
- `cropChanged`: emits `{ state }`.

## Development

```bash
npm run test:lib
npm run build:lib
```
