import { motion } from "framer-motion";

interface YouTubePlayerProps {
  videoId: string;
  title: string;
}

const YouTubePlayer = ({ videoId, title }: YouTubePlayerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
        <div className="aspect-video w-full bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm text-muted-foreground font-medium">
          Transmisión vía YouTube
        </span>
      </div>
    </motion.div>
  );
};

export default YouTubePlayer;
