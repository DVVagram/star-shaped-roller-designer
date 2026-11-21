import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildSmoothGeometry } from "@/lib/kit/solid";

export interface PreviewMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

interface MeshPreviewProps {
  mesh: PreviewMesh | null;
  sizeMm: number;
  heightMm: number;
  label: string;
}

/**
 * Renders the exact mesh the volume readout and the STL export use, so the
 * picture, the measurements and the file cannot drift apart.
 */
export default function MeshPreview({ mesh, sizeMm, heightMm, label }: MeshPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.PolarGridHelper | null>(null);
  const resetViewRef = useRef<() => void>(() => {});
  const fitDistanceRef = useRef(120);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      const message = document.createElement("p");
      message.className = "max-w-xs px-6 text-center text-sm text-white/60";
      message.textContent =
        "The 3D preview needs WebGL, which this browser has turned off. The measurements and STL export still work.";
      container.appendChild(message);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    Object.assign(canvas.style, {
      display: "block",
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      touchAction: "none",
    });

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
    camera.position.set(0.9, 0.8, 1.15).normalize().multiplyScalar(160);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.06;
    controls.maxPolarAngle = Math.PI - 0.06;
    controls.zoomSpeed = 0.9;
    controls.rotateSpeed = 0.85;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2430, 1.7));

    const key = new THREE.DirectionalLight(0xfff2e2, 2.6);
    key.position.set(70, 110, 60);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x8fbaff, 1.15);
    rim.position.set(-90, 45, -80);
    scene.add(rim);

    const material = new THREE.MeshStandardMaterial({
      color: 0xe4e1da,
      metalness: 0.55,
      roughness: 0.38,
      flatShading: false,
    });

    const part = new THREE.Mesh(new THREE.BufferGeometry(), material);
    part.rotation.x = -Math.PI / 2;
    meshRef.current = part;
    scene.add(part);

    const grid = new THREE.PolarGridHelper(90, 8, 6, 64, 0x2c3644, 0x1a212b);
    grid.position.y = -8;
    gridRef.current = grid;
    scene.add(grid);

    const resize = () => {
      const clientWidth = Math.min(container.clientWidth, 4096);
      const clientHeight = Math.min(container.clientHeight, 4096);
      if (clientWidth < 2 || clientHeight < 2) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    container.appendChild(renderer.domElement);

    renderer.setAnimationLoop(() => {
      if (!container.isConnected) return;
      controls.update();
      renderer.render(scene, camera);
    });

    const resetView = () => {
      const distance = fitDistanceRef.current;
      const direction = new THREE.Vector3(0.9, 0.8, 1.15).normalize();
      camera.position.copy(direction.multiplyScalar(distance));
      controls.target.set(0, 0, 0);
      camera.near = Math.max(0.1, distance / 100);
      camera.far = distance * 20;
      camera.updateProjectionMatrix();
      controls.update();
    };
    resetViewRef.current = resetView;

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      part.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
      meshRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      gridRef.current = null;
    };
  }, []);

  useEffect(() => {
    const part = meshRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const grid = gridRef.current;
    if (!part || !camera || !controls || !grid || !mesh) return;

    // Normals are smoothed only across gently curved faces, so the part reads as
    // one machined surface instead of a sheet of facets while the flat faces
    // keep their edges.
    const smooth = buildSmoothGeometry(mesh);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(smooth.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(smooth.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(smooth.indices, 1));
    geometry.computeBoundingSphere();

    const previous = part.geometry;
    part.geometry = geometry;
    previous.dispose();

    // Leave margin for the elevated three-quarter view; fitting the bare
    // bounding box clips the near rim of wide, short parts.
    const fitDistance = Math.max(sizeMm * 2.1, heightMm * 3.8, 60);
    fitDistanceRef.current = fitDistance;

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-6) direction.set(0.9, 0.8, 1.15);
    direction.normalize().multiplyScalar(fitDistance);
    camera.position.copy(controls.target).add(direction);
    camera.near = Math.max(0.1, fitDistance / 100);
    camera.far = fitDistance * 20;
    camera.updateProjectionMatrix();

    controls.minDistance = fitDistance * 0.35;
    controls.maxDistance = fitDistance * 3.4;
    controls.update();

    grid.scale.setScalar(Math.max(0.15, (sizeMm * 0.8) / 90));
    grid.position.y = -heightMm / 2 - Math.max(0.6, sizeMm * 0.015);
  }, [mesh, sizeMm, heightMm]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
        role="img"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => resetViewRef.current()}
        className="absolute right-3 top-3 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        Reset view
      </button>
    </>
  );
}
