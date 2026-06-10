import { motion } from "framer-motion";
import { Box, Film, Sparkles, type LucideIcon } from "lucide-react";
import {
  salaRoomCardPadding,
  salaRoomDesc,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";

type DocenteCatalogMediaCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  badge: string;
  mediaKind?: "video" | "element3d";
  index?: number;
  actionLabel?: string;
  onAction?: () => void;
};

const MEDIA_KIND_META: Record<
  "video" | "element3d",
  { label: string; icon: LucideIcon }
> = {
  video: { label: "Video", icon: Film },
  element3d: { label: "3D", icon: Box },
};

/** Misma estructura visual que tarjetas Live / conciertos (borde ámbar → cyan educativo). */
export default function DocenteCatalogMediaCard({
  title,
  description,
  imageUrl,
  imageAlt,
  badge,
  mediaKind = "video",
  index = 0,
  actionLabel,
  onAction,
}: DocenteCatalogMediaCardProps) {
  const kindMeta = MEDIA_KIND_META[mediaKind];
  const KindIcon = kindMeta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="h-full"
    >
      <article
        className={`group flex h-full w-full flex-col rounded-xl border border-cyan-400/45 bg-card/40 text-left shadow-[0_0_36px_-14px_rgba(34,211,238,0.45)] backdrop-blur-xl transition-all duration-500 hover:border-cyan-300/55 hover:shadow-[0_0_42px_-10px_rgba(34,211,238,0.55)] sm:rounded-2xl ${salaRoomCardPadding}`}
      >
        <div className={`relative overflow-hidden rounded-xl border border-cyan-400/25 ${salaRoomImageWrapMb}`}>
          <img
            src={imageUrl}
            alt={imageAlt}
            className={`${salaRoomImageHeight} w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]`}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
        </div>
        <div
          className={`flex items-center justify-between rounded-lg border border-cyan-200/20 bg-black/50 text-cyan-100 backdrop-blur-md ${salaRoomOverlayBar}`}
        >
          <span className="flex items-center gap-1">
            <KindIcon className={`${salaRoomOverlayIcon} text-cyan-300`} aria-hidden />
            {kindMeta.label}
          </span>
          <span className="flex items-center gap-0.5 text-cyan-200/90">
            <Sparkles className={salaRoomOverlayIcon} aria-hidden />
            {badge}
          </span>
        </div>
        <h3 className={`${salaRoomTitle} mt-3 line-clamp-2 text-cyan-50`}>{title}</h3>
        <p className={`mt-2 flex-1 ${salaRoomDesc}`}>{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-2 text-[10px] font-display font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/20 sm:text-xs"
          >
            {actionLabel}
          </button>
        ) : null}
      </article>
    </motion.div>
  );
}
