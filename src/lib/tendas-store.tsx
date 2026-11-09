import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  calcularResumoCarrinho,
  calcularSubtotalItem,
  calcularValorTendaPorDias,
  SITUACOES_OCUPANDO,
  type AssemblyItem,
  type CartItem,
  type Employee,
  type EmployeePaymentRecord,
  type EmployeePaymentType,
  type NewEmployeePaymentRecord,
  type NewRental,
  type Rental,
  type RentalSituacao,
  type ResumoCalculoCarrinho,
  type Tent,
  type TentStatus,
} from "./tendas-data";

const LOCAL_KEY = "tendas-app-local-v2";
const EMPLOYEES_SETTINGS_KEY = "employees_payroll_v1";
const EMPLOYEES_LOCAL_CACHE_KEY = "tendas-employees-cache-v1";

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
  lembrete_vespera_em?: string | null;
  lembrete_dia_em?: string | null;
  montada?: boolean;
};

type EmployeeRow = {
  id: string;
  nome: string;
  telefone: string;
  cargo: string;
  pix: string;
  tipo_pagamento: string;
  salario_mensal: number;
  dia_pagamento: number;
  valores_por_tenda: unknown;
  valor_padrao_tenda: number;
  ativo: boolean;
  created_at: string;
};

type EmployeePaymentRow = {
  id: string;
  employee_id: string;
  tipo: string;
  competencia: string;
  data: string | null;
  rental_id: string | null;
  descricao: string;
  itens: unknown;
  quantidade_tendas: number;
  valor: number;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
};

type FallbackPayrollPayload = {
  employees: Employee[];
  employeePayments: EmployeePaymentRecord[];
};

const gerarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
  lembreteVespera: r.lembrete_vespera_em ?? null,
  lembreteDia: r.lembrete_dia_em ?? null,
  montada: r.montada ?? false,
});

const toEmployee = (r: EmployeeRow): Employee => {
  const rawMap =
    r.valores_por_tenda &&
    typeof r.valores_por_tenda === "object" &&
    !Array.isArray(r.valores_por_tenda)
      ? (r.valores_por_tenda as Record<string, unknown>)
      : {};
  const valoresPorTenda: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawMap)) {
    const num = Number(v);
    if (!Number.isNaN(num)) valoresPorTenda[k] = num;
  }
  return {
    id: r.id,
    nome: r.nome,
    telefone: r.telefone ?? "",
    cargo: r.cargo ?? "",
    pix: r.pix ?? "",
    tipoPagamento: (r.tipo_pagamento === "por_tenda"
      ? "por_tenda"
      : "mensal") as EmployeePaymentType,
    salarioMensal: Number(r.salario_mensal) || 0,
    diaPagamento: Number(r.dia_pagamento) || 5,
    valoresPorTenda,
    valorPadraoTenda: Number(r.valor_padrao_tenda) || 0,
    ativo: r.ativo ?? true,
    criadoEm: r.created_at,
  };
};

const toEmployeePayment = (r: EmployeePaymentRow): EmployeePaymentRecord => ({
  id: r.id,
  employeeId: r.employee_id,
  tipo: r.tipo === "mensal" ? "mensal" : "montagem",
  competencia: r.competencia ?? "",
  data: r.data ?? "",
  rentalId: r.rental_id ?? null,
  descricao: r.descricao ?? "",
  itens: Array.isArray(r.itens) ? (r.itens as AssemblyItem[]) : [],
  quantidadeTendas: Number(r.quantidade_tendas) || 0,
  valor: Number(r.valor) || 0,
  pago: Boolean(r.pago),
  pagoEm: r.pago_em ?? null,
  criadoEm: r.created_at,
});

type StoreValue = LocalState & {
  tents: Tent[];
  rentals: Rental[];
  employees: Employee[];
  employeePayments: EmployeePaymentRecord[];
  whatsapp: string;
  carregando: boolean;
  /** Quantidade já comprometida (pedidos pendentes + alugados) por tenda. */
  reservadas: (tentId: string) => number;
  /** Estoque livre agora, considerando pedidos e o carrinho atual. */
  disponiveis: (tent: Tent) => number;
  /** Calcula o valor de 1 unidade de tenda para X diárias (2ª+ diária com 50% OFF). */
  calcularValorTenda: (precoDiaria: number, dias: number) => number;
  /** Calcula o subtotal de um item do carrinho para X diárias. */
  calcularSubtotal: (item: CartItem, dias: number) => number;
  /** Calcula o resumo completo e totalizador do carrinho atual para X diárias. */
  calcularResumo: (dias: number) => ResumoCalculoCarrinho;
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
  saveEmployee: (emp: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addEmployeePayment: (record: NewEmployeePaymentRecord) => Promise<void>;
  addEmployeePaymentsBatch: (records: NewEmployeePaymentRecord[]) => Promise<void>;
  toggleEmployeePaymentPaid: (id: string) => Promise<void>;
  payAllPendingForEmployee: (employeeId: string, competencia?: string) => Promise<void>;
  deleteEmployeePayment: (id: string) => Promise<void>;
  upsertMonthlySalaryPayment: (
    employee: Employee,
    competencia: string,
    pago: boolean,
    valorCustom?: number,
  ) => Promise<void>;
  setWhatsapp: (n: string) => Promise<void>;
  setIsAdmin: (v: boolean) => void;
  recarregar: () => Promise<void>;
};

const Ctx = createContext<StoreValue | null>(null);

export function TendasProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalState>(localInitial);
  const [tents, setTents] = useState<Tent[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePayments, setEmployeePayments] = useState<EmployeePaymentRecord[]>([]);
  const [whatsapp, setWhatsappState] = useState("5511999999999");
  const [carregando, setCarregando] = useState(true);
  /** null = not checked yet, true = dedicated tables exist, false = use settings row fallback */
  const useDedicatedEmployeeTablesRef = useRef<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setLocal({ ...localInitial, ...(JSON.parse(raw) as LocalState) });
    } catch {
      /* ignore */
    }
    try {
      const cached = localStorage.getItem(EMPLOYEES_LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as FallbackPayrollPayload;
        if (Array.isArray(parsed.employees)) setEmployees(parsed.employees);
        if (Array.isArray(parsed.employeePayments)) setEmployeePayments(parsed.employeePayments);
      }
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

  const persistirFallback = useCallback(
    async (nextEmployees: Employee[], nextPayments: EmployeePaymentRecord[]) => {
      setEmployees(nextEmployees);
      setEmployeePayments(nextPayments);
      const payload: FallbackPayrollPayload = {
        employees: nextEmployees,
        employeePayments: nextPayments,
      };
      try {
        localStorage.setItem(EMPLOYEES_LOCAL_CACHE_KEY, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      const { error } = await supabase.from("settings").upsert({
        id: EMPLOYEES_SETTINGS_KEY,
        whatsapp: JSON.stringify(payload),
      });
      if (error) {
        console.error("[Payroll] Erro ao salvar no banco:", error);
        toast.error("Erro ao sincronizar dados de funcionários com o banco.");
      }
    },
    [],
  );

  const carregarFuncionarios = useCallback(async () => {
    if (useDedicatedEmployeeTablesRef.current !== false) {
      const [empRes, payRes] = await Promise.all([
        supabase.from("employees").select("*").order("created_at", { ascending: true }),
        supabase.from("employee_payments").select("*").order("created_at", { ascending: false }),
      ]);

      if (!empRes.error && !payRes.error) {
        useDedicatedEmployeeTablesRef.current = true;
        const emps = (empRes.data as EmployeeRow[]).map(toEmployee);
        const pays = (payRes.data as EmployeePaymentRow[]).map(toEmployeePayment);
        setEmployees(emps);
        setEmployeePayments(pays);
        try {
          localStorage.setItem(
            EMPLOYEES_LOCAL_CACHE_KEY,
            JSON.stringify({ employees: emps, employeePayments: pays }),
          );
        } catch {
          /* ignore */
        }
        return;
      }
      useDedicatedEmployeeTablesRef.current = false;
    }

    const { data, error } = await supabase
      .from("settings")
      .select("whatsapp")
      .eq("id", EMPLOYEES_SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.whatsapp) {
      try {
        const parsed = JSON.parse(data.whatsapp) as FallbackPayrollPayload;
        const emps = Array.isArray(parsed.employees) ? parsed.employees : [];
        const pays = Array.isArray(parsed.employeePayments) ? parsed.employeePayments : [];
        setEmployees(emps);
        setEmployeePayments(pays);
        localStorage.setItem(
          EMPLOYEES_LOCAL_CACHE_KEY,
          JSON.stringify({ employees: emps, employeePayments: pays }),
        );
      } catch {
        /* ignore malformed json */
      }
    }
  }, []);

  const recarregar = useCallback(async () => {
    const [tentRes, rentalRes, settingsRes] = await Promise.all([
      supabase.from("tents").select("*").order("created_at", { ascending: true }),
      supabase.from("rentals").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("whatsapp").eq("id", "default").maybeSingle(),
      carregarFuncionarios(),
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
  }, [carregarFuncionarios]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
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
      employees,
      employeePayments,
      whatsapp,
      carregando,
      reservadas,
      disponiveis,
      calcularValorTenda: calcularValorTendaPorDias,
      calcularSubtotal: calcularSubtotalItem,
      calcularResumo: (dias: number) => calcularResumoCarrinho(local.cart, dias),

      addToCart: (tent, quantidade = 1) =>
        patchLocal((s) => {
          const atual = s.cart.find((i) => i.tentId === tent.id);
          const livre = Math.max(0, tent.estoque - (reservadasMap[tent.id] ?? 0));
          const nova = Math.min(livre, (atual?.quantidade ?? 0) + Math.max(1, quantidade));
          if (nova <= 0) return {};
          return {
            cart: atual
              ? s.cart.map((i) =>
                  i.tentId === tent.id ? { ...i, quantidade: nova, isTent: true } : i,
                )
              : [
                  ...s.cart,
                  {
                    tentId: tent.id,
                    nome: tent.nome,
                    diaria: tent.diaria,
                    quantidade: nova,
                    isTent: true,
                  },
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
        const { error } = await supabase.from("rentals").update({ pago: !atual.pago }).eq("id", id);
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

      saveEmployee: async (emp) => {
        if (useDedicatedEmployeeTablesRef.current === true) {
          const payload = {
            nome: emp.nome,
            telefone: emp.telefone,
            cargo: emp.cargo,
            pix: emp.pix,
            tipo_pagamento: emp.tipoPagamento,
            salario_mensal: emp.salarioMensal,
            dia_pagamento: emp.diaPagamento,
            valores_por_tenda: emp.valoresPorTenda,
            valor_padrao_tenda: emp.valorPadraoTenda,
            ativo: emp.ativo,
          };
          const { error } = emp.id
            ? await supabase.from("employees").update(payload).eq("id", emp.id)
            : await supabase.from("employees").insert(payload);
          if (error) {
            toast.error("Erro ao salvar o funcionário.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const isEdit = Boolean(emp.id);
        const novoEmp: Employee = {
          ...emp,
          id: emp.id || gerarId(),
          criadoEm: emp.criadoEm || new Date().toISOString(),
        };
        const nextEmployees = isEdit
          ? employees.map((e) => (e.id === emp.id ? novoEmp : e))
          : [...employees, novoEmp];
        await persistirFallback(nextEmployees, employeePayments);
      },

      deleteEmployee: async (id) => {
        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase.from("employees").delete().eq("id", id);
          if (error) {
            toast.error("Erro ao remover o funcionário.");
            return;
          }
          await carregarFuncionarios();
          return;
        }
        const nextEmployees = employees.filter((e) => e.id !== id);
        const nextPayments = employeePayments.filter((p) => p.employeeId !== id);
        await persistirFallback(nextEmployees, nextPayments);
      },

      addEmployeePayment: async (record) => {
        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase.from("employee_payments").insert({
            employee_id: record.employeeId,
            tipo: record.tipo,
            competencia: record.competencia,
            data: record.data || null,
            rental_id: record.rentalId || null,
            descricao: record.descricao,
            itens: record.itens,
            quantidade_tendas: record.quantidadeTendas,
            valor: record.valor,
            pago: record.pago,
            pago_em: record.pago ? record.pagoEm || new Date().toISOString() : null,
          });
          if (error) {
            toast.error("Erro ao registrar o lançamento.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const novo: EmployeePaymentRecord = {
          ...record,
          id: gerarId(),
          pagoEm: record.pago ? record.pagoEm || new Date().toISOString() : null,
          criadoEm: new Date().toISOString(),
        };
        await persistirFallback(employees, [novo, ...employeePayments]);
      },

      addEmployeePaymentsBatch: async (records) => {
        if (records.length === 0) return;
        if (useDedicatedEmployeeTablesRef.current === true) {
          const rows = records.map((record) => ({
            employee_id: record.employeeId,
            tipo: record.tipo,
            competencia: record.competencia,
            data: record.data || null,
            rental_id: record.rentalId || null,
            descricao: record.descricao,
            itens: record.itens,
            quantidade_tendas: record.quantidadeTendas,
            valor: record.valor,
            pago: record.pago,
            pago_em: record.pago ? record.pagoEm || new Date().toISOString() : null,
          }));
          const { error } = await supabase.from("employee_payments").insert(rows);
          if (error) {
            toast.error("Erro ao registrar os lançamentos.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const now = new Date().toISOString();
        const novos: EmployeePaymentRecord[] = records.map((record) => ({
          ...record,
          id: gerarId(),
          pagoEm: record.pago ? record.pagoEm || now : null,
          criadoEm: now,
        }));
        await persistirFallback(employees, [...novos, ...employeePayments]);
      },

      toggleEmployeePaymentPaid: async (id) => {
        const atual = employeePayments.find((p) => p.id === id);
        if (!atual) return;
        const novoPago = !atual.pago;
        const novoPagoEm = novoPago ? new Date().toISOString() : null;

        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase
            .from("employee_payments")
            .update({ pago: novoPago, pago_em: novoPagoEm })
            .eq("id", id);
          if (error) {
            toast.error("Erro ao atualizar pagamento.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const nextPayments = employeePayments.map((p) =>
          p.id === id ? { ...p, pago: novoPago, pagoEm: novoPagoEm } : p,
        );
        await persistirFallback(employees, nextPayments);
      },

      payAllPendingForEmployee: async (employeeId, competencia) => {
        const now = new Date().toISOString();
        const filtro = (p: EmployeePaymentRecord) =>
          p.employeeId === employeeId &&
          !p.pago &&
          (!competencia || competencia === "todas" || p.competencia === competencia);

        const pendentesIds = employeePayments.filter(filtro).map((p) => p.id);
        if (pendentesIds.length === 0) return;

        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase
            .from("employee_payments")
            .update({ pago: true, pago_em: now })
            .in("id", pendentesIds);
          if (error) {
            toast.error("Erro ao quitar pagamentos pendentes.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const nextPayments = employeePayments.map((p) =>
          filtro(p) ? { ...p, pago: true, pagoEm: now } : p,
        );
        await persistirFallback(employees, nextPayments);
      },

      deleteEmployeePayment: async (id) => {
        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase.from("employee_payments").delete().eq("id", id);
          if (error) {
            toast.error("Erro ao excluir registro de pagamento.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const nextPayments = employeePayments.filter((p) => p.id !== id);
        await persistirFallback(employees, nextPayments);
      },

      upsertMonthlySalaryPayment: async (employee, competencia, pago, valorCustom) => {
        const existente = employeePayments.find(
          (p) =>
            p.employeeId === employee.id && p.tipo === "mensal" && p.competencia === competencia,
        );
        const now = new Date().toISOString();
        const valorFinal = valorCustom ?? employee.salarioMensal;
        const dataRef = `${competencia}-${String(Math.min(28, Math.max(1, employee.diaPagamento || 5))).padStart(2, "0")}`;

        if (existente) {
          if (useDedicatedEmployeeTablesRef.current === true) {
            const { error } = await supabase
              .from("employee_payments")
              .update({
                pago,
                pago_em: pago ? now : null,
                valor: valorFinal,
              })
              .eq("id", existente.id);
            if (error) {
              toast.error("Erro ao atualizar salário mensal.");
              return;
            }
            await carregarFuncionarios();
            return;
          }

          const nextPayments = employeePayments.map((p) =>
            p.id === existente.id
              ? { ...p, pago, pagoEm: pago ? now : null, valor: valorFinal }
              : p,
          );
          await persistirFallback(employees, nextPayments);
          return;
        }

        const novoRecord: NewEmployeePaymentRecord = {
          employeeId: employee.id,
          tipo: "mensal",
          competencia,
          data: dataRef,
          rentalId: null,
          descricao: `Salário mensal (${competencia.split("-").reverse().join("/")})`,
          itens: [],
          quantidadeTendas: 0,
          valor: valorFinal,
          pago,
          pagoEm: pago ? now : null,
        };

        if (useDedicatedEmployeeTablesRef.current === true) {
          const { error } = await supabase.from("employee_payments").insert({
            employee_id: novoRecord.employeeId,
            tipo: novoRecord.tipo,
            competencia: novoRecord.competencia,
            data: novoRecord.data,
            rental_id: null,
            descricao: novoRecord.descricao,
            itens: [],
            quantidade_tendas: 0,
            valor: novoRecord.valor,
            pago: novoRecord.pago,
            pago_em: novoRecord.pagoEm ?? null,
          });
          if (error) {
            toast.error("Erro ao registrar salário mensal.");
            return;
          }
          await carregarFuncionarios();
          return;
        }

        const criado: EmployeePaymentRecord = {
          ...novoRecord,
          id: gerarId(),
          criadoEm: now,
        };
        await persistirFallback(employees, [criado, ...employeePayments]);
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
  }, [
    local,
    tents,
    rentals,
    employees,
    employeePayments,
    whatsapp,
    carregando,
    reservadasMap,
    patchLocal,
    recarregar,
    carregarFuncionarios,
    persistirFallback,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTendas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTendas deve ser usado dentro de TendasProvider");
  return ctx;
}
