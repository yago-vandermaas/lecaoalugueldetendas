import { createFileRoute } from "@tanstack/react-router";

// Chamado pelo agendador a cada 30 min. Só envia avisos devidos (sem dados pessoais).
const run = async () => {
  try {
    const { processarLembretes } = await import("@/lib/push.server");
    return Response.json(await processarLembretes());
  } catch (e) {
    console.error("[Lembretes]", e);
    return new Response("erro", { status: 500 });
  }
};

export const Route = createFileRoute("/api/public/lembretes")({
  server: { handlers: { GET: run, POST: run } },
});
