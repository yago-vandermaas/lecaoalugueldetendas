import { p256 } from "@noble/curves/nist.js";

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function getVapid() {
  const seed = process.env["VAPID_SEED"];
  if (!seed) throw new Error("VAPID_SEED não configurado");
  const sk = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const pk = p256.getPublicKey(sk, false);
  return { sk, publicKey: b64url(pk) };
}

export async function getVapidPublicKeyServer() {
  return (await getVapid()).publicKey;
}

async function sendPush(endpoint: string): Promise<number> {
  const { sk, publicKey } = await getVapid();
  const aud = new URL(endpoint).origin;
  const enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:contato@lecao-tendas.app",
  })}`;
  const raw = p256.sign(new TextEncoder().encode(unsigned), sk) as unknown;
  const sig =
    raw instanceof Uint8Array ? raw : (raw as { toBytes: (f: string) => Uint8Array }).toBytes("compact");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "3600",
      Urgency: "high",
      "Content-Length": "0",
      Authorization: `vapid t=${unsigned}.${b64url(sig)}, k=${publicKey}`,
    },
  });
  if (!res.ok) console.error(`[Push] falha ${res.status}: ${await res.text()}`);
  return res.status;
}

export async function processarLembretes() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const agora = new Date();
  const doisHorasAtras = new Date(agora.getTime() - 2 * 3600 * 1000).toISOString();

  const { data: locacoes, error } = await supabaseAdmin
    .from("rentals")
    .select("id, inicio, fim, lembrete_vespera_em, lembrete_dia_em, vespera_enviado, ultimo_aviso_em")
    .eq("situacao", "confirmado")
    .eq("montada", false);
  if (error) throw error;

  const vespera: string[] = [];
  const dia: string[] = [];
  for (const r of locacoes ?? []) {
    if (r.lembrete_vespera_em && !r.vespera_enviado && new Date(r.lembrete_vespera_em) <= agora) {
      vespera.push(r.id);
    }
    const limite = r.fim || r.inicio;
    const aindaNoPrazo =
      !limite || agora < new Date(new Date(limite + "T00:00:00-03:00").getTime() + 86400000);
    if (
      r.lembrete_dia_em &&
      new Date(r.lembrete_dia_em) <= agora &&
      aindaNoPrazo &&
      (!r.ultimo_aviso_em || r.ultimo_aviso_em <= doisHorasAtras)
    ) {
      dia.push(r.id);
    }
  }

  if (vespera.length === 0 && dia.length === 0) return { enviados: 0 };

  const { data: aparelhos } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint");
  let enviados = 0;
  for (const a of aparelhos ?? []) {
    const status = await sendPush(a.endpoint);
    if (status === 404 || status === 410) {
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", a.id);
    } else if (status < 300) enviados++;
  }

  if (vespera.length)
    await supabaseAdmin.from("rentals").update({ vespera_enviado: true }).in("id", vespera);
  if (dia.length)
    await supabaseAdmin
      .from("rentals")
      .update({ ultimo_aviso_em: agora.toISOString() })
      .in("id", dia);

  return { enviados };
}
