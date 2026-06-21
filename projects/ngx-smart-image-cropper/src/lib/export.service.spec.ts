import { TestBed } from '@angular/core/testing';

import { ExportService } from './export.service';
import { CropState } from './crop-engine';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportService);
  });

  it('exports a canvas crop as a blob', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      callback: BlobCallback,
      type?: string,
    ): void {
      callback(new Blob(['crop'], { type }));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;

    const state: CropState = {
      crop: { x: 0, y: 0, width: 10, height: 10 },
      imageSize: { width: 20, height: 20 },
      zoom: 1,
      rotation: 0,
      flipX: false,
      flipY: false,
      history: [],
      future: [],
    };

    const blob = await service.exportBlob(canvas, state, 'image/png');

    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    expect(drawImage).toHaveBeenCalledWith(canvas, 0, 0, 10, 10, 0, 0, 10, 10);
  });
});
