import { supabase } from "@/integrations/supabase/client";
import { getSiteUrl } from "@/lib/siteUrl";
import { setPendingOAuthRegisterRole, type RegisterAppRole } from "@/lib/registerAppRole";

/** URL de retorno tras OAuth (debe estar en Supabase Auth → Redirect URLs). */
export function getOAuthRedirectUrl(): string {
  return `${getSiteUrl()}/entrar`;
}

export function isOAuthReturnUrl(): boolean {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  const hash = window.location.hash;
  return search.includes("code=") || hash.includes("access_token=");
}

/** Inicia sesión o registro con Google (redirección PKCE de Supabase). */
export async function signInWithOAuthProvider(registerRole?: RegisterAppRole): Promise<void> {
  if (registerRole) {
    setPendingOAuthRegisterRole(registerRole);
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}
