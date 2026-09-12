import * as THREE from "three";
import { EditorCore } from "../editor/EditorCore";

const MAX_PREVIEW_LINES = 400;

export class Minimap3D {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private linesGroup: THREE.Group;
  private content = "";
  private needsRebuild = false;
  private editorCore: EditorCore;
  private paneId: number;
  private frameId = 0;
  private visible = false;

  constructor(container: HTMLElement, editorCore: EditorCore, paneId: number) {
    this.container = document.createElement("div");
    this.container.className = "minimap3d";
    this.container.style.display = "none";
    container.appendChild(this.container);
    this.editorCore = editorCore;
    this.paneId = paneId;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -1, 1, 1, -1, 0.1, 10
    );
    this.camera.position.z = 1;

    this.linesGroup = new THREE.Group();
    this.scene.add(this.linesGroup);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.style.display = visible ? "block" : "none";
    if (visible) {
      this.rebuild();
      this.resize();
      this.loop();
    }
  }

  setContent(content: string): void {
    if (this.content !== content) {
      this.content = content;
      this.needsRebuild = true;
    }
  }

  private rebuild(): void {
    if (!this.needsRebuild) return;
    this.needsRebuild = false;

    while (this.linesGroup.children.length) {
      const child = this.linesGroup.children.pop() as THREE.Object3D;
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const lines = this.content.split("\n");
    const shown = lines.slice(0, MAX_PREVIEW_LINES);
    if (shown.length === 0) return;

    const cols = Math.max(
      ...shown.map((l) => Math.min(l.length, 120)),
      0
    );
    const cellW = 0.0046;
    const lineH = 0.014;

    for (let li = 0; li < shown.length; li++) {
      const row = shown[li];
      if (row.trim().length === 0) continue;
      const length = Math.min(row.length, 120);
      const geom = new THREE.PlaneGeometry(length * cellW, lineH * 0.62);
      const mat = new THREE.MeshBasicMaterial({
        color: this.accentColor(),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      const y = 0.5 - li * lineH;
      const x = -(cols * cellW) / 2;
      mesh.position.set(x + (length * cellW) / 2, y, 0);
      this.linesGroup.add(mesh);
    }

    this.linesGroup.scale.set(1, 1, 1);
  }

  private accentColor(): number {
    const styles = getComputedStyle(document.documentElement);
    const glow = styles.getPropertyValue("--glow").trim();
    const [r, g, b] = glow.split(",").map((n) => parseInt(n.trim(), 10));
    if (!r || !g || !b) return 0x58a6ff;
    return (r << 16) | (g << 8) | b;
  }

  private resize(): void {
    if (this.visible) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w <= 0 || h <= 0) return;
      this.renderer.setSize(w, h);
      this.camera.left = -1;
      this.camera.right = 1;
      this.camera.top = 1;
      this.camera.bottom = -1;
      this.camera.updateProjectionMatrix();
    }
  }

  private loop = (): void => {
    if (!this.visible) return;
    this.rebuild();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    this.visible = false;
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.container.remove();
  }
}