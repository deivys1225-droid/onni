import { isElectronDesktopApp } from "@/lib/deviceDetection";

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

const KEYBOARD_SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Space",
]);

/** OnniVers .exe: desplazamiento solo con rueda del mouse; Espacio queda libre para Onni (mic). */
export function installElectronMouseOnlyScroll(): () => void {
  if (!isElectronDesktopApp()) return () => {};

  const onKeyDown = (event: KeyboardEvent) => {
    if (isEditableKeyboardTarget(event.target)) return;
    if (!KEYBOARD_SCROLL_KEYS.has(event.key) && event.code !== "Space") return;
    event.preventDefault();
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
}
