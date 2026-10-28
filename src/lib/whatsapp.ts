import {
  brl,
  calcularResumoCarrinho,
  calcularSubtotalItem,
  DESCONTO_DIARIA_ADICIONAL,
  type CartItem,
} from "./tendas-data";

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

export type RentalWhatsAppPayload = {
  cliente: string;
  telefone: string;
  local: string;
  inicio: string;
  fim: string;
  dias: number;
  itens: CartItem[];
};

const formatarData = (isoDate: string) => isoDate.split("-").reverse().join("/");

/**
 * Gera o texto formatado da mensagem de pedido enviada para o WhatsApp do atendimento,
 * detalhando o cálculo das diárias e o desconto promocional de 50% a partir da 2ª diária.
 */
export function formatRentalWhatsAppMessage({
  cliente,
  telefone,
  local,
  inicio,
  fim,
  dias,
  itens,
}: RentalWhatsAppPayload): string {
  const resumo = calcularResumoCarrinho(itens, dias);
  const temDesconto = dias >= 2 && resumo.descontoTotal > 0;

  const itensFormatados = itens.map((item) => {
    const subtotalItem = calcularSubtotalItem(item, dias);
    const elegivel = item.isTent !== false;

    if (dias >= 2 && elegivel) {
      const diariaComDesconto = item.diaria * DESCONTO_DIARIA_ADICIONAL;
      return [
        `• ${item.quantidade}x ${item.nome} — 1ª diária: ${brl(item.diaria)}/un. | 2ª+ diária (50% OFF): ${brl(diariaComDesconto)}/un.`,
        `  ↳ ${dias} diárias (1ª integral + demais com 50% OFF): *${brl(subtotalItem)}*`,
      ].join("\n");
    }

    return `• ${item.quantidade}x ${item.nome} — ${brl(item.diaria)}/dia (${dias} diária${dias > 1 ? "s" : ""}: *${brl(subtotalItem)}*)`;
  });

  const blocoDetalhamento = temDesconto
    ? [
        `*Detalhamento das diárias (${dias} diárias — 1ª integral + demais com 50% OFF):*`,
        `• 1ª diária (100%): ${brl(resumo.valorPrimeiraDiaria)}`,
        `• ${resumo.diasAdicionais} diária${resumo.diasAdicionais > 1 ? "s" : ""} adicional${resumo.diasAdicionais > 1 ? "is" : ""} com 50% OFF: ${brl(resumo.valorDiariasAdicionais)} _(economia de ${brl(resumo.descontoTotal)})_`,
        "",
      ]
    : [];

  const linhas = [
    "*NOVO PEDIDO DE RESERVA — Lecão Aluguel de Tendas*",
    "",
    `*Cliente:* ${cliente}`,
    `*Telefone:* ${telefone}`,
    `*Local do evento:* ${local}`,
    `*Período:* ${formatarData(inicio)} até ${formatarData(fim)} (${dias} diária${dias > 1 ? "s" : ""})`,
    "",
    "*Itens escolhidos:*",
    ...itensFormatados,
    "",
    ...blocoDetalhamento,
    `*Valor total estimado:* ${brl(resumo.total)}${temDesconto ? ` (${dias} diárias: 1ª integral + demais com 50% OFF)` : ""}`,
    "",
    "_Obs.: o valor do frete/entrega é calculado à parte, conforme o local do evento._",
  ];

  return linhas.join("\n");
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
