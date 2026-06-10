import { Component, Suspense, type ReactNode, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const WALL_PANEL_WIDTH = 8;
const WALL_PANEL_HEIGHT = 4.5;
/** Máxima protrusión hacia la sala (evita modelos alargados que cubren al usuario). */
const WALL_PANEL_DEPTH = 2.8;

function meshBounds(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let hasMesh = false;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const meshBox = new THREE.Box3().setFromObject(node);
    if (!hasMesh) {
      box.copy(meshBox);
      hasMesh = true;
      return;
    }
    box.union(meshBox);
  });
  if (!hasMesh) box.setFromObject(root);
  return box;
}

class GlbErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[WallSceneGlb] No se pudo cargar el modelo GLB:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function WallSceneGlbModel({
  url,
  width,
  height,
  fitDepth,
  prepareModel,
}: {
  url: string;
  width: number;
  height: number;
  fitDepth: boolean;
  prepareModel?: (root: THREE.Object3D) => void;
}) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = meshBounds(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const fitX = (width * 0.92) / Math.max(size.x, 1e-6);
    const fitY = (height * 0.92) / Math.max(size.y, 1e-6);
    const depthLimit = fitDepth ? width * 0.92 : WALL_PANEL_DEPTH * 0.92;
    const fitZ = depthLimit / Math.max(size.z, 1e-6);
    const fitScale = Math.min(fitX, fitY, fitZ);
    root.scale.setScalar(fitScale);
    prepareModel?.(root);
    return root;
  }, [scene, url, width, height, fitDepth, prepareModel]);

  return <primitive object={model} raycast={() => null} />;
}

export function WallSceneGlb({
  url,
  position,
  rotation,
  scaleMultiplier = 1,
  fitDepth = true,
  spin = true,
  spinSpeed = 0.35,
  prepareModel,
  panelWidth = WALL_PANEL_WIDTH,
  panelHeight = WALL_PANEL_HEIGHT,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scaleMultiplier?: number;
  /** true = escala original (corazón); false = solo ancho/alto de pared (modelos alargados). */
  fitDepth?: boolean;
  /** Rotación lenta en Y (corazón). Desactivar para objetos fijos como faroles. */
  spin?: boolean;
  /** Velocidad de giro en rad/s (Tierra del lobby ≈ 0.08). */
  spinSpeed?: number;
  prepareModel?: (root: THREE.Object3D) => void;
  /** Marco del slot en la pared (por defecto panel grande). */
  panelWidth?: number;
  panelHeight?: number;
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spin || !spinRef.current) return;
    spinRef.current.rotation.y += delta * spinSpeed;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={spinRef} scale={scaleMultiplier}>
        <GlbErrorBoundary key={url} fallback={null}>
          <Suspense fallback={null}>
            <WallSceneGlbModel
              key={url}
              url={url}
              width={panelWidth}
              height={panelHeight}
              fitDepth={fitDepth}
              prepareModel={prepareModel}
            />
          </Suspense>
        </GlbErrorBoundary>
      </group>
    </group>
  );
}
