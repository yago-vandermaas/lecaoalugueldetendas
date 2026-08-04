import tenda1 from "@/assets/tenda-1.jpg";
import tenda2 from "@/assets/tenda-2.jpg";
import tenda3 from "@/assets/tenda-3.jpg";
import tenda4 from "@/assets/tenda-4.jpg";

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
  criadoEm: string;
};

export const STATUS_LABEL: Record<TentStatus, string> = {
  disponivel: "Disponível",
  reservada: "Reservado",
  manutencao: "Em manutenção",
};

export const TENT_TYPES = ["Chapéu de bruxa", "Galpão", "Piramidal", "Cristal"] as const;

export const mockTents: Tent[] = [
  {
    id: "t1",
    nome: "Tenda Galpão 10x10",
    tipo: "Galpão",
    dimensoes: "10m x 10m",
    area: 100,
    diaria: 850,
    estoque: 3,
    status: "disponivel",
    imagem: tenda1,
    descricao: "Ideal para casamentos e festas de até 120 pessoas. Fechamento lateral incluso.",
  },
  {
    id: "t2",
    nome: "Tenda Piramidal 3x3",
    tipo: "Piramidal",
    dimensoes: "3m x 3m",
    area: 9,
    diaria: 180,
    estoque: 12,
    status: "disponivel",
    imagem: tenda2,
    descricao: "Perfeita para food trucks, feiras e pequenos estandes. Montagem rápida.",
  },
  {
    id: "t3",
    nome: "Tenda Cristal 12x20",
    tipo: "Cristal",
    dimensoes: "12m x 20m",
    area: 240,
    diaria: 2400,
    estoque: 1,
    status: "reservada",
    imagem: tenda3,
    descricao: "Estrutura premium com forro e iluminação decorativa para grandes eventos.",
  },
  {
    id: "t4",
    nome: "Tenda Chapéu de Bruxa 6x6",
    tipo: "Chapéu de bruxa",
    dimensoes: "6m x 6m",
    area: 36,
    diaria: 420,
    estoque: 5,
    status: "disponivel",
    imagem: tenda4,
    descricao: "Charme clássico com cortinas brancas. Ótima para recepções e áreas de bar.",
  },
];

export const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const diffDias = (inicio: string, fim: string) => {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + "T00:00:00").getTime();
  const b = new Date(fim + "T00:00:00").getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};
