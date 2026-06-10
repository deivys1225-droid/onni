import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Ticket, Shirt, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const cards = [
  {
    icon: Coins,
    title: "ADH Tokens",
    description: "Buy virtual currency for in-event interactions (Merch & Tipping).",
    cta: "Buy Tokens",
    accent: "from-primary/20 to-primary/5 border-primary/30",
    iconColor: "text-primary",
  },
  {
    icon: Ticket,
    title: "Tickets & Passes",
    description: "Get General Access or Platinum Palco (VIP) tickets for the next Live Event.",
    cta: "Get Tickets",
    accent: "from-secondary/20 to-secondary/5 border-secondary/30",
    iconColor: "text-secondary",
  },
  {
    icon: Shirt,
    title: "Virtual Skins",
    description: "Personalize your Real-ID Avatar with event-exclusive apparel & accessories.",
    cta: "Browse Skins",
    accent: "from-accent/20 to-accent/5 border-accent/30",
    iconColor: "text-accent",
  },
  {
    icon: Megaphone,
    title: "Brand Sponsorships (B2B)",
    description: "Advertise on virtual billboards and get exclusive analytics (ADH for Brands).",
    cta: "Partner With Us",
    accent: "from-primary/10 via-secondary/10 to-accent/10 border-primary/20",
    iconColor: "text-primary",
  },
];

const Marketplace = ({ isOpen, onClose }: MarketplaceProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-40 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-50 w-full max-w-5xl mx-4 sm:mx-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                ADH <span className="text-gradient-neon">MarketPlace</span>
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full border border-border hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {cards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className={`rounded-2xl border bg-gradient-to-br ${card.accent} p-6 backdrop-blur-sm flex flex-col gap-4`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-muted/60 ${card.iconColor}`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {card.description}
                  </p>
                  <Button variant="heroOutline" size="sm" className="w-full mt-auto">
                    {card.cta}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Marketplace;
