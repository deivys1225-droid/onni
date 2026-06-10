import { BRAND_IMAGE_ALT } from "@/lib/seoBrand";

/** Icono VR original (favicon sin fondo negro). */
const BRAND_ICON_SRC = "/imagenes/favicon-transparent.png";
/** Proporción del favicon original (más ancho que alto). */
const BRAND_ICON_ASPECT = 1201 / 892;

type OnniVersoLogoProps = {
  className?: string;
  /** Altura del icono (px aprox.) */
  iconSize?: number;
};

const OnniVersoLogo = ({ className = "", iconSize = 28 }: OnniVersoLogoProps) => {
  const iconHeight = iconSize;
  const iconWidth = Math.round(iconSize * BRAND_ICON_ASPECT);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 sm:gap-2 ${className}`} role="img" aria-label={BRAND_IMAGE_ALT}>
      <img
        src={BRAND_ICON_SRC}
        alt=""
        aria-hidden
        width={iconWidth}
        height={iconHeight}
        className="shrink-0 object-contain"
        style={{ width: iconWidth, height: iconHeight }}
        decoding="async"
      />
      <span
        aria-hidden
        className="whitespace-nowrap font-headline text-base font-semibold tracking-[0.12em] text-foreground sm:text-lg sm:tracking-[0.14em] md:text-xl md:tracking-[0.16em]"
      >
        Onni<span className="font-bold tracking-[0.22em] text-primary">Vers</span>
      </span>
    </span>
  );
};

export default OnniVersoLogo;
