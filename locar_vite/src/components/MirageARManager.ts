import * as THREE from "three";
import * as LocAR from "locar";
import { queryWithinRadius } from "../services/firestoreGeoQuery";
import type { NearbyMirage } from "../services/firestoreGeoQuery";
import type { User } from "firebase/auth";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";

const QUERY_THROTTLE_MS = 5000;

export class MirageARManager {
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private locar!: LocAR.LocationBased;
  private cam!: LocAR.Webcam;
  private deviceOrientationControls!: LocAR.DeviceOrientationControls;
  // private activeCubes: Map<string, THREE.Mesh> = new Map(); // Track by doc ID
  private activeCubes: Map<string, THREE.Group> = new Map();
  private lastQueryTime = 0;
  private currentUserPos: { lat: number; lng: number } | null = null;
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private clickVector = new THREE.Vector2();
  private onCubeClick?: (cubeData: NearbyMirage, ev:any) => void;
  private user: User | null;
  public ev: any;
  private mirages: Map<string, NearbyMirage>;

  constructor(container: HTMLElement, onCubeClick?: (cubeData: NearbyMirage, ev:any) => void, user: User | null = null) {
    this.container = container;
    this.onCubeClick = onCubeClick;
    this.user = user;
    this.mirages = new Map();
    console.log((this.user?.uid));
    this.initAR();
  }

  private initAR() {

    // Camera (your code)
    this.camera = new THREE.PerspectiveCamera(
      80,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    // Renderer (mount to container instead of body)
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener("touchstart", (event) => {
      this.handleClick(event.touches[0]);
    });


    // Scene & LocAR
    this.scene = new THREE.Scene();
    this.locar = new LocAR.LocationBased(this.scene, this.camera)

    // Webcam (no explicit start; events trigger auto-init)
    this.cam = new LocAR.Webcam({ video: { facingMode: "environment" } });
    this.cam.on("webcamstarted", (ev) => {
      this.scene.background = ev.texture;
    });
    this.cam.on("webcamerror", (error) => {
      console.error("Webcam error:", error);
    });
    // Removed this.cam.start(); - auto-handled by LocAR

    // Resize
    const handleResize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Device Orientation
    this.deviceOrientationControls = new LocAR.DeviceOrientationControls(
      this.camera
    );
    this.deviceOrientationControls.on("deviceorientationgranted", (ev) => {
      ev.target.connect();
    });
    this.deviceOrientationControls.on("deviceorientationerror", (error) => {
      console.error("Orientation error:", error);
    });
    this.deviceOrientationControls.init();

    // GPS Events
    this.locar.on("gpserror", (error) => {
      alert("Turn on location services");
    });
    this.locar.on("gpsupdate", (ev) => {
      console.log(ev);
      this.ev = ev;
      this.handleGpsUpdate(ev);
    });
    this.locar.startGps();

    // Animation Loop
    const animate = () => {
      this.deviceOrientationControls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.renderer.setAnimationLoop(animate);

  }

  private async handleGpsUpdate(ev: any) {
    const now = Date.now();
    if (now - this.lastQueryTime < QUERY_THROTTLE_MS) return;

    this.currentUserPos = {
      lat: ev.position.coords.latitude,
      lng: ev.position.coords.longitude,
    };

    this.clearCubes();

    if (!this.currentUserPos) return;
    console.log(this.user?.uid);
    await queryWithinRadius(this.mirages, {
      center: this.currentUserPos,
      userId: this.user?.uid || "user-is-useless",
      useMockData: false
    });

    const loader = new GLTFLoader();
    // const geom = new THREE.BoxGeometry(3, 3, 3); // you can keep this if other code needs it

    this.mirages.forEach((loc) => {
      loader.load('/models/minecraft_chest.glb', (gltf) => {
        const model = gltf.scene.clone();   // clone so each loc gets its own instance
        model.userData = loc;               // keep your metadata

        model.scale.set(1, 1, 1);           // optional
        model.rotation.set(0, 0, 0);        // optional

        this.locar.add(model, loc.lng, loc.lat);
        this.activeCubes.set(loc.id, model);
      });
    });

    this.lastQueryTime = Date.now();
  }

  private handleClick(event: MouseEvent | Touch) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.clickVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.clickVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.clickVector, this.camera);

    const meshes = Array.from(this.activeCubes.values());
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;

      const clicked = [...this.activeCubes.entries()].find(([_, group]) => {
        let found = false;
        group.traverse((child) => {
          if (child === mesh) found = true;
        });
        return found;
      });
      if (clicked) {
        const [id] = clicked;
        this.onCubeClicked(id, mesh);
      }
    }
  }

  private onCubeClicked(id: string, mesh: THREE.Mesh) {
    console.log("Cube clicked:", id);
    const cubeData = mesh.userData as NearbyMirage;
    // console.log(JSON.stringify(cubeData));
    this.onCubeClick?.(cubeData, this.ev);
  }

  private clearCubes() {
    this.activeCubes.forEach((group) => {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.activeCubes.clear();
  }

  destroy() {
    this.clearCubes();
    this.locar.stopGps?.();
    this.deviceOrientationControls.disconnect?.();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  getRenderer() {
    return this.renderer;
  }
}
