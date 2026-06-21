import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CropChangedEvent, CroppedImageEvent, NgxSmartImageCropper } from './ngx-smart-image-cropper';

@Component({
  imports: [NgxSmartImageCropper],
  template: `
    <ngx-smart-image-cropper
      [imageUrl]="imageUrl()"
      [aspectRatio]="aspectRatio()"
      [circularCrop]="true"
      [zoom]="zoom()"
      (cropped)="onCropped($event)"
      (imageLoaded)="loaded.set(true)"
      (cropChanged)="onCropChanged($event)"
    />
  `,
})
class HostComponent {
  readonly imageUrl = signal('');
  readonly aspectRatio = signal(1);
  readonly zoom = signal(1.5);
  readonly loaded = signal(false);
  croppedEvent: CroppedImageEvent | null = null;
  cropChangedEvent: CropChangedEvent | null = null;

  onCropped(event: CroppedImageEvent): void {
    this.croppedEvent = event;
  }

  onCropChanged(event: CropChangedEvent): void {
    this.cropChangedEvent = event;
  }
}

describe('NgxSmartImageCropper', () => {
  let fixture: ComponentFixture<HostComponent>;
  const imageDataUrl =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="640" height="480" fill="%23cccccc"/%3E%3C/svg%3E';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders an accessible cropper surface for the documented selector', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('ngx-smart-image-cropper')).not.toBeNull();
    expect(element.querySelector('[data-agent-id="ngx-smart-image-cropper"]')).not.toBeNull();
    expect(element.querySelector('[role="application"]')?.getAttribute('aria-label')).toContain(
      'Image cropper',
    );
  });

  it('updates zoom through toolbar controls and emits crop changes', () => {
    const element = fixture.nativeElement as HTMLElement;
    const zoomIn = element.querySelector<HTMLButtonElement>('[data-agent-action="zoom-in"]');

    zoomIn?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.cropChangedEvent?.state.zoom).toBe(1.75);
  });

  it('applies transform state to the rendered image', () => {
    fixture.componentInstance.imageUrl.set(imageDataUrl);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const image = element.querySelector<HTMLImageElement>('.cropper__image');
    const zoomIn = element.querySelector<HTMLButtonElement>('[data-agent-action="zoom-in"]');
    const rotate = element.querySelector<HTMLButtonElement>('[data-agent-action="rotate"]');
    const flipX = element.querySelector<HTMLButtonElement>('[data-agent-action="flip-x"]');

    zoomIn?.click();
    rotate?.click();
    flipX?.click();
    fixture.detectChanges();

    expect(image?.style.transform).toBe('scale(1.75) rotate(90deg) scaleX(-1) scaleY(1)');
  });

  it('syncs external zoom and aspect ratio inputs into the visual cropper', () => {
    fixture.componentInstance.imageUrl.set(imageDataUrl);
    fixture.componentInstance.zoom.set(2);
    fixture.componentInstance.aspectRatio.set(1.7777777778);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const image = element.querySelector<HTMLImageElement>('.cropper__image');
    const selection = element.querySelector<HTMLElement>('.cropper__selection');

    expect(image?.style.transform).toBe('scale(2) rotate(0deg) scaleX(1) scaleY(1)');
    expect(selection?.style.aspectRatio).toBe('1.77778 / 1');
  });

  it('nudges the crop with keyboard arrows', () => {
    const element = fixture.nativeElement as HTMLElement;
    const cropper = element.querySelector<HTMLElement>('[data-agent-id="ngx-smart-image-cropper"]');

    cropper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.cropChangedEvent?.state.crop.x).toBe(90);
  });

  it('supports visible pan controls with undo and redo', () => {
    const element = fixture.nativeElement as HTMLElement;
    const panRight = element.querySelector<HTMLButtonElement>('[data-agent-action="pan-right"]');
    const undo = element.querySelector<HTMLButtonElement>('[data-agent-action="undo"]');
    const redo = element.querySelector<HTMLButtonElement>('[data-agent-action="redo"]');

    panRight?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cropChangedEvent?.state.crop.x).toBe(90);

    undo?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cropChangedEvent?.state.crop.x).toBe(80);

    redo?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cropChangedEvent?.state.crop.x).toBe(90);
  });
});
