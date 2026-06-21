import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the cropper demo shell with agent metadata', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('ngx-smart-image-cropper');
    expect(compiled.querySelector('[data-page-kind="demo"]')).not.toBeNull();
    expect(compiled.querySelector('ngx-smart-image-cropper')).not.toBeNull();
  });

  it('updates demo controls through form inputs', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const circular = compiled.querySelector<HTMLInputElement>('[data-agent-control="circular-crop"]');
    circular?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.circularCrop()).toBe(true);
  });
});
