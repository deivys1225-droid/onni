import { PointerLockControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as THREE from "three";
import ColiseoFloatingWebViewScreen from "@/components/immersive/ColiseoFloatingWebViewScreen";
import ColiseoFloatingPdfScreen from "@/components/immersive/ColiseoFloatingPdfScreen";
import { ColiseoWallEarthMoon } from "@/components/immersive/ColiseoWallEarthMoon";
import { ColiseoWallGlb } from "@/components/immersive/coliseoWallGlb";
import {
  isAnatomiaHumanaGlbUrl,
  isEarthMoonLobbyGlbUrl,
} from "@/components/immersive/coliseoWallGlbMaterials";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import ColiseoPanoramaSwitcher from "@/components/immersive/ColiseoPanoramaSwitcher";
import {
  DEFAULT_COLISEO_PANORAMA_ID,
  getColiseoPanoramaPreset,
  type ColiseoPanoramaId,
} from "@/data/coliseoPanoramas";
import { isColiseoNativeWebViewAvailable } from "@/lib/coliseoNativeWebView";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
  lobbyUsesPointerLockControls,
} from "@/lib/webglRendererPrefs";

const GLB_SLOT_POSITION: [number, number, number] = [10.5, 1.95, -0.42];
const GLB_SLOT_ROTATION: [number, number, number] = [0, Math.PI, 0];
const HEART_DIFFUSE_URL = "/assets/models/corazon-diffuse.png";
const HEART_MODEL_URL = "/assets/models/corazon.glb";
/** Escala del corazón en la pared del Coliseo (base 1.12 × 2). */
const COLISEO_HEART_SCALE_MULTIPLIER = 2.24;

function normalizeGoogleDriveGlbUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.hostname !== "drive.google.com") return raw;
    if (parsed.pathname.startsWith("/uc")) return raw;
    const fromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/i)?.[1] ?? "";
    const fromQuery = parsed.searchParams.get("id") ?? "";
    const fileId = (fromPath || fromQuery).trim();
    if (!fileId) return raw;
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  } catch {
    return raw;
  }
}

function appendGlbCacheBust(url: string, search: string): string {
  try {
    const searchParams = new URLSearchParams(search);
    const classSlug = searchParams.get("class")?.trim() || "coliseo";
    const glbVersion = searchParams.get("glb_v")?.trim() || `${Date.now()}`;
    const resolved = new URL(url, window.location.origin);
    resolved.searchParams.set("_ov_glb", `${classSlug}-${glbVersion}`);
    return resolved.toString();
  } catch {
    const token = `_ov_glb=${encodeURIComponent(Date.now().toString())}`;
    return url.includes("?") ? `${url}&${token}` : `${url}?${token}`;
  }
}

function resolveClassGlbUrl(search: string): string | null {
  const raw = new URLSearchParams(search).get("glb")?.trim() ?? "";
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) return null;
  const normalized = /^https?:\/\//i.test(raw) ? normalizeGoogleDriveGlbUrl(raw) : raw;
  // Para corazón, forzamos el mismo GLB local del lobby para garantizar color/textura idénticos.
  if (isHeartModelUrl(normalized) || isHeartModelUrl(raw)) {
    return appendGlbCacheBust(HEART_MODEL_URL, search);
  }
  if (isEarthColiseoUrl(normalized) || isEarthColiseoUrl(raw)) {
    const asset = raw.startsWith("/") ? raw : normalized;
    return appendGlbCacheBust(asset, search);
  }
  // Algunos hosts (p.ej. Cloudinary) sirven GLB sin terminar en ".glb".
  return appendGlbCacheBust(normalized, search);
}

function isHeartModelUrl(url: string): boolean {
  return /corazon|heart|dbhvfn|19elpBz-mCPcbPMxQq4hQPmmJNc-0JFKo/i.test(url);
}

function isEarthColiseoUrl(url: string): boolean {
  return /earth_day|textures\/earth|tierra-lobby|tierra-coliseo|\/earth\//i.test(url);
}

function useHeartWallMaterials() {
  const diffuseMap = useLoader(THREE.TextureLoader, HEART_DIFFUSE_URL);

  useEffect(() => {
    diffuseMap.colorSpace = THREE.SRGBColorSpace;
    diffuseMap.flipY = false;
  }, [diffuseMap]);

  return useCallback(
    (root: THREE.Object3D) => {
      root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.material = new THREE.MeshStandardMaterial({
          map: diffuseMap,
          roughness: 0.62,
          metalness: 0.06,
        });
      });
    },
    [diffuseMap],
  );
}

function ColiseoSceneContent({
  onScreenPointerDown,
  mixedRealityActive,
  classGlbUrl,
  panoramaUrl,
}: {
  onScreenPointerDown?: () => void;
  mixedRealityActive: boolean;
  classGlbUrl: string | null;
  panoramaUrl: string;
}) {
  const prepareHeartModel = useHeartWallMaterials();
  const lobbyEarthOnWall = Boolean(
    classGlbUrl && (isEarthColiseoUrl(classGlbUrl) || isEarthMoonLobbyGlbUrl(classGlbUrl)),
  );
  const anatomiaOnWall = Boolean(classGlbUrl && isAnatomiaHumanaGlbUrl(classGlbUrl));
  const catalogGlbOnWall = Boolean(
    classGlbUrl &&
      !isHeartModelUrl(classGlbUrl) &&
      !isEarthColiseoUrl(classGlbUrl) &&
      !isEarthMoonLobbyGlbUrl(classGlbUrl),
  );
  const wallModelLights = catalogGlbOnWall || lobbyEarthOnWall;
  const ambientIntensity = lobbyEarthOnWall ? 0.96 : anatomiaOnWall ? 0.78 : 0.68;
  const keyLightIntensity = lobbyEarthOnWall ? 3.65 : anatomiaOnWall ? 2.75 : 2.1;
  const fillLightIntensity = lobbyEarthOnWall ? 1.9 : anatomiaOnWall ? 1.35 : 1;

  return (
    <>
      <Suspense fallback={null}>
        {!mixedRealityActive && (
          <EquirectangularInterior key={panoramaUrl} url={panoramaUrl} />
        )}
      </Suspense>
      <ambientLight intensity={ambientIntensity} />
      <ColiseoFloatingWebViewScreen onScreenPointerDown={onScreenPointerDown} />
      <ColiseoFloatingPdfScreen onScreenPointerDown={onScreenPointerDown} />
      <group position={GLB_SLOT_POSITION} rotation={GLB_SLOT_ROTATION}>
        {import.meta.env.DEV ? (
          <>
            <mesh>
              <planeGeometry args={[5.1, 3.15]} />
              <meshStandardMaterial
                color="#0b1220"
                emissive="#111827"
                emissiveIntensity={0.28}
                transparent
                opacity={0.14}
                roughness={0.92}
                metalness={0.02}
              />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[5.1, 3.15]} />
              <meshBasicMaterial
                color={classGlbUrl ? "#22d3ee" : "#60a5fa"}
                wireframe
                transparent
                opacity={classGlbUrl ? 0.2 : 0.28}
              />
            </mesh>
          </>
        ) : null}
        {wallModelLights ? (
          <>
            <pointLight position={[0, 0.55, 1.35]} intensity={keyLightIntensity} distance={5.5} color="#fffaf5" />
            <pointLight position={[-0.9, 0.1, 0.75]} intensity={fillLightIntensity} distance={4.2} color="#b8e4ff" />
            {anatomiaOnWall ? (
              <pointLight position={[0.35, -0.15, 1.05]} intensity={1.1} distance={4.5} color="#ffe8d6" />
            ) : null}
            {lobbyEarthOnWall ? (
              <pointLight position={[0.2, 0.25, 0.9]} intensity={1.15} distance={5} color="#fff4e6" />
            ) : null}
          </>
        ) : null}
        {classGlbUrl ? (
          isHeartModelUrl(classGlbUrl) ? (
            <WallSceneGlb
              url={classGlbUrl}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scaleMultiplier={COLISEO_HEART_SCALE_MULTIPLIER}
              fitDepth
              prepareModel={prepareHeartModel}
            />
          ) : lobbyEarthOnWall ? (
            <Suspense fallback={null}>
              <ColiseoWallEarthMoon />
            </Suspense>
          ) : (
            <ColiseoWallGlb url={classGlbUrl} />
          )
        ) : null}
      </group>
      <pointLight
        position={[10.1, 2.6, 0.1]}
        intensity={1.85}
        distance={8.8}
        color="#ffffff"
      />
    </>
  );
}

export default function ColiseoImmersiveScene({ mixedRealityActive = false }: { mixedRealityActive?: boolean }) {
  const location = useLocation();
  const useNativeWebView = useMemo(() => isColiseoNativeWebViewAvailable(), []);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [screenInteracting, setScreenInteracting] = useState(false);
  const suppressPointerLockUntilRef = useRef(0);
  const usesPointerLock = useMemo(() => lobbyUsesPointerLockControls(), []);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const classGlbUrl = useMemo(() => resolveClassGlbUrl(location.search), [location.search]);
  const [panoramaId, setPanoramaId] = useState<ColiseoPanoramaId>(DEFAULT_COLISEO_PANORAMA_ID);
  const panoramaUrl = useMemo(() => getColiseoPanoramaPreset(panoramaId).panoramaUrl, [panoramaId]);

  const handleEscape = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  const handleScreenPointerDown = useCallback(() => {
    setScreenInteracting(true);
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  const pointerLockEnabled = usesPointerLock && !useNativeWebView && !screenInteracting;

  useEffect(() => {
    const onWindowPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (document.pointerLockElement) {
        suppressPointerLockUntilRef.current = Date.now() + 900;
        document.exitPointerLock();
        return;
      }
      const clickedInsideInteractiveScreen = Boolean(target?.closest("[data-coliseo-screen='true']"));
      if (clickedInsideInteractiveScreen) {
        setScreenInteracting(true);
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
      setScreenInteracting(false);
    };
    window.addEventListener("pointerdown", onWindowPointerDown, true);
    return () => window.removeEventListener("pointerdown", onWindowPointerDown, true);
  }, []);

  return (
    <div className={`relative h-[100dvh] w-full [&_*]:outline-none ${mixedRealityActive ? "bg-transparent" : "bg-black"}`}>
      <Canvas
        className="relative z-10 touch-none"
        gl={{ antialias: !mobileCoarse, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 78, far: SPHERE_RADIUS * 2 }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <ColiseoSceneContent
            onScreenPointerDown={handleScreenPointerDown}
            mixedRealityActive={mixedRealityActive}
            classGlbUrl={classGlbUrl}
            panoramaUrl={panoramaUrl}
          />
        </Suspense>
        {pointerLockEnabled ? (
          <PointerLockControls
            onLock={() => {
              if (Date.now() < suppressPointerLockUntilRef.current || screenInteracting) {
                document.exitPointerLock();
                setPointerLocked(false);
                return;
              }
              setPointerLocked(true);
            }}
            onUnlock={() => setPointerLocked(false)}
          />
        ) : (
          <ImmersiveOrbitControls enabled={!screenInteracting} />
        )}
      </Canvas>

      {usesPointerLock && !useNativeWebView && pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}

      <div
        className="absolute bottom-12 z-20"
        style={{ right: "max(4.5rem, calc(env(safe-area-inset-right) + 3.5rem))" }}
      >
        <ColiseoPanoramaSwitcher activeId={panoramaId} onSelect={setPanoramaId} />
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-md -translate-x-1/2 px-4 text-center text-[11px] text-slate-400">
        {useNativeWebView
          ? "Arrastra fuera de la pantalla para girar el Coliseo 360°"
          : pointerLockEnabled
            ? "Clic para girar vista 360° · Clic en pantalla = interactuar video"
            : "Arrastra para girar · Clic en pantalla = interactuar video"}
      </p>
    </div>
  );
}
