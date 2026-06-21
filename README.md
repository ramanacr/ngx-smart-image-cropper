# ngx-smart-image-cropper workspace

Angular 21 workspace for the `ngx-smart-image-cropper` library and demo app.

## Projects

- `projects/ngx-smart-image-cropper`: standalone Angular library.
- `projects/demo`: demo application using the public library API.

## Commands

```bash
npm install
npm run test
npm run build
npm run e2e
```

## Library API

```html
<ngx-smart-image-cropper
  [imageFile]="file"
  [imageUrl]="imageUrl"
  [aspectRatio]="1"
  [circularCrop]="true"
  [zoom]="1"
  (cropped)="onCropped($event)"
  (imageLoaded)="onImageLoaded($event)"
  (cropChanged)="onCropChanged($event)"
/>
```

The component is standalone, signal-backed, keyboard accessible, and exposes agent-friendly
metadata through `data-agent-*` attributes.

## Publishing

```bash
npm run build:lib
cd dist/ngx-smart-image-cropper
npm publish --access public
```
