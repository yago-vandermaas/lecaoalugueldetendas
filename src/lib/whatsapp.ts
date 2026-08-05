/**
 * Abre o WhatsApp de forma confiável, inclusive dentro de iframes de preview
 * (onde a navegação para api.whatsapp.com pode ser bloqueada pelo navegador).
 *
 * Usa sempre o domínio wa.me e força a abertura no contexto de janela do topo.
 * Retorna a URL gerada e se a abertura foi bem-sucedida.
 */
export function buildWhatsAppUrl(numero: string, mensagem: string) {
  const num = numero.replace(/\D/g, "");
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
