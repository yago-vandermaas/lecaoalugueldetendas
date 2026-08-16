import { createServerFn } from "@tanstack/react-start";

export const verificarSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { senha: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { verificarSenhaAdminServer } = await import("./admin-auth.server");
      return verificarSenhaAdminServer(data.senha);
    } catch (error) {
      console.error("[AdminAuth] Erro inesperado ao verificar senha.", error);
      return { ok: false as const, motivo: "erro" as const };
    }
  });

export const alterarSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { atual: string; nova: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { alterarSenhaAdminServer } = await import("./admin-auth.server");
      return alterarSenhaAdminServer(data.atual, data.nova);
    } catch (error) {
      console.error("[AdminAuth] Erro inesperado ao alterar senha.", error);
      return { ok: false as const, motivo: "erro" as const };
    }
  });
