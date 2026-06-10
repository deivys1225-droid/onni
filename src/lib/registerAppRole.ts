export type RegisterAppRole = "particular" | "estudiante" | "docente";

const PENDING_OAUTH_ROLE_KEY = "onniverso.oauth_register_role";

function readStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/** Rol elegido en registro → fila `profiles` (permitido por RLS en insert). */
export function profileFromRegisterRole(choice: RegisterAppRole): {
  appRole: "particular" | "estudiante" | "docente";
  teacherRequestPending: boolean;
} {
  if (choice === "estudiante") {
    return { appRole: "estudiante", teacherRequestPending: false };
  }
  if (choice === "docente") {
    return { appRole: "docente", teacherRequestPending: false };
  }
  return { appRole: "particular", teacherRequestPending: false };
}

export function isRegisterAppRole(value: string): value is RegisterAppRole {
  return value === "particular" || value === "estudiante" || value === "docente";
}

/** Guarda el tipo de cuenta antes de redirigir a Google (OAuth). */
export function setPendingOAuthRegisterRole(role: RegisterAppRole): void {
  readStorage()?.setItem(PENDING_OAUTH_ROLE_KEY, role);
}

/** Lee el rol pendiente (sin borrarlo). */
export function readPendingOAuthRegisterRole(): RegisterAppRole | null {
  const raw = readStorage()?.getItem(PENDING_OAUTH_ROLE_KEY);
  if (!raw || !isRegisterAppRole(raw)) return null;
  return raw;
}

export function clearPendingOAuthRegisterRole(): void {
  readStorage()?.removeItem(PENDING_OAUTH_ROLE_KEY);
}
