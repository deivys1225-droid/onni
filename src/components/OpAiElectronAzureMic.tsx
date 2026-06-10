import { useRef, type PointerEvent } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

type OpAiElectronAzureMicProps = {
  processing: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  beginHold: () => void | Promise<void>;
  endHold: () => void | Promise<void>;
};

/** Micrófono Azure STT en OnniVers .exe — mantén pulsado para grabar, suelta para enviar. */
export default function OpAiElectronAzureMic({
  processing,
  isRecording,
  isProcessing,
  beginHold,
  endHold,
}: OpAiElectronAzureMicProps) {
  const holdingRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (processing || isProcessing || holdingRef.current) return;
    event.preventDefault();
    holdingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    void beginHold();
  };

  const handlePointerRelease = (event: PointerEvent<HTMLButtonElement>) => {
    if (!holdingRef.current) return;
    event.preventDefault();
    holdingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    void endHold();
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "secondary" : "outline"}
      disabled={processing || isProcessing}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onPointerLeave={(event) => {
        if (!holdingRef.current || !isRecording) return;
        handlePointerRelease(event);
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={
        isRecording
          ? "Suelta para enviar tu pedido a Onni"
          : "Mantén pulsado y di tu pedido a Onni"
      }
    >
      <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
    </Button>
  );
}
