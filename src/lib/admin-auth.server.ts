import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const encoder = new TextEncoder();

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createAdminAuthClient() {
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const publishableKey =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !publishableKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _adminAuthClient: ReturnType<typeof createAdminAuthClient> | undefined;

function getAdminAuthClient() {
  if (!_adminAuthClient) _adminAuthClient = createAdminAuthClient();
  return _adminAuthClient;
}

async function hash(valor: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(valor));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verificarSenhaAdminServer(senha: string) {
  const senhaHash = await hash(senha);
  const { data, error } = await getAdminAuthClient().rpc("verificar_senha_admin", {
    senha_hash_input: senhaHash,
  });

  if (error) {
    console.error("[AdminAuth] Nao foi possivel verificar a senha.", error);
    return { ok: false as const, motivo: "erro" as const };
  }

  return { ok: data === true };
}

export async function alterarSenhaAdminServer(atual: string, nova: string) {
  if (nova.length < 6) {
    return { ok: false as const, motivo: "curta" as const };
  }

  const [senhaAtualHash, senhaNovaHash] = await Promise.all([hash(atual), hash(nova)]);
  const { data, error } = await getAdminAuthClient().rpc("alterar_senha_admin", {
    senha_atual_hash_input: senhaAtualHash,
    senha_nova_hash_input: senhaNovaHash,
  });

  if (error) return { ok: false as const, motivo: "erro" as const };
  if (data !== "ok") return { ok: false as const, motivo: "incorreta" as const };
  return { ok: true as const };
}
