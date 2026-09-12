import * as THREE from "three";
import { Background } from "./Background";
import type { ThemeColors } from "../types";

export class ThreeScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private background: Background;
  private canvas: HTMLCanvasElement;
  private active = true;
  private frameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 6;

    this.background = new Background(this.scene);

    this.bindEvents();
    this.loop();
  }

  private bindEvents(): void {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("mousemove", this.onMouseMove);
  }

  onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  resize(): void {
    this.onResize();
  }

  private onMouseMove = (e: MouseEvent): void => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -((e.clientY / window.innerHeight) * 2 - 1);
    this.background.pointerTarget.set(x, y);
  };

  applyTheme(colors: ThemeColors): void {
    this.background.setColors(
      new THREE.Color(colors.background),
      new THREE.Color(colors.accent)
    );
  }

  private loop = (): void => {
    if (!this.active) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = performance.now() / 1000;
    if (reduceMotion) {
      this.background.update(t, true);
    } else {
      this.background.update(t, false);
    }
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    this.active = false;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.background.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material as THREE.Material;
        mat.dispose();
      }
    });
    this.renderer.dispose();
  }
}