// supabase/functions/push-notify/index.ts
// Edge Function para enviar Web Push a proveedores cuando hay tickets/pedidos nuevos.
// Requiere envs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.42.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@cryxteam.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payloadInput: { provider_id?: string; title?: string; body?: string; url?: string };
  try {
    payloadInput = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { provider_id, title, body, url } = payloadInput;
  if (!provider_id) return new Response("provider_id requerido", { status: 400 });

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("provider_id", provider_id);

  if (error) return new Response(error.message, { status: 500 });
  if (!subs || subs.length === 0) return new Response("no subs", { status: 200 });

  const pushPayload = JSON.stringify({
    title: title || "Nuevo soporte/pedido",
    body: body || "Tienes una actualización",
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: url || "/dashboard?section=proveedor" },
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          pushPayload,
        );
      } catch (_err) {
        // opcional: eliminar suscripción inválida más adelante
      }
    })
  );

  return new Response("ok");
});
