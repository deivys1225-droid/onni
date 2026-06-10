import { useEffect } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OPTIMIZED_SPHERE_SEGMENTS } from "@/lib/webglRendererPrefs";

/** Radio interior > distancia maxima de orbita (12) para ver 360° sin salir de la esfera. */
const INTERIOR_RADIUS = 28;

/**
 * Entorno 360° cerrado: textura equirectangular en esfera interior (BackSide).
 * La Luna en el origen queda por delante de la pared lejana al mirar el centro.
 */
export function KidsSpaceEquirectSphere({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  const { scene } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
    scene.background = new THREE.Color("#0c0812");
    return () => {
      scene.background = null;
    };
  }, [scene, texture]);

  return (
    <mesh renderOrder={-2}>
      <sphereGeometry args={[INTERIOR_RADIUS, OPTIMIZED_SPHERE_SEGMENTS, OPTIMIZED_SPHERE_SEGMENTS]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite />
    </mesh>
  );
}
