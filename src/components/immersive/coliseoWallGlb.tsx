import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import {
  ANATOMIA_HUMANA_COLISEO_BUILD_OPTIONS,
  EARTH_MOON_LOBBY_COLISEO_BUILD_OPTIONS,
  GEOQUIMICO_COLISEO_BUILD_OPTIONS,
  GEOQUIMICO_COLISEO_SPIN_SPEED,
  isAnatomiaHumanaGlbUrl,
  isEarthMoonLobbyGlbUrl,
  isGeoquimicoGlbUrl,
  orientAnatomiaHumanaStanding,
  prepareAnatomiaHumanaColiseoMaterials,
  prepareEarthMoonLobbyColiseoMaterials,
} from "@/components/immersive/coliseoWallGlbMaterials";
import type { BuildColiseoWallModelOptions } from "@/components/immersive/coliseoWallGlbNormalize";
import {
  COLISEO_CATALOG_GLB_OFFSET,
  buildColiseoWallModel,
} from "@/components/immersive/coliseoWallGlbNormalize";

const COLISEO_WALL_SPIN_SPEED = 0.35;

function getColiseoWallBuildOptions(url: string): BuildColiseoWallModelOptions | undefined {
  if (isEarthMoonLobbyGlbUrl(url)) return EARTH_MOON_LOBBY_COLISEO_BUILD_OPTIONS;
  if (isAnatomiaHumanaGlbUrl(url)) return ANATOMIA_HUMANA_COLISEO_BUILD_OPTIONS;
  if (isGeoquimicoGlbUrl(url)) return GEOQUIMICO_COLISEO_BUILD_OPTIONS;
  return undefined;
}

function getColiseoWallSpinSpeed(url: string): number {
  if (isGeoquimicoGlbUrl(url)) return GEOQUIMICO_COLISEO_SPIN_SPEED;
  return COLISEO_WALL_SPIN_SPEED;
}

class GlbErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[ColiseoWallGlb] No se pudo cargar el modelo GLB:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function ColiseoWallGlbModel({
  url,
  prepareModel,
}: {
  url: string;
  prepareModel?: (root: THREE.Object3D) => void;
}) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    loader.setCrossOrigin("anonymous");
  });

  const prepared = useMemo(() => {
    const earthMoon = isEarthMoonLobbyGlbUrl(url);
    const anatomia = isAnatomiaHumanaGlbUrl(url);
    const baked = buildColiseoWallModel(
      scene,
      (root) => {
        if (anatomia) {
          orientAnatomiaHumanaStanding(root);
          prepareAnatomiaHumanaColiseoMaterials(root);
        }
        if (earthMoon) prepareEarthMoonLobbyColiseoMaterials(root);
        prepareModel?.(root);
      },
      getColiseoWallBuildOptions(url),
    );
    if (!baked) {
      console.warn("[ColiseoWallGlb] Modelo no válido para la pared del Coliseo:", url);
    }
    return baked;
  }, [scene, url, prepareModel]);

  if (!prepared) return null;

  return <primitive object={prepared} raycast={() => null} />;
}

export function ColiseoWallGlb({
  url,
  prepareModel,
  spin = true,
}: {
  url: string;
  prepareModel?: (root: THREE.Object3D) => void;
  spin?: boolean;
}) {
  const spinRef = useRef<THREE.Group>(null);
  const spinSpeed = getColiseoWallSpinSpeed(url);

  useFrame((_, delta) => {
    if (!spin || !spinRef.current) return;
    spinRef.current.rotation.y += delta * spinSpeed;
  });

  return (
    <group ref={spinRef} position={COLISEO_CATALOG_GLB_OFFSET}>
      <GlbErrorBoundary key={url} fallback={null}>
        <Suspense fallback={null}>
          <ColiseoWallGlbModel key={url} url={url} prepareModel={prepareModel} />
        </Suspense>
      </GlbErrorBoundary>
    </group>
  );
}
