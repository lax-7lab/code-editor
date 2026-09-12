import * as THREE from "three";

const PARTICLE_COUNT = 1600;

export class Background {
  pointerTarget = new THREE.Vector2(0, 0);
  private particles: THREE.Points;
  private particlePositions: Float32Array;
  private particleSpeeds: Float32Array;
  private material: THREE.PointsMaterial;
  private accent: THREE.Color = new THREE.Color("#58a6ff");
  private glowSprite: THREE.Sprite;
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const geometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleSpeeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 16;
      this.particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      this.particleSpeeds[i] = 0.15 + Math.random() * 0.4;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 0.035,
      color: this.accent,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, this.material);
    this.group.add(this.particles);

    const glowTexture = this.createGlowTexture();
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: this.accent,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowSprite = new THREE.Sprite(spriteMat);
    this.glowSprite.scale.set(8, 8, 1);
    this.glowSprite.position.z = -2;
    this.group.add(this.glowSprite);
  }

  private createGlowTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  setColors(background: THREE.Color, accent: THREE.Color): void {
    this.accent.copy(accent);
    this.material.color.copy(accent);
    const spriteMat = this.glowSprite.material as THREE.SpriteMaterial;
    spriteMat.color.copy(accent);
  }

  update(t: number, reducedMotion: boolean): void {
    const positions = this.particlePositions;
    const ease = reducedMotion ? 0.15 : 1;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      positions[ix] += Math.sin(t * this.particleSpeeds[i] * 0.8 + i) * 0.0009 * ease;
      positions[ix + 1] +=
        Math.cos(t * this.particleSpeeds[i] * 0.6 + i * 1.3) * 0.001 * ease;

      positions[ix] +=
        (this.pointerTarget.x * 0.6 - positions[ix]) * 0.0008 * ease;
      positions[ix + 1] +=
        (this.pointerTarget.y * 0.4 - positions[ix + 1]) * 0.0008 * ease;
    }

    (this.particles.geometry.getAttribute("position") as THREE.BufferAttribute)
      .needsUpdate = true;

    this.glowSprite.material.opacity =
      0.22 + Math.sin(t * 0.5) * 0.06;
    this.group.rotation.y = Math.sin(t * 0.1) * 0.04;
    this.group.position.x = this.pointerTarget.x * -0.06;
    this.group.position.y = this.pointerTarget.y * -0.06;
  }

  dispose(): void {
    this.particles.geometry.dispose();
    this.material.dispose();
    const spriteMat = this.glowSprite.material as THREE.SpriteMaterial;
    spriteMat.map?.dispose();
    spriteMat.dispose();
  }
}