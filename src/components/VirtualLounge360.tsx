import { Suspense, useMemo } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader } from "three";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";

interface VirtualLounge360Props {
  backgroundImage: string;
  avatarCount?: number;
  layout?: "circle" | "stage";
  className?: string;
}

const PanoramaBackground = ({ url }: { url: string }) => {
  const { scene } = useThree();
  const texture = useLoader(TextureLoader, url);

  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  scene.background = texture;

  return null;
};

const AvatarAudience = ({
  avatarCount,
  layout,
}: {
  avatarCount: number;
  layout: "circle" | "stage";
}) => {
  const avatars = useMemo(() => {
    return Array.from({ length: avatarCount }).map((_, index) => {
      const angle = (index / avatarCount) * Math.PI * 2;
      if (layout === "stage") {
        const row = Math.floor(index / 6);
        const col = index % 6;
        return {
          key: `avatar-${index}`,
          x: (col - 2.5) * 1.25,
          z: 2.4 + row * 1.4,
          y: 0,
        };
      }

      return {
        key: `avatar-${index}`,
        x: Math.cos(angle) * 4.2,
        z: Math.sin(angle) * 4.2,
        y: 0,
      };
    });
  }, [avatarCount, layout]);

  return (
    <group>
      {avatars.map((avatar, index) => (
        <group key={avatar.key} position={[avatar.x, avatar.y, avatar.z]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.24, 0.55, 16]} />
            <meshStandardMaterial color={index % 2 === 0 ? "#7c3aed" : "#06b6d4"} metalness={0.25} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.46, 0]}>
            <sphereGeometry args={[0.2, 18, 18]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.05} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const VirtualLounge360 = ({
  backgroundImage,
  avatarCount = 14,
  layout = "circle",
  className,
}: VirtualLounge360Props) => {
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.6, 0.2], fov: 75 }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        gl={{ antialias: !mobileCoarse, alpha: false }}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <PanoramaBackground url={backgroundImage} />
        </Suspense>
        <ambientLight intensity={0.75} />
        <directionalLight intensity={0.4} position={[2, 4, 2]} />
        <AvatarAudience avatarCount={avatarCount} layout={layout} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minDistance={0.15}
          maxDistance={0.5}
          rotateSpeed={0.45}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={(Math.PI * 2) / 3}
        />
      </Canvas>
    </div>
  );
};

export default VirtualLounge360;
