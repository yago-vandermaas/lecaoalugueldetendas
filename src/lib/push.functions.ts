import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const obterChavePush = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getVapidPublicKeyServer } = await import("./push.server");
    return { ok: true as const, chave: await getVapidPublicKeyServer() };
  } catch (error) {
    console.error("[Push] configuracao indisponivel", error);
    return { ok: false as const, motivo: "configuracao" as const };
  }
});

export const registrarAparelho = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ senha: z.string().min(1).max(200), endpoint: z.string().url().max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { verificarSenhaAdminServer } = await import("./admin-auth.server");
      const v = await verificarSenhaAdminServer(data.senha);
      if (!v.ok) {
        return {
          ok: false as const,
          motivo: v.motivo === "erro" ? "configuracao" : ("senha" as const),
        };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .upsert({ endpoint: data.endpoint }, { onConflict: "endpoint" });
      if (error) {
        console.error("[Push] erro ao salvar aparelho", error);
        return { ok: false as const, motivo: "configuracao" as const };
      }
      return { ok: true as const };
    } catch (error) {
      console.error("[Push] nao foi possivel registrar aparelho", error);
      return { ok: false as const, motivo: "configuracao" as const };
    }
  });
