import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

const hash = (valor: string) => createHash("sha256").update(valor, "utf8").digest("hex");

const iguais = (a: string, b: string) => {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

async function lerHash() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_credentials")
    .select("senha_hash")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar a senha.");
  return data?.senha_hash ?? null;
}

export const verificarSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { senha: string }) => data)
  .handler(async ({ data }) => {
    const atual = await lerHash();
    if (!atual) return { ok: false as const };
    return { ok: iguais(hash(data.senha), atual) };
  });

export const alterarSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { atual: string; nova: string }) => data)
  .handler(async ({ data }) => {
    if (data.nova.length < 6) {
      return { ok: false as const, motivo: "curta" as const };
    }
    const atual = await lerHash();
    if (!atual || !iguais(hash(data.atual), atual)) {
      return { ok: false as const, motivo: "incorreta" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_credentials")
      .upsert({ id: "default", senha_hash: hash(data.nova), updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, motivo: "erro" as const };
    return { ok: true as const };
  });
