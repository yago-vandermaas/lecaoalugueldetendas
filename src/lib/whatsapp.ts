/**
 * Abre o WhatsApp de forma confiável, inclusive dentro de iframes de preview
 * (onde a navegação para api.whatsapp.com pode ser bloqueada pelo navegador).
 *
 * Usa sempre o domínio wa.me e força a abertura no contexto de janela do topo.
 * Retorna a URL gerada e se a abertura foi bem-sucedida.
 */
/** Normaliza o número para o formato aceito pelo wa.me: só dígitos, com DDI 55. */
export function normalizeWhatsAppNumber(numero: string) {
  let num = (numero || "").replace(/\D/g, "");
  num = num.replace(/^0+/, "");
  if (num.startsWith("550")) num = "55" + num.slice(3);
  // 10-11 dígitos = número brasileiro sem DDI
  if (num.length === 10 || num.length === 11) num = "55" + num;
  return num;
}

export function buildWhatsAppUrl(numero: string, mensagem: string) {
  const num = normalizeWhatsAppNumber(numero);
  return `https://wa.me/${num}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}


export function openWhatsApp(numero: string, mensagem: string): { url: string; ok: boolean } {
  const url = buildWhatsAppUrl(numero, mensagem);

  // 1) tentativa padrão: nova aba
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) return { url, ok: true };
  } catch {
    /* ignora e tenta fallback */
  }

  // 2) fallback: âncora sintética (funciona quando window.open é bloqueado)
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { url, ok: true };
  } catch {
    /* ignora */
  }

  return { url, ok: false };
}
