import * as THREE from "three";

export const COLISEO_WALL_FRAME_WIDTH = 5.1;
export const COLISEO_WALL_FRAME_HEIGHT = 3.15;
export const COLISEO_WALL_SCALE_MULTIPLIER = 1.12;

/** Desplazamiento hacia el centro de la sala (pared rotada π en Y); no aplica al corazón ni a la Tierra. */
export const COLISEO_CATALOG_GLB_OFFSET: [number, number, number] = [1.15, 0, 0];

/** Un poco más grande que el marco base del catálogo (corazón usa su propia ruta). */
export const COLISEO_CATALOG_SCALE_BOOST = 2.2;

const COLISEO_WALL_TARGET_MAX =
  Math.min(COLISEO_WALL_FRAME_WIDTH, COLISEO_WALL_FRAME_HEIGHT) *
  0.92 *
  COLISEO_WALL_SCALE_MULTIPLIER *
  COLISEO_CATALOG_SCALE_BOOST;

const MIN_SCALE = 0.04;
const MAX_SCALE = 6;

/** Une todas las mallas en un grupo con transformaciones mundiales horneadas (sin escalas anidadas raras). */
export function bakeMeshesToGroup(source: THREE.Object3D): THREE.Group | null {
  source.updateMatrixWorld(true);
  const baked = new THREE.Group();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();

  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.geometry) return;
    const mesh = new THREE.Mesh(node.geometry, node.material);
    mesh.matrix.copy(node.matrixWorld);
    mesh.matrix.decompose(pos, quat, scl);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    mesh.scale.copy(scl);
    mesh.castShadow = node.castShadow;
    mesh.receiveShadow = node.receiveShadow;
    baked.add(mesh);
  });

  return baked.children.length > 0 ? baked : null;
}

export function measureColiseoWallBounds(root: THREE.Object3D): {
  width: number;
  height: number;
  depth: number;
} | null {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  if (box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x + size.y + size.z)) return null;
  const max = Math.max(size.x, size.y, size.z);
  if (max < 1e-6 || max > 1e7) return null;
  return { width: size.x, height: size.y, depth: size.z };
}

export function scaleForColiseoWallFrame(width: number, height: number, depth: number): number {
  const max = Math.max(width, height, depth, 1e-6);
  const raw = COLISEO_WALL_TARGET_MAX / max;
  return THREE.MathUtils.clamp(raw, MIN_SCALE, MAX_SCALE);
}

function centerObjectAtOrigin(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
}

export function orientColiseoWallModel(root: THREE.Object3D): void {
  const bounds = measureColiseoWallBounds(root);
  if (!bounds) return;
  if (bounds.height > bounds.width * 1.25 && bounds.height > bounds.depth * 1.25) {
    root.rotation.x = -Math.PI / 2;
  }
}

export type BuildColiseoWallModelOptions = {
  /** El GLB de Tierra-Luna ya viene orientado; la heurística general lo voltea. */
  skipAutoOrient?: boolean;
  /** Corrección fija tras centrar (p. ej. modelo exportado boca abajo). */
  rotationFix?: [number, number, number];
  /** Multiplicador extra tras el encaje al marco (p. ej. 2 = duplicar tamaño). */
  scaleMultiplier?: number;
};

export function buildColiseoWallModel(
  source: THREE.Object3D,
  prepareModel?: (root: THREE.Object3D) => void,
  options?: BuildColiseoWallModelOptions,
): THREE.Object3D | null {
  const baked = bakeMeshesToGroup(source);
  if (!baked) return null;

  centerObjectAtOrigin(baked);
  if (!options?.skipAutoOrient) {
    orientColiseoWallModel(baked);
  }
  if (options?.rotationFix) {
    baked.rotation.set(...options.rotationFix);
  }
  centerObjectAtOrigin(baked);

  prepareModel?.(baked);

  const bounds = measureColiseoWallBounds(baked);
  if (!bounds) return null;
  const fitScale = scaleForColiseoWallFrame(bounds.width, bounds.height, bounds.depth);
  const extraScale = options?.scaleMultiplier ?? 1;
  baked.scale.multiplyScalar(fitScale * extraScale);
  centerObjectAtOrigin(baked);

  return baked;
}
