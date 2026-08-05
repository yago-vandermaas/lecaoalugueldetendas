import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockTents, type CartItem, type Rental, type Tent, type TentStatus } from "./tendas-data";

const KEY = "tendas-app-v1";

type Persisted = {
  tents: Tent[];
  rentals: Rental[];
  cart: CartItem[];
  whatsapp: string;
  senha: string;
  isAdmin: boolean;
};


const initial: Persisted = {
  tents: mockTents,
  rentals: [
    {
      id: "r1",
      cliente: "Marina Duarte",
      telefone: "(11) 98888-1212",
      local: "Chácara Bela Vista, Itu - SP",
      inicio: "2026-07-10",
      fim: "2026-07-12",
      dias: 3,
      itens: [{ tentId: "t1", nome: "Tenda Galpão 10x10", diaria: 850, quantidade: 1 }],
      total: 2550,
      pago: true,
      criadoEm: "2026-07-01T12:00:00.000Z",
    },
    {
      id: "r2",
      cliente: "Prefeitura de Salto",
      telefone: "(11) 97777-3434",
      local: "Praça Central, Salto - SP",
      inicio: "2026-08-05",
      fim: "2026-08-07",
      dias: 3,
      itens: [{ tentId: "t2", nome: "Tenda Piramidal 3x3", diaria: 180, quantidade: 6 }],
      total: 3240,
      pago: false,
      criadoEm: "2026-07-20T12:00:00.000Z",
    },
  ],
  cart: [],
  whatsapp: "5511999999999",
  senha: "tendas123",
  isAdmin: false,
};


type StoreValue = Persisted & {
  addToCart: (tent: Tent, quantidade?: number) => void;
  removeFromCart: (tentId: string) => void;
  clearCart: () => void;
  saveTent: (tent: Tent) => void;
  deleteTent: (id: string) => void;
  setStatus: (id: string, status: TentStatus) => void;
  addRental: (rental: Rental) => void;
  togglePaid: (id: string) => void;
  deleteRental: (id: string) => void;
  setWhatsapp: (n: string) => void;
  setSenha: (s: string) => void;
  setIsAdmin: (v: boolean) => void;
};


const Ctx = createContext<StoreValue | null>(null);

export function TendasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...(JSON.parse(raw) as Persisted) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const patch = useCallback(
    (fn: (s: Persisted) => Partial<Persisted>) => setState((s) => ({ ...s, ...fn(s) })),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      addToCart: (tent, quantidade = 1) =>
        patch((s) => {
          const atual = s.cart.find((i) => i.tentId === tent.id);
          const max = Math.max(1, tent.estoque);
          const nova = Math.min(max, (atual?.quantidade ?? 0) + Math.max(1, quantidade));
          return {
            cart: atual
              ? s.cart.map((i) => (i.tentId === tent.id ? { ...i, quantidade: nova } : i))
              : [
                  ...s.cart,
                  { tentId: tent.id, nome: tent.nome, diaria: tent.diaria, quantidade: nova },
                ],
            tents: s.tents.map((t) => (t.id === tent.id ? { ...t, status: "reservada" } : t)),
          };
        }),
      removeFromCart: (tentId) =>
        patch((s) => ({
          cart: s.cart.filter((i) => i.tentId !== tentId),
          tents: s.tents.map((t) =>
            t.id === tentId && t.status === "reservada" ? { ...t, status: "disponivel" } : t,
          ),
        })),
      clearCart: () => patch(() => ({ cart: [] })),
      saveTent: (tent) =>
        patch((s) => ({
          tents: s.tents.some((t) => t.id === tent.id)
            ? s.tents.map((t) => (t.id === tent.id ? tent : t))
            : [...s.tents, tent],
        })),
      deleteTent: (id) =>
        patch((s) => ({
          tents: s.tents.filter((t) => t.id !== id),
          cart: s.cart.filter((i) => i.tentId !== id),
        })),
      setStatus: (id, status) =>
        patch((s) => ({ tents: s.tents.map((t) => (t.id === id ? { ...t, status } : t)) })),
      addRental: (rental) => patch((s) => ({ rentals: [rental, ...s.rentals] })),
      togglePaid: (id) =>
        patch((s) => ({ rentals: s.rentals.map((r) => (r.id === id ? { ...r, pago: !r.pago } : r)) })),
      deleteRental: (id) => patch((s) => ({ rentals: s.rentals.filter((r) => r.id !== id) })),
      setWhatsapp: (whatsapp) => patch(() => ({ whatsapp })),
      setSenha: (senha) => patch(() => ({ senha })),
      setIsAdmin: (isAdmin) => patch(() => ({ isAdmin })),

    }),
    [state, patch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTendas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTendas deve ser usado dentro de TendasProvider");
  return ctx;
}
