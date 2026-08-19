import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { Lights } from "../types";

const GEOS: Record<string, () => THREE.BufferGeometry> = {
  crystal: () => new THREE.IcosahedronGeometry(1, 0),
  knot: () => new THREE.TorusKnotGeometry(0.72, 0.24, 96, 14),
  gem: () => new THREE.OctahedronGeometry(1, 0),
  cube: () => new THREE.BoxGeometry(1.3, 1.3, 1.3, 2, 2, 2),
  pyramid: () => new THREE.ConeGeometry(1, 1.5, 4),
  sphere: () => new THREE.SphereGeometry(1, 40, 24),
  torus: () => new THREE.TorusGeometry(0.85, 0.34, 20, 48),
  dodeca: () => new THREE.DodecahedronGeometry(1, 0),
};

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  key: THREE.DirectionalLight;
  rim: THREE.PointLight;
  ambient: THREE.AmbientLight;
  private geoCache = new Map<string, THREE.BufferGeometry>();
  private customs = new Map<string, THREE.Object3D>();
  private stdMesh: THREE.Mesh;
  private current: THREE.Object3D | null = null;
  private lastModel = "";
  size = 640;

  constructor(eco: boolean) {
    this.size = eco ? 420 : 640;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !eco, powerPreference: eco ? "low-power" : "high-performance" });
    this.renderer.setSize(this.size, this.size);
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.camera.position.set(0, 0.4, 4.4);
    this.camera.lookAt(0, 0, 0);
    this.key = new THREE.DirectionalLight(0xffffff, 2.4);
    this.rim = new THREE.PointLight(0x3bd6ae, 30, 30);
    this.rim.position.set(-3, 2, -2.5);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.key, this.rim, this.ambient);
    this.stdMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  }

  private geo(id: string) {
    let g = this.geoCache.get(id);
    if (!g) {
      g = (GEOS[id] ?? GEOS.crystal)();
      this.geoCache.set(id, g);
    }
    return g;
  }

  /** carica un file .glb / .gltf / .obj e lo registra come modello custom */
  async loadCustom(refId: string, url: string, ext: string): Promise<boolean> {
    try {
      let root: THREE.Object3D;
      if (ext === "obj") {
        const loader = new OBJLoader();
        root = await loader.loadAsync(url);
      } else {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        root = gltf.scene;
      }
      // normalizza: centra e scala a ~2.2 unità
      const box = new THREE.Box3().setFromObject(root);
      const sizeV = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(sizeV.x, sizeV.y, sizeV.z) || 1;
      root.position.sub(center);
      root.scale.setScalar(2.2 / maxDim);
      const wrapper = new THREE.Group();
      wrapper.add(root);
      this.customs.set(refId, wrapper);
      return true;
    } catch {
      return false;
    }
  }

  hasCustom(refId: string) {
    return this.customs.has(refId);
  }

  /**
   * Renderizza il modello e restituisce il canvas (sfondo trasparente).
   */
  render(modelId: string, color: string, wireframe: boolean, rx: number, ry: number, rz: number, lights: Lights): HTMLCanvasElement | null {
    const isCustom = modelId.startsWith("custom:");
    if (isCustom && !this.customs.has(modelId)) return null;

    if (modelId !== this.lastModel) {
      if (this.current) this.scene.remove(this.current);
      if (isCustom) {
        this.current = this.customs.get(modelId)!;
      } else {
        this.stdMesh.geometry = this.geo(modelId);
        const mat = this.stdMesh.material as THREE.MeshStandardMaterial;
        mat.color.set(color);
        mat.metalness = 0.35;
        mat.roughness = 0.3;
        mat.flatShading = modelId === "crystal" || modelId === "gem" || modelId === "pyramid" || modelId === "dodeca";
        mat.wireframe = wireframe;
        mat.needsUpdate = true;
        this.current = this.stdMesh;
      }
      this.scene.add(this.current);
      this.lastModel = modelId;
    } else if (!isCustom) {
      const mat = this.stdMesh.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.wireframe = wireframe;
    }

    if (isCustom && wireframe) {
      this.current!.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => { (mm as THREE.MeshStandardMaterial).wireframe = wireframe; });
        }
      });
    }

    this.current!.rotation.set(rx, ry, rz);

    this.ambient.intensity = lights.ambient;
    this.key.intensity = lights.keyIntensity;
    this.key.color.set(lights.keyColor);
    const a = (lights.keyAngle * Math.PI) / 180;
    const e = (lights.keyElev * Math.PI) / 180;
    this.key.position.set(Math.sin(a) * Math.cos(e) * 5, Math.sin(e) * 5, Math.cos(a) * Math.cos(e) * 5);
    this.rim.intensity = lights.rimIntensity * 14;
    this.rim.color.set(lights.rimColor);

    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }

  dispose() {
    this.renderer.dispose();
  }
}

let instance: SceneManager | null = null;

export const getSceneManager = (eco: boolean): SceneManager => {
  if (!instance) instance = new SceneManager(eco);
  return instance;
};
