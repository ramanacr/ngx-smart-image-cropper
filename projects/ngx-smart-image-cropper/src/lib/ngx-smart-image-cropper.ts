import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import {
  clampCrop,
  CropRect,
  CropState,
  createInitialCropState,
  flipHorizontal,
  flipVertical,
  redoCrop,
  rotateClockwise,
  undoCrop,
  updateCrop,
  updateZoom,
} from './crop-engine';
import { ExportService } from './export.service';

export interface CroppedImageEvent {
  readonly blob: Blob;
  readonly state: CropState;
}

export interface CropChangedEvent {
  readonly state: CropState;
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

interface PointerInteraction {
  readonly kind: 'draw' | 'move' | 'resize';
  readonly contactId: number;
  readonly start: PointerPoint;
  readonly initialCrop: CropRect;
  readonly handle?: ResizeHandle;
}

@Component({
  selector: 'ngx-smart-image-cropper',
  imports: [],
  template: `
    <section
      class="cropper"
      role="application"
      aria-label="Image cropper"
      tabindex="0"
      data-agent-id="ngx-smart-image-cropper"
      [attr.data-circular-crop]="circularCrop()"
      (keydown)="handleKeydown($event)"
    >
      <div
        class="cropper__stage"
        data-agent-id="crop-stage"
        (pointerdown)="startDraw($event)"
        (pointermove)="continuePointerInteraction($event)"
        (pointerup)="finishPointerInteraction($event)"
        (pointercancel)="finishPointerInteraction($event)"
        (touchstart)="startTouchDraw($event)"
        (touchmove)="continueTouchInteraction($event)"
        (touchend)="finishTouchInteraction($event)"
        (touchcancel)="finishTouchInteraction($event)"
      >
        @if (displayImageUrl(); as source) {
          <img
            class="cropper__image"
            [src]="source"
            [style.transform]="imageTransform()"
            alt=""
            draggable="false"
            (load)="handleImageLoaded($event)"
          />
        } @else {
          <div class="cropper__empty" aria-live="polite">Select an image to start cropping.</div>
        }

        <div
          class="cropper__selection"
          data-agent-id="crop-selection"
          [style.left.%]="selectionLeft()"
          [style.top.%]="selectionTop()"
          [style.width.%]="selectionWidth()"
          [style.height.%]="selectionHeight()"
          [style.aspect-ratio]="selectionAspectRatio()"
          [class.cropper__selection--circle]="circularCrop()"
          (pointerdown)="startMove($event)"
          (touchstart)="startTouchMove($event)"
        >
          @for (handle of resizeHandles; track handle) {
            <button
              type="button"
              class="cropper__handle cropper__handle--{{ handle }}"
              [attr.data-agent-handle]="handle"
              [attr.aria-label]="'Resize crop ' + handle"
              (pointerdown)="startResize($event, handle)"
              (touchstart)="startTouchResize($event, handle)"
            ></button>
          }
        </div>
      </div>

      <div class="cropper__toolbar" aria-label="Crop controls">
        <button type="button" data-agent-action="zoom-out" aria-label="Zoom out" (click)="zoomBy(-0.25)">
          -
        </button>
        <output aria-label="Zoom level">{{ zoomPercent() }}%</output>
        <button type="button" data-agent-action="zoom-in" aria-label="Zoom in" (click)="zoomBy(0.25)">
          +
        </button>
        <button type="button" data-agent-action="rotate" aria-label="Rotate" (click)="rotate()">
          Rotate
        </button>
        <button type="button" data-agent-action="flip-x" aria-label="Flip horizontal" (click)="flipX()">
          Flip X
        </button>
        <button type="button" data-agent-action="flip-y" aria-label="Flip vertical" (click)="flipY()">
          Flip Y
        </button>
        <button type="button" data-agent-action="pan-left" aria-label="Pan left" (click)="nudgeCrop(-10, 0)">
          ←
        </button>
        <button type="button" data-agent-action="pan-up" aria-label="Pan up" (click)="nudgeCrop(0, -10)">
          ↑
        </button>
        <button type="button" data-agent-action="pan-down" aria-label="Pan down" (click)="nudgeCrop(0, 10)">
          ↓
        </button>
        <button type="button" data-agent-action="pan-right" aria-label="Pan right" (click)="nudgeCrop(10, 0)">
          →
        </button>
        <button type="button" data-agent-action="undo" aria-label="Undo" (click)="undo()">Undo</button>
        <button type="button" data-agent-action="redo" aria-label="Redo" (click)="redo()">Redo</button>
        <button type="button" data-agent-action="export" aria-label="Export crop" (click)="exportCrop()">
          Export
        </button>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      --cropper-handle-size: 0.875rem;
      --cropper-handle-offset: -0.5rem;
      color: #17202a;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .cropper {
      display: grid;
      gap: 0.75rem;
      width: 100%;
    }

    .cropper__stage {
      position: relative;
      display: grid;
      min-height: 20rem;
      overflow: hidden;
      place-items: center;
      background: #111827;
      border: 1px solid #d5dbe3;
      border-radius: 0.5rem;
      touch-action: none;
      user-select: none;
    }

    .cropper__image {
      max-width: 100%;
      max-height: 32rem;
      object-fit: contain;
      transform-origin: center;
      transition: transform 120ms ease-out;
    }

    .cropper__empty {
      color: #eef2f7;
      font-size: 0.95rem;
    }

    .cropper__selection {
      position: absolute;
      border: 2px solid #f8fafc;
      box-shadow: 0 0 0 9999px rgb(0 0 0 / 42%);
      cursor: move;
      min-width: 1.25rem;
      min-height: 1.25rem;
      pointer-events: auto;
    }

    .cropper__selection--circle {
      border-radius: 50%;
    }

    .cropper__handle {
      position: absolute;
      width: var(--cropper-handle-size);
      height: var(--cropper-handle-size);
      padding: 0;
      min-height: 0;
      border: 2px solid #111827;
      border-radius: 50%;
      background: #f8fafc;
      box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
    }

    .cropper__handle--n {
      top: var(--cropper-handle-offset);
      left: calc(50% - (var(--cropper-handle-size) / 2));
      cursor: ns-resize;
    }

    .cropper__handle--ne {
      top: var(--cropper-handle-offset);
      right: var(--cropper-handle-offset);
      cursor: nesw-resize;
    }

    .cropper__handle--e {
      top: calc(50% - (var(--cropper-handle-size) / 2));
      right: var(--cropper-handle-offset);
      cursor: ew-resize;
    }

    .cropper__handle--se {
      right: var(--cropper-handle-offset);
      bottom: var(--cropper-handle-offset);
      cursor: nwse-resize;
    }

    .cropper__handle--s {
      bottom: var(--cropper-handle-offset);
      left: calc(50% - (var(--cropper-handle-size) / 2));
      cursor: ns-resize;
    }

    .cropper__handle--sw {
      bottom: var(--cropper-handle-offset);
      left: var(--cropper-handle-offset);
      cursor: nesw-resize;
    }

    .cropper__handle--w {
      top: calc(50% - (var(--cropper-handle-size) / 2));
      left: var(--cropper-handle-offset);
      cursor: ew-resize;
    }

    .cropper__handle--nw {
      top: var(--cropper-handle-offset);
      left: var(--cropper-handle-offset);
      cursor: nwse-resize;
    }

    .cropper__toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    button {
      min-height: 2.25rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #b7c2cf;
      border-radius: 0.375rem;
      background: #ffffff;
      color: #17202a;
      cursor: pointer;
    }

    button:hover {
      background: #eef6ff;
    }

    output {
      min-width: 4rem;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    @media (pointer: coarse) {
      :host {
        --cropper-handle-size: 1.25rem;
        --cropper-handle-offset: -0.625rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxSmartImageCropper {
  readonly imageFile = input<File | null>(null);
  readonly imageUrl = input<string | null>(null);
  readonly aspectRatio = input<number | null>(null);
  readonly circularCrop = input(false);
  readonly maxExportSize = input<number | null>(null);
  readonly zoom = input(1);

  readonly cropped = output<CroppedImageEvent>();
  readonly imageLoaded = output<HTMLImageElement>();
  readonly cropChanged = output<CropChangedEvent>();

  protected readonly resizeHandles: readonly ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

  protected readonly state = signal<CropState>(createInitialCropState({ width: 640, height: 480 }, 1));
  protected readonly zoomPercent = computed(() => Math.round(this.state().zoom * 100));
  protected readonly selectionLeft = computed(() => this.toPercent(this.state().crop.x, this.state().imageSize.width));
  protected readonly selectionTop = computed(() => this.toPercent(this.state().crop.y, this.state().imageSize.height));
  protected readonly selectionWidth = computed(() =>
    this.toPercent(this.state().crop.width, this.state().imageSize.width),
  );
  protected readonly selectionHeight = computed(() =>
    this.toPercent(this.state().crop.height, this.state().imageSize.height),
  );
  protected readonly imageTransform = computed(() => {
    const state = this.state();
    return `scale(${state.zoom}) rotate(${state.rotation}deg) scaleX(${state.flipX ? -1 : 1}) scaleY(${
      state.flipY ? -1 : 1
    })`;
  });
  protected readonly selectionAspectRatio = computed(() => {
    const crop = this.state().crop;
    return `${Number((crop.width / crop.height).toFixed(5))} / 1`;
  });
  protected readonly displayImageUrl = computed(() => {
    const directUrl = this.imageUrl();
    if (directUrl) {
      return directUrl;
    }

    const file = this.imageFile();
    if (!file || typeof URL === 'undefined') {
      return '';
    }

    return URL.createObjectURL(file);
  });

  private loadedImage: HTMLImageElement | null = null;
  private pointerInteraction: PointerInteraction | null = null;

  constructor(private readonly exportService: ExportService) {
    effect(() => {
      const nextZoom = this.zoom();
      untracked(() => {
        this.state.update((state) => updateZoom(state, nextZoom));
        this.emitCropChanged();
      });
    });

    effect(() => {
      const nextAspectRatio = this.aspectRatio();
      untracked(() => {
        this.state.update((state) => ({
          ...createInitialCropState(state.imageSize, nextAspectRatio),
          zoom: state.zoom,
          rotation: state.rotation,
          flipX: state.flipX,
          flipY: state.flipY,
        }));
        this.emitCropChanged();
      });
    });
  }

  protected handleImageLoaded(event: Event): void {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    this.loadedImage = image;
    this.state.set(
      createInitialCropState(
        { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height },
        this.aspectRatio(),
      ),
    );
    this.state.update((state) => updateZoom(state, this.zoom()));
    this.imageLoaded.emit(image);
    this.emitCropChanged();
  }

  protected zoomBy(delta: number): void {
    const current = this.state().zoom === 1 ? this.zoom() : this.state().zoom;
    this.state.update((state) => updateZoom(state, current + delta));
    this.emitCropChanged();
  }

  protected rotate(): void {
    this.state.update(rotateClockwise);
    this.emitCropChanged();
  }

  protected flipX(): void {
    this.state.update(flipHorizontal);
    this.emitCropChanged();
  }

  protected flipY(): void {
    this.state.update(flipVertical);
    this.emitCropChanged();
  }

  protected undo(): void {
    this.state.update(undoCrop);
    this.emitCropChanged();
  }

  protected redo(): void {
    this.state.update(redoCrop);
    this.emitCropChanged();
  }

  protected async exportCrop(): Promise<void> {
    const canvas = this.createSourceCanvas();
    const blob = await this.exportService.exportBlob(canvas, this.state(), 'image/png', this.maxExportSize());
    this.cropped.emit({ blob, state: this.state() });
  }

  protected nudgeCrop(x: number, y: number): void {
    this.state.update((state) => updateCrop(state, { x: state.crop.x + x, y: state.crop.y + y }));
    this.emitCropChanged();
  }

  protected startDraw(event: PointerEvent): void {
    if (!(event.target instanceof HTMLElement) || !event.target.closest('.cropper__stage')) {
      return;
    }

    if (event.target.closest('[data-agent-id="crop-selection"]')) {
      return;
    }

    const point = this.pointerToImagePoint(event);
    if (!point) {
      return;
    }

    this.startPointerInteraction(event, {
      kind: 'draw',
      contactId: event.pointerId,
      start: point,
      initialCrop: this.state().crop,
    });
    this.replaceCrop(this.rectFromPoints(point, point));
  }

  protected startMove(event: PointerEvent): void {
    event.stopPropagation();
    const point = this.pointerToImagePoint(event);
    if (!point) {
      return;
    }

    this.startPointerInteraction(event, {
      kind: 'move',
      contactId: event.pointerId,
      start: point,
      initialCrop: this.state().crop,
    });
  }

  protected startResize(event: PointerEvent, handle: ResizeHandle): void {
    event.stopPropagation();
    const point = this.pointerToImagePoint(event);
    if (!point) {
      return;
    }

    this.startPointerInteraction(event, {
      kind: 'resize',
      contactId: event.pointerId,
      start: point,
      initialCrop: this.state().crop,
      handle,
    });
  }

  protected startTouchDraw(event: TouchEvent): void {
    if (this.supportsPointerEvents()) {
      return;
    }

    if (!(event.target instanceof HTMLElement) || !event.target.closest('.cropper__stage')) {
      return;
    }

    if (event.target.closest('[data-agent-id="crop-selection"]')) {
      return;
    }

    const touch = this.getTrackedTouch(event);
    const point = this.touchToImagePoint(event, touch?.identifier);
    if (!touch || !point) {
      return;
    }

    this.startTouchInteraction(event, {
      kind: 'draw',
      contactId: touch.identifier,
      start: point,
      initialCrop: this.state().crop,
    });
    this.replaceCrop(this.rectFromPoints(point, point));
  }

  protected startTouchMove(event: TouchEvent): void {
    if (this.supportsPointerEvents()) {
      return;
    }

    event.stopPropagation();
    const touch = this.getTrackedTouch(event);
    const point = this.touchToImagePoint(event, touch?.identifier);
    if (!touch || !point) {
      return;
    }

    this.startTouchInteraction(event, {
      kind: 'move',
      contactId: touch.identifier,
      start: point,
      initialCrop: this.state().crop,
    });
  }

  protected startTouchResize(event: TouchEvent, handle: ResizeHandle): void {
    if (this.supportsPointerEvents()) {
      return;
    }

    event.stopPropagation();
    const touch = this.getTrackedTouch(event);
    const point = this.touchToImagePoint(event, touch?.identifier);
    if (!touch || !point) {
      return;
    }

    this.startTouchInteraction(event, {
      kind: 'resize',
      contactId: touch.identifier,
      start: point,
      initialCrop: this.state().crop,
      handle,
    });
  }

  protected continuePointerInteraction(event: PointerEvent): void {
    const interaction = this.pointerInteraction;
    if (!interaction || interaction.contactId !== event.pointerId) {
      return;
    }

    const point = this.pointerToImagePoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();

    if (interaction.kind === 'draw') {
      this.replaceCrop(this.rectFromPoints(interaction.start, point));
      return;
    }

    if (interaction.kind === 'move') {
      this.replaceCrop(this.movedCrop(interaction.initialCrop, interaction.start, point));
      return;
    }

    this.replaceCrop(this.resizedCrop(interaction.initialCrop, interaction.start, point, interaction.handle));
  }

  protected finishPointerInteraction(event: PointerEvent): void {
    if (this.pointerInteraction?.contactId !== event.pointerId) {
      return;
    }

    this.pointerInteraction = null;
    const stage = this.getStageElement(event);
    if (stage?.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  }

  protected continueTouchInteraction(event: TouchEvent): void {
    if (this.supportsPointerEvents()) {
      return;
    }

    const interaction = this.pointerInteraction;
    if (!interaction || !this.getTrackedTouch(event, interaction.contactId)) {
      return;
    }

    const point = this.touchToImagePoint(event, interaction.contactId);
    if (!point) {
      return;
    }

    event.preventDefault();

    if (interaction.kind === 'draw') {
      this.replaceCrop(this.rectFromPoints(interaction.start, point));
      return;
    }

    if (interaction.kind === 'move') {
      this.replaceCrop(this.movedCrop(interaction.initialCrop, interaction.start, point));
      return;
    }

    this.replaceCrop(this.resizedCrop(interaction.initialCrop, interaction.start, point, interaction.handle));
  }

  protected finishTouchInteraction(event: TouchEvent): void {
    if (this.supportsPointerEvents()) {
      return;
    }

    const interaction = this.pointerInteraction;
    if (!interaction || !this.getTrackedTouch(event, interaction.contactId)) {
      return;
    }

    event.preventDefault();
    this.pointerInteraction = null;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 25 : 10;
    const moves: Record<string, readonly [number, number]> = {
      ArrowUp: [0, -step],
      ArrowRight: [step, 0],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
    };
    const move = moves[event.key];
    if (!move) {
      return;
    }

    event.preventDefault();
    this.nudgeCrop(move[0], move[1]);
  }

  private emitCropChanged(): void {
    this.cropChanged.emit({ state: this.state() });
  }

  private startPointerInteraction(event: PointerEvent, interaction: PointerInteraction): void {
    event.preventDefault();
    this.beginInteraction(interaction);

    const stage = this.getStageElement(event);
    stage?.setPointerCapture(event.pointerId);
  }

  private startTouchInteraction(event: TouchEvent, interaction: PointerInteraction): void {
    event.preventDefault();
    this.beginInteraction(interaction);
  }

  private beginInteraction(interaction: PointerInteraction): void {
    this.pointerInteraction = interaction;
    this.state.update((state) => ({
      ...state,
      history: [...state.history, state.crop],
      future: [],
    }));
  }

  private pointerToImagePoint(event: PointerEvent): PointerPoint | null {
    const stage = this.getStageElement(event);
    if (!stage) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    const state = this.state();
    return {
      x: this.clamp(((event.clientX - rect.left) / rect.width) * state.imageSize.width, 0, state.imageSize.width),
      y: this.clamp(((event.clientY - rect.top) / rect.height) * state.imageSize.height, 0, state.imageSize.height),
    };
  }

  private getStageElement(event: PointerEvent): HTMLElement | null {
    return this.getStageElementFromCurrentTarget(event.currentTarget);
  }

  private getTouchStageElement(event: TouchEvent): HTMLElement | null {
    return this.getStageElementFromCurrentTarget(event.currentTarget);
  }

  private getStageElementFromCurrentTarget(current: EventTarget | null): HTMLElement | null {
    if (!(current instanceof HTMLElement)) {
      return null;
    }

    if (current.dataset['agentId'] === 'crop-stage') {
      return current;
    }

    return current.closest<HTMLElement>('[data-agent-id="crop-stage"]');
  }

  private touchToImagePoint(event: TouchEvent, identifier: number | undefined): PointerPoint | null {
    const stage = this.getTouchStageElement(event);
    const touch = this.getTrackedTouch(event, identifier);
    if (!stage || !touch) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    const state = this.state();
    return {
      x: this.clamp(((touch.clientX - rect.left) / rect.width) * state.imageSize.width, 0, state.imageSize.width),
      y: this.clamp(((touch.clientY - rect.top) / rect.height) * state.imageSize.height, 0, state.imageSize.height),
    };
  }

  private getTrackedTouch(event: TouchEvent, identifier?: number): Touch | null {
    const pools = [event.changedTouches, event.touches, event.targetTouches];
    for (const pool of pools) {
      for (let index = 0; index < pool.length; index += 1) {
        const touch = pool.item(index);
        if (!touch) {
          continue;
        }

        if (identifier === undefined || touch.identifier === identifier) {
          return touch;
        }
      }
    }

    return null;
  }

  private supportsPointerEvents(): boolean {
    return typeof PointerEvent !== 'undefined';
  }

  private rectFromPoints(start: PointerPoint, end: PointerPoint): CropRect {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(Math.abs(end.x - start.x), 20);
    const height = Math.max(Math.abs(end.y - start.y), 20);

    return this.withAspectRatio({ x, y, width, height }, start, end);
  }

  private movedCrop(initialCrop: CropRect, start: PointerPoint, end: PointerPoint): CropRect {
    return {
      ...initialCrop,
      x: initialCrop.x + end.x - start.x,
      y: initialCrop.y + end.y - start.y,
    };
  }

  private resizedCrop(
    initialCrop: CropRect,
    start: PointerPoint,
    end: PointerPoint,
    handle: ResizeHandle | undefined,
  ): CropRect {
    const ratio = this.effectiveAspectRatio();
    if (ratio && handle) {
      return this.resizedCropWithAspectRatio(initialCrop, end, handle, ratio);
    }

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    let { x, y, width, height } = initialCrop;

    if (handle?.includes('e')) {
      width += deltaX;
    }
    if (handle?.includes('s')) {
      height += deltaY;
    }
    if (handle?.includes('w')) {
      x += deltaX;
      width -= deltaX;
    }
    if (handle?.includes('n')) {
      y += deltaY;
      height -= deltaY;
    }

    width = Math.max(width, 20);
    height = Math.max(height, 20);

    return this.withAspectRatio({ x, y, width, height }, start, end);
  }

  private resizedCropWithAspectRatio(
    initialCrop: CropRect,
    end: PointerPoint,
    handle: ResizeHandle,
    ratio: number,
  ): CropRect {
    const imageSize = this.state().imageSize;
    const minWidth = 20;
    const minHeight = 20;
    const minRatioWidth = Math.max(minWidth, minHeight * ratio);
    const minRatioHeight = minRatioWidth / ratio;
    const right = initialCrop.x + initialCrop.width;
    const bottom = initialCrop.y + initialCrop.height;
    const centerX = initialCrop.x + initialCrop.width / 2;
    const centerY = initialCrop.y + initialCrop.height / 2;

    let widthFromPointer = initialCrop.width;
    let heightFromPointer = initialCrop.height;
    let maxWidth = imageSize.width;
    let maxHeight = imageSize.height;
    let x = initialCrop.x;
    let y = initialCrop.y;

    if (handle === 'e') {
      widthFromPointer = Math.max(end.x - initialCrop.x, minRatioWidth);
      maxWidth = imageSize.width - initialCrop.x;
      maxHeight = 2 * Math.min(centerY, imageSize.height - centerY);
    } else if (handle === 'w') {
      widthFromPointer = Math.max(right - end.x, minRatioWidth);
      maxWidth = right;
      maxHeight = 2 * Math.min(centerY, imageSize.height - centerY);
    } else if (handle === 's') {
      heightFromPointer = Math.max(end.y - initialCrop.y, minRatioHeight);
      maxWidth = 2 * Math.min(centerX, imageSize.width - centerX);
      maxHeight = imageSize.height - initialCrop.y;
    } else if (handle === 'n') {
      heightFromPointer = Math.max(bottom - end.y, minRatioHeight);
      maxWidth = 2 * Math.min(centerX, imageSize.width - centerX);
      maxHeight = bottom;
    } else if (handle === 'se') {
      widthFromPointer = Math.max(end.x - initialCrop.x, minRatioWidth);
      heightFromPointer = Math.max(end.y - initialCrop.y, minRatioHeight);
      maxWidth = imageSize.width - initialCrop.x;
      maxHeight = imageSize.height - initialCrop.y;
    } else if (handle === 'sw') {
      widthFromPointer = Math.max(right - end.x, minRatioWidth);
      heightFromPointer = Math.max(end.y - initialCrop.y, minRatioHeight);
      maxWidth = right;
      maxHeight = imageSize.height - initialCrop.y;
    } else if (handle === 'ne') {
      widthFromPointer = Math.max(end.x - initialCrop.x, minRatioWidth);
      heightFromPointer = Math.max(bottom - end.y, minRatioHeight);
      maxWidth = imageSize.width - initialCrop.x;
      maxHeight = bottom;
    } else if (handle === 'nw') {
      widthFromPointer = Math.max(right - end.x, minRatioWidth);
      heightFromPointer = Math.max(bottom - end.y, minRatioHeight);
      maxWidth = right;
      maxHeight = bottom;
    }

    let width =
      handle === 'n' || handle === 's'
        ? Math.max(heightFromPointer * ratio, minRatioWidth)
        : Math.max(widthFromPointer, heightFromPointer * ratio, minRatioWidth);

    width = Math.min(width, maxWidth, maxHeight * ratio);
    const height = width / ratio;

    if (handle.includes('w')) {
      x = right - width;
    } else if (handle === 'n' || handle === 's') {
      x = centerX - width / 2;
    }

    if (handle.includes('n')) {
      y = bottom - height;
    } else if (handle === 'e' || handle === 'w') {
      y = centerY - height / 2;
    }

    return { x, y, width, height };
  }

  private withAspectRatio(crop: CropRect, start: PointerPoint, end: PointerPoint): CropRect {
    const ratio = this.effectiveAspectRatio();
    if (!ratio) {
      return crop;
    }

    const width = crop.width;
    const height = Math.max(width / ratio, 20);
    const y = end.y < start.y ? start.y - height : crop.y;
    return { ...crop, width, height, y };
  }

  private replaceCrop(crop: CropRect): void {
    this.state.update((state) => ({
      ...state,
      crop: clampCrop(crop, state.imageSize),
    }));
    this.emitCropChanged();
  }

  private effectiveAspectRatio(): number | null {
    if (this.circularCrop()) {
      return 1;
    }

    const ratio = this.aspectRatio();
    return ratio && ratio > 0 ? ratio : null;
  }

  private toPercent(value: number, total: number): number {
    return Number(((value / total) * 100).toFixed(4));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private createSourceCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.state().imageSize.width;
    canvas.height = this.state().imageSize.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D rendering is not available.');
    }

    if (this.loadedImage) {
      context.drawImage(this.loadedImage, 0, 0, canvas.width, canvas.height);
      return canvas;
    }

    context.fillStyle = '#e5e7eb';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
}
