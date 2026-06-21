# API Specification

## Component

```html
<ngx-smart-image-cropper
  [imageFile]="file"
  [aspectRatio]="1"
  (cropped)="onCropped($event)">
</ngx-smart-image-cropper>
```

## Inputs
- imageFile
- imageUrl
- aspectRatio
- circularCrop
- zoom

## Outputs
- cropped
- imageLoaded
- cropChanged
