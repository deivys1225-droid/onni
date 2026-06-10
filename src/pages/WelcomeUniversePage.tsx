import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headset, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createLocalUser } from "@/lib/localAuth";

const glassPanel =
  "rounded-2xl border border-border/50 bg-card/40 p-8 shadow-[0_0_45px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl";

const WelcomeUniversePage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loginInput = username.trim().toLowerCase();
    if (loginInput === "davis1224" && password === "abcd1234") {
      createLocalUser("davis1224");
      toast.success("Bienvenido administrador (acceso local).");
      navigate("/", { replace: true });
      setLoading(false);
      return;
    }
    toast.error("Credenciales invalidas.");
    setLoading(false);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.2),transparent_40%),radial-gradient(circle_at_80%_90%,hsl(290_80%_60%/0.16),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className={`w-full max-w-md ${glassPanel}`}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.55)]">
              <Headset className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Bienvenida al <span className="text-gradient-neon">Universo</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Acceso local de administrador.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="welcome-username" className="text-foreground">
                Usuario
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="welcome-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="davis1224"
                  required
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-password" className="text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="welcome-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full min-h-12 font-display font-bold uppercase tracking-wide"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default WelcomeUniversePage;
