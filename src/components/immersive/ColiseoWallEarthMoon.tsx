import LobbyDecorEarthMoon from "@/components/lobby/LobbyDecorEarthMoon";

/** Mismo globo del aula virtual (texturas HD, nubes, halo, Luna) encajado en el marco del Coliseo. */
const COLISEO_EARTH_MOON_SCALE = 4.7;

export function ColiseoWallEarthMoon() {
  return (
    <group scale={COLISEO_EARTH_MOON_SCALE}>
      <LobbyDecorEarthMoon position={[0, 0, 0]} scale={1} />
    </group>
  );
}
