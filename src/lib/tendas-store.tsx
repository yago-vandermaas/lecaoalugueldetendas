import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SITUACOES_OCUPANDO,
  type CartItem,
  type NewRental,
  type Rental,
  type RentalSituacao,
  type Tent,
  type TentStatus,
} from "./tendas-data";

const LOCAL_KEY = "tendas-app-local-v2";

type LocalState = { cart: CartItem[]; isAdmin: boolean };

const localInitial: LocalState = { cart: [], isAdmin: false };

type TentRow = {
  id: string;
  nome: string;
  tipo: string;
  dimensoes: string;
  area: number;
  diaria: number;
  estoque: number;
  status: string;
  imagem: string;
  descricao: string;
};

type RentalRow = {
  id: string;
  cliente: string;
  telefone: string;
  local: string;
  inicio: string | null;
  fim: string | null;
  dias: number;
  itens: unknown;
  total: number;
  pago: boolean;
  situacao: string;
  created_at: string;
};

const toTent = (r: TentRow): Tent => ({
  id: r.id,
  nome: r.nome,
  tipo: r.tipo,
  dimensoes: r.dimensoes,
  area: Number(r.area),
  diaria: Number(r.diaria),
  estoque: Number(r.estoque),
  status: (r.status as TentStatus) ?? "disponivel",
  imagem: r.imagem,
  descricao: r.descricao,
});

const toRental = (r: RentalRow): Rental => ({
  id: r.id,
  cliente: r.cliente,
  telefone: r.telefone,
  local: r.local,
  inicio: r.inicio ?? "",
  fim: r.fim ?? "",
  dias: Number(r.dias),
  itens: Array.isArray(r.itens) ? (r.itens as CartItem[]) : [],
  total: Number(r.total),
  pago: r.pago,
  situacao: (r.situacao as RentalSituacao) ?? "pendente",
  criadoEm: r.created_at,
});

type StoreValue = LocalState & {
  tents: Tent[];
  rentals: Rental[];
  whatsapp: string;
  carregando: boolean;
  /** Quantidade já comprometida (pedidos pendentes + alugados) por tenda. */
  reservadas: (tentId: string) => number;
  /** Estoque livre agora, considerando pedidos e o carrinho atual. */
  disponiveis: (tent: Tent) => number;
  addToCart: (tent: Tent, quantidade?: number) => void;
  removeFromCart: (tentId: string) => void;
  clearCart: () => void;
  saveTent: (tent: Tent) => Promise<void>;
  deleteTent: (id: string) => Promise<void>;
  setStatus: (id: string, status: TentStatus) => Promise<void>;
  addRental: (rental: NewRental) => Promise<void>;
  setSituacao: (id: string, situacao: RentalSituacao) => Promise<void>;
  togglePaid: (id: string) => Promise<void>;
  deleteRental: (id: string) => Promise<void>;
  setWhatsapp: (n: string) => Promise<void>;
  setIsAdmin: (v: boolean) => void;
  recarregar: () => Promise<void>;
};

const Ctx = createContext<StoreValue | null>(null);

export function TendasProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalState>(localInitial);
  const [tents, setTents] = useState<Tent[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [whatsapp, setWhatsappState] = useState("5511999999999");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setLocal({ ...localInitial, ...(JSON.parse(raw) as LocalState) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    } catch {
      /* ignore */
    }
  }, [local]);

  const recarregar = useCallback(async () => {
    const [tentRes, rentalRes, settingsRes] = await Promise.all([
      supabase.from("tents").select("*").order("created_at", { ascending: true }),
      supabase.from("rentals").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("whatsapp").eq("id", "default").maybeSingle(),
    ]);

    if (tentRes.error || rentalRes.error) {
      toast.error("Não foi possível carregar os dados do banco.");
      setCarregando(false);
      return;
    }

    setTents((tentRes.data as TentRow[]).map(toTent));
    setRentals((rentalRes.data as RentalRow[]).map(toRental));
    if (settingsRes.data?.whatsapp) setWhatsappState(settingsRes.data.whatsapp);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Realtime: mantém painel e catálogo sincronizados
  useEffect(() => {
    const channel = supabase
      .channel("tendas-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tents" }, () => {
        void recarregar();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rentals" }, () => {
        void recarregar();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [recarregar]);

  const reservadasMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rentals) {
      if (!SITUACOES_OCUPANDO.includes(r.situacao)) continue;
      for (const i of r.itens) map[i.tentId] = (map[i.tentId] ?? 0) + i.quantidade;
    }
    return map;
  }, [rentals]);

  const patchLocal = useCallback(
    (fn: (s: LocalState) => Partial<LocalState>) => setLocal((s) => ({ ...s, ...fn(s) })),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const reservadas = (tentId: string) => reservadasMap[tentId] ?? 0;
    const disponiveis = (tent: Tent) => {
      if (tent.status === "manutencao") return 0;
      const noCarrinho = local.cart.find((i) => i.tentId === tent.id)?.quantidade ?? 0;
      return Math.max(0, tent.estoque - reservadas(tent.id) - noCarrinho);
    };

    return {
      ...local,
      tents,
      rentals,
      whatsapp,
      carregando,
      reservadas,
      disponiveis,

      addToCart: (tent, quantidade = 1) =>
        patchLocal((s) => {
          const atual = s.cart.find((i) => i.tentId === tent.id);
          const livre = Math.max(0, tent.estoque - (reservadasMap[tent.id] ?? 0));
          const nova = Math.min(livre, (atual?.quantidade ?? 0) + Math.max(1, quantidade));
          if (nova <= 0) return {};
          return {
            cart: atual
              ? s.cart.map((i) => (i.tentId === tent.id ? { ...i, quantidade: nova } : i))
              : [
                  ...s.cart,
                  { tentId: tent.id, nome: tent.nome, diaria: tent.diaria, quantidade: nova },
                ],
          };
        }),
      removeFromCart: (tentId) =>
        patchLocal((s) => ({ cart: s.cart.filter((i) => i.tentId !== tentId) })),
      clearCart: () => patchLocal(() => ({ cart: [] })),

      saveTent: async (tent) => {
        const payload = {
          nome: tent.nome,
          tipo: tent.tipo,
          dimensoes: tent.dimensoes,
          area: tent.area,
          diaria: tent.diaria,
          estoque: tent.estoque,
          status: tent.status,
          imagem: tent.imagem,
          descricao: tent.descricao,
        };
        const { error } = tent.id
          ? await supabase.from("tents").update(payload).eq("id", tent.id)
          : await supabase.from("tents").insert(payload);
        if (error) {
          toast.error("Erro ao salvar a tenda.");
          return;
        }
        await recarregar();
      },
      deleteTent: async (id) => {
        const { error } = await supabase.from("tents").delete().eq("id", id);
        if (error) {
          toast.error("Erro ao remover a tenda.");
          return;
        }
        patchLocal((s) => ({ cart: s.cart.filter((i) => i.tentId !== id) }));
        await recarregar();
      },
      setStatus: async (id, status) => {
        const { error } = await supabase.from("tents").update({ status }).eq("id", id);
        if (error) {
          toast.error("Erro ao atualizar o status.");
          return;
        }
        await recarregar();
      },

      addRental: async (rental) => {
        const { error } = await supabase.from("rentals").insert({
          cliente: rental.cliente,
          telefone: rental.telefone,
          local: rental.local,
          inicio: rental.inicio || null,
          fim: rental.fim || null,
          dias: rental.dias,
          itens: rental.itens,
          total: rental.total,
          pago: rental.pago,
          situacao: rental.situacao,
        });
        if (error) {
          toast.error("Erro ao registrar o pedido.");
          return;
        }
        await recarregar();
      },
      setSituacao: async (id, situacao) => {
        const { error } = await supabase.from("rentals").update({ situacao }).eq("id", id);
        if (error) {
          toast.error("Erro ao atualizar o pedido.");
          return;
        }
        await recarregar();
      },
      togglePaid: async (id) => {
        const atual = rentals.find((r) => r.id === id);
        if (!atual) return;
        const { error } = await supabase
          .from("rentals")
          .update({ pago: !atual.pago })
          .eq("id", id);
        if (error) {
          toast.error("Erro ao atualizar o pagamento.");
          return;
        }
        await recarregar();
      },
      deleteRental: async (id) => {
        const { error } = await supabase.from("rentals").delete().eq("id", id);
        if (error) {
          toast.error("Erro ao excluir a locação.");
          return;
        }
        await recarregar();
      },

      setWhatsapp: async (numero) => {
        setWhatsappState(numero);
        const { error } = await supabase
          .from("settings")
          .upsert({ id: "default", whatsapp: numero });
        if (error) toast.error("Erro ao salvar o WhatsApp.");
      },
      setIsAdmin: (isAdmin) => patchLocal(() => ({ isAdmin })),
      recarregar,
    };
  }, [local, tents, rentals, whatsapp, carregando, reservadasMap, patchLocal, recarregar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTendas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTendas deve ser usado dentro de TendasProvider");
  return ctx;
}
