import { Button } from "@/components/ui/button";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LOCKED_NAVBAR_HEIGHT_CLASS } from "@/config/lockedHomeLayout";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/entrar");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full max-w-[100dvw] overflow-x-clip glass">
      <div
        className={`relative mx-auto flex ${LOCKED_NAVBAR_HEIGHT_CLASS} w-full max-w-full items-center justify-between gap-2 px-3 sm:px-6`}
      >
        <Link
          to="/"
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Onni — Inicio"
        >
          <OnniVersoLogo className="shrink-0" iconSize={24} />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
                {user.email ??
                  (typeof user.user_metadata?.full_name === "string"
                    ? user.user_metadata.full_name
                    : "Modo local")}
              </span>
              <Button variant="heroOutline" size="sm" onClick={handleLogout} className="gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </Button>
            </>
          ) : (
            <Button variant="heroOutline" size="sm" className="gap-1.5" onClick={() => navigate("/entrar")}>
              <LogIn className="h-3.5 w-3.5" />
              Entrar
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
