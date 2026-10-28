export type TentStatus = "disponivel" | "reservada" | "manutencao";

export type Tent = {
  id: string;
  nome: string;
  tipo: string;
  dimensoes: string;
  area: number;
  diaria: number;
  estoque: number;
  status: TentStatus;
  imagem: string;
  descricao: string;
};

export type CartItem = {
  tentId: string;
  nome: string;
  diaria: number;
  quantidade: number;
  /**
   * Indica se o item é uma tenda elegível à regra promocional (2ª diária em diante com 50% OFF).
   * Caso omitido (`undefined`), assume `true` para manter compatibilidade com itens já salvos.
   */
  isTent?: boolean | undefined;
};

/** Situação do pedido no controle de estoque. */
export type RentalSituacao = "pendente" | "confirmado" | "desistencia";

export type Rental = {
  id: string;
  cliente: string;
  telefone: string;
  local: string;
  inicio: string;
  fim: string;
  dias: number;
  itens: CartItem[];
  total: number;
  pago: boolean;
  situacao: RentalSituacao;
  criadoEm: string;
  lembreteVespera?: string | null;
  lembreteDia?: string | null;
  montada?: boolean;
};

/** Novo pedido antes de existir no banco (id gerado pelo Supabase). */
export type NewRental = Omit<Rental, "id" | "criadoEm" | "lembreteVespera" | "lembreteDia" | "montada">;

export const STATUS_LABEL: Record<TentStatus, string> = {
  disponivel: "Disponível",
  reservada: "Reservado",
  manutencao: "Em manutenção",
};

export const SITUACAO_LABEL: Record<RentalSituacao, string> = {
  pendente: "Pendente de confirmação",
  confirmado: "Alugadas",
  desistencia: "Desistência do cliente",
};

/** Pedidos que ocupam estoque (descontam das tendas disponíveis). */
export const SITUACOES_OCUPANDO: RentalSituacao[] = ["pendente", "confirmado"];

export const TENT_TYPES = ["Piramidal", "Chapéu de bruxa"] as const;

export const DESCONTO_DIARIA_ADICIONAL = 0.5;

export const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export const diffDias = (inicio: string, fim: string) => {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + "T00:00:00").getTime();
  const b = new Date(fim + "T00:00:00").getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

/**
 * Calcula o valor de 1 unidade de tenda para a quantidade de diárias informada:
 * - Se dias <= 0: 0
 * - Se dias == 1: precoDiaria
 * - Se dias >= 2: precoDiaria + ((dias - 1) * (precoDiaria * 0.5))
 */
export const calcularValorTendaPorDias = (precoDiaria: number, dias: number): number => {
  if (dias <= 0 || precoDiaria <= 0) return 0;
  if (dias === 1) return precoDiaria;
  return precoDiaria + (dias - 1) * (precoDiaria * DESCONTO_DIARIA_ADICIONAL);
};

/**
 * Calcula o subtotal de um item do carrinho considerando a quantidade e o número de diárias.
 * Aplica o desconto de 50% a partir da 2ª diária apenas para tendas (`isTent !== false`).
 */
export const calcularSubtotalItem = (item: CartItem, dias: number): number => {
  if (dias <= 0 || item.quantidade <= 0) return 0;
  const elegivelDesconto = item.isTent !== false;
  if (!elegivelDesconto) {
    return item.diaria * item.quantidade * dias;
  }
  return calcularValorTendaPorDias(item.diaria, dias) * item.quantidade;
};

export type ResumoCalculoCarrinho = {
  dias: number;
  diasAdicionais: number;
  /** Soma de 1 diária integral de todos os itens do carrinho (1ª diária). */
  valorPrimeiraDiaria: number;
  /** Valor de cada diária adicional (com 50% OFF nas tendas). */
  valorPorDiariaAdicional: number;
  /** Soma total das diárias adicionais (a partir do 2º dia) já com desconto de 50%. */
  valorDiariasAdicionais: number;
  /** Valor total que seria cobrado sem o desconto promocional. */
  totalSemDesconto: number;
  /** Economia total gerada pelo desconto de 50% a partir da 2ª diária. */
  descontoTotal: number;
  /** Valor final a pagar. */
  total: number;
};

/**
 * Calcula o resumo detalhado do carrinho com discriminação da 1ª diária,
 * diárias adicionais com 50% OFF e economia total.
 */
export const calcularResumoCarrinho = (
  itens: CartItem[],
  dias: number,
): ResumoCalculoCarrinho => {
  const diasValidos = Math.max(0, dias);
  const diasAdicionais = Math.max(0, diasValidos - 1);

  const valorPrimeiraDiaria = itens.reduce((acc, item) => acc + item.diaria * item.quantidade, 0);

  const valorPorDiariaAdicional = itens.reduce((acc, item) => {
    const fator = item.isTent !== false ? DESCONTO_DIARIA_ADICIONAL : 1;
    return acc + item.diaria * fator * item.quantidade;
  }, 0);

  const valorDiariasAdicionais =
    diasAdicionais > 0 ? diasAdicionais * valorPorDiariaAdicional : 0;

  const totalSemDesconto = diasValidos > 0 ? valorPrimeiraDiaria * diasValidos : 0;
  const total =
    diasValidos > 0
      ? itens.reduce((acc, item) => acc + calcularSubtotalItem(item, diasValidos), 0)
      : 0;
  const descontoTotal = Math.max(0, totalSemDesconto - total);

  return {
    dias: diasValidos,
    diasAdicionais,
    valorPrimeiraDiaria,
    valorPorDiariaAdicional,
    valorDiariasAdicionais,
    totalSemDesconto,
    descontoTotal,
    total,
  };
};
