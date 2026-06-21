import { Component, signal } from '@angular/core';
import { NgxSmartImageCropper, CropChangedEvent, CroppedImageEvent } from 'ngx-smart-image-cropper';

@Component({
  selector: 'app-root',
  imports: [NgxSmartImageCropper],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly imageUrl = signal('');
  readonly aspectRatio = signal(1);
  readonly circularCrop = signal(false);
  readonly zoom = signal(1);
  readonly lastCrop = signal<CropChangedEvent | null>(null);
  readonly exportUrl = signal('');

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

  setAspectRatio(value: string): void {
    const ratio = Number(value);
    if (Number.isFinite(ratio) && ratio > 0) {
      this.aspectRatio.set(ratio);
    }
  }

  setZoom(value: string): void {
    const nextZoom = Number(value);
    if (Number.isFinite(nextZoom)) {
      this.zoom.set(nextZoom);
    }
  }

  handleCropChanged(event: CropChangedEvent): void {
    this.lastCrop.set(event);
  }

  handleCropped(event: CroppedImageEvent): void {
    const previous = this.exportUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }

    this.exportUrl.set(URL.createObjectURL(event.blob));
  }
}
