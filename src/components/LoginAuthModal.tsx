import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

type LoginAuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToAuth: () => void;
};

const LoginAuthModal = ({ open, onOpenChange, onGoToAuth }: LoginAuthModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Inicio de sesión requerido</DialogTitle>
        <DialogDescription>
          Para acceder a este contenido de pago, inicia sesión en la aplicación. Luego podrás completar tu
          compra con PayPal.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
        <Button type="button" variant="heroOutline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
        <Button type="button" variant="hero" className="gap-2" onClick={onGoToAuth}>
          <LogIn className="h-4 w-4" />
          Ir a iniciar sesión
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default LoginAuthModal;
