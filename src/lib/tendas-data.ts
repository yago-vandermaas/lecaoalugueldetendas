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
};

/** Novo pedido antes de existir no banco (id gerado pelo Supabase). */
export type NewRental = Omit<Rental, "id" | "criadoEm">;

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

export const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const diffDias = (inicio: string, fim: string) => {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + "T00:00:00").getTime();
  const b = new Date(fim + "T00:00:00").getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};
