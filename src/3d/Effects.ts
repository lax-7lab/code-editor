export class Effects {
  private vignette: HTMLDivElement;
  private noise: HTMLDivElement;

  constructor() {
    this.vignette = document.createElement("div");
    this.vignette.className = "fx-vignette";
    document.body.appendChild(this.vignette);

    this.noise = document.createElement("div");
    this.noise.className = "fx-noise";
    document.body.appendChild(this.noise);
  }

  destroy(): void {
    this.vignette.remove();
    this.noise.remove();
  }
}