import { Injectable } from '@angular/core';

import { CropState } from './crop-engine';

export type CropExportMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

@Injectable({ providedIn: 'root' })
export class ExportService {
  async exportBlob(
    source: HTMLCanvasElement,
    state: CropState,
    mimeType: CropExportMimeType = 'image/png',
    quality = 0.92,
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = state.crop.width;
    canvas.height = state.crop.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D rendering is not available.');
    }

    context.drawImage(
      source,
      state.crop.x,
      state.crop.y,
      state.crop.width,
      state.crop.height,
      0,
      0,
      state.crop.width,
      state.crop.height,
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Unable to export crop as a Blob.'));
        },
        mimeType,
        quality,
      );
    });
  }

  async exportFile(
    source: HTMLCanvasElement,
    state: CropState,
    fileName = 'cropped-image.png',
    mimeType: CropExportMimeType = 'image/png',
  ): Promise<File> {
    const blob = await this.exportBlob(source, state, mimeType);
    return new File([blob], fileName, { type: mimeType });
  }

  async exportBase64(
    source: HTMLCanvasElement,
    state: CropState,
    mimeType: CropExportMimeType = 'image/png',
  ): Promise<string> {
    const blob = await this.exportBlob(source, state, mimeType);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result)));
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsDataURL(blob);
    });
  }
}
