import { useCallback } from "react";
import { useGLTF } from "@react-three/drei";
import {
  orientAnatomiaHumanaStanding,
  prepareAnatomiaHumanaColiseoMaterials,
  simplifyAnatomiaHumanaMaterialsForMobile,
} from "@/components/immersive/coliseoWallGlbMaterials";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";
import { publicLocalGlbUrl } from "@/lib/publicAssetUrl";
import * as THREE from "three";

const ANATOMIA_HUMANA_URL = publicLocalGlbUrl("assets/models/modello 3d anatomia umana.glb");

useGLTF.preload(ANATOMIA_HUMANA_URL);

type LobbyDecorAnatomiaHumanaWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
  spinSpeed?: number;
  /** Menos coste GPU en móvil (MeshBasic, sin luces extra en la pared). */
  simplifyMaterials?: boolean;
  panelWidth?: number;
  panelHeight?: number;
};

/** Anatomía del cuerpo humano en la pared del lobby (sustituye el iframe de YouTube). */
export default function LobbyDecorAnatomiaHumanaWall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scaleMultiplier = 1.05,
  spinSpeed = 0.22,
  simplifyMaterials = false,
  panelWidth,
  panelHeight,
}: LobbyDecorAnatomiaHumanaWallProps) {
  const prepareModel = useCallback(
    (root: THREE.Object3D) => {
      orientAnatomiaHumanaStanding(root);
      if (simplifyMaterials) {
        simplifyAnatomiaHumanaMaterialsForMobile(root);
      } else {
        prepareAnatomiaHumanaColiseoMaterials(root);
      }
    },
    [simplifyMaterials],
  );

  return (
    <WallSceneGlb
      url={ANATOMIA_HUMANA_URL}
      position={position}
      rotation={rotation}
      scaleMultiplier={scaleMultiplier}
      fitDepth={false}
      spin
      spinSpeed={spinSpeed}
      prepareModel={prepareModel}
      panelWidth={panelWidth}
      panelHeight={panelHeight}
    />
  );
}
