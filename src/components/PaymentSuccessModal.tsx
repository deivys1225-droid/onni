import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

type PaymentSuccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
};

const PaymentSuccessModal = ({
  open,
  onOpenChange,
  title = "¡Pago exitoso!",
  message = "Tu pago se confirmó correctamente. Ya puedes disfrutar del contenido.",
}: PaymentSuccessModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border border-emerald-500/30 bg-card/95 backdrop-blur-md">
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <PartyPopper className="h-7 w-7" />
        </div>
        <DialogTitle className="text-center font-display text-2xl">{title}</DialogTitle>
        <DialogDescription className="text-center text-base leading-relaxed">{message}</DialogDescription>
      </DialogHeader>
      <div className="flex justify-center pt-2">
        <Button type="button" variant="hero" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
          Continuar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PaymentSuccessModal;
