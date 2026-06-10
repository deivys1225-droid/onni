import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AulaVirtualCardChoiceDialog,
  type AulaVirtualCardAction,
} from "@/components/galeria3d/AulaVirtualCardChoiceDialog";
import { openAulaVirtualLobbyOnAndroid } from "@/lib/aulaVirtual";
import { LOBBY_IMMERSIVE_PATH } from "@/lib/lobbyImmersive";
import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";

/**
 * Tarjeta promocional de Aula Virtual (no el ítem del menú navbar).
 * APK: lobby VR nativo o lobby web en la app; web: enlace directo al lobby inmersivo.
 */
export function useAulaVirtualCardChoice() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const requestAulaVirtualEntry = useCallback((): boolean => {
    if (!isAndroidLiveStreamChoicePlatform()) return false;
    setOpen(true);
    return true;
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const selectAction = useCallback(
    (action: AulaVirtualCardAction) => {
      setOpen(false);
      if (action === "OPEN_AULA_LOBBY") {
        openAulaVirtualLobbyOnAndroid();
        return;
      }
      navigate(LOBBY_IMMERSIVE_PATH);
    },
    [navigate],
  );

  const dialog = (
    <AulaVirtualCardChoiceDialog open={open} onSelect={selectAction} onClose={close} />
  );

  return { requestAulaVirtualEntry, dialog };
}
