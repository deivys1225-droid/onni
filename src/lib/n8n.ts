import { N8N_PAYMENT_WEBHOOK_URL } from "@/config/payments";

export type PaymentN8nPayload = {
  source: "ticket" | "worldcup-semifinal" | "worldcup-final" | "store";
  amount: string;
  currency: "USD";
  userId: string | null;
  userEmail: string | null;
  /** Identificador de pedido: event UUID, clave de producto, etc. */
  eventId: string;
  paypalOrderId?: string;
  at: string;
  productCategoryId?: string;
  productCategoryLabel?: string;
  productTitle?: string;
  skinRarity?: string;
  delivery?: "digital";
};

function shouldSkipWebhook(): boolean {
  if (!N8N_PAYMENT_WEBHOOK_URL) return true;
  const u = N8N_PAYMENT_WEBHOOK_URL.toLowerCase();
  return u.includes("placeholder") || u.includes("example.com");
}

/**
 * Notifies n8n (entrega inmediata del producto) cuando se confirma un pago.
 * Configura VITE_N8N_PAYMENT_WEBHOOK con la URL de tu instancia n8n.
 */
export async function notifyN8nPaymentSuccess(payload: PaymentN8nPayload): Promise<void> {
  if (shouldSkipWebhook()) {
    if (import.meta.env.DEV) {
      console.info("[n8n] Skipping webhook (not configured). Payload:", payload);
    }
    return;
  }
  const res = await fetch(N8N_PAYMENT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`n8n webhook failed: ${res.status}`);
  }
}
