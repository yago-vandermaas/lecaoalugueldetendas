import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Copy,
  Hammer,
  Link2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  brl,
  calcularMontagemFuncionario,
  EMPLOYEE_PAYMENT_TYPE_LABEL,
  type Employee,
  type EmployeePaymentRecord,
  type EmployeePaymentType,
  type NewEmployeePaymentRecord,
  type Rental,
  type Tent,
} from "@/lib/tendas-data";
import { useTendas } from "@/lib/tendas-store";

const competenciaAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatarData = (data: string) => {
  if (!data) return "—";
  const limpa = data.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpa)) {
    return limpa.split("-").reverse().join("/");
  }
  return data;
};

const formatarCompetencia = (comp: string) => {
  if (!comp || comp === "todas") return "Todos os meses";
  const [ano, mes] = comp.split("-");
  const nomes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const idx = Number(mes) - 1;
  return idx >= 0 && idx < 12 ? `${nomes[idx]}/${ano}` : `${mes}/${ano}`;
};

export function AdminFuncionarios() {
  const {
    tents,
    rentals,
    employees,
    employeePayments,
    saveEmployee,
    deleteEmployee,
    addEmployeePayment,
    addEmployeePaymentsBatch,
    toggleEmployeePaymentPaid,
    payAllPendingForEmployee,
    deleteEmployeePayment,
    upsertMonthlySalaryPayment,
  } = useTendas();

  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [filtroTipo, setFiltroTipo] = useState<"todos" | EmployeePaymentType>("todos");
  const [editandoFuncionario, setEditandoFuncionario] = useState<Employee | null>(null);
  const [montagemAvulsaPara, setMontagemAvulsaPara] = useState<{
    aberto: boolean;
    employeeId?: string | undefined;
  }>({ aberto: false });
  const [vincularLocacao, setVincularLocacao] = useState<{
    aberto: boolean;
    rentalId?: string | undefined;
    employeeId?: string | undefined;
  }>({ aberto: false });

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    const atual = competenciaAtual();
    set.add(atual);
    // Adiciona mês anterior e próximo para facilitar navegação
    const [ano, mes] = atual.split("-").map(Number);
    if (ano && mes) {
      const ant = new Date(ano, mes - 2, 1);
      const prox = new Date(ano, mes, 1);
      set.add(`${ant.getFullYear()}-${String(ant.getMonth() + 1).padStart(2, "0")}`);
      set.add(`${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}`);
    }
    for (const p of employeePayments) {
      if (p.competencia) set.add(p.competencia);
    }
    return Array.from(set).sort().reverse();
  }, [employeePayments]);

  const refMes = competencia === "todas" ? competenciaAtual() : competencia;

  // Cálculo dos indicadores de resumo
  const resumoEquipe = useMemo(() => {
    const ativos = employees.filter((e) => e.ativo);
    const mensalistas = ativos.filter((e) => e.tipoPagamento === "mensal");
    const porTenda = ativos.filter((e) => e.tipoPagamento === "por_tenda");

    const pagamentosFiltrados = employeePayments.filter(
      (p) => competencia === "todas" || p.competencia === competencia,
    );

    // Salários mensais: para cada mensalista ativo, verifica se tem registro na competência refMes
    let pendenteMensal = 0;
    let pagoMensal = 0;

    for (const emp of mensalistas) {
      const reg = employeePayments.find(
        (p) => p.employeeId === emp.id && p.tipo === "mensal" && p.competencia === refMes,
      );
      if (reg) {
        if (reg.pago) pagoMensal += reg.valor;
        else pendenteMensal += reg.valor;
      } else {
        pendenteMensal += emp.salarioMensal;
      }
    }

    // Montagens por tenda no período filtrado
    const montagens = pagamentosFiltrados.filter((p) => p.tipo === "montagem");
    const pendenteMontagens = montagens.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0);
    const pagoMontagens = montagens.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);
    const totalTendasMontadas = montagens.reduce((s, p) => s + p.quantidadeTendas, 0);

    return {
      totalFuncionarios: ativos.length,
      qtdMensalistas: mensalistas.length,
      qtdPorTenda: porTenda.length,
      totalPendente: pendenteMensal + pendenteMontagens,
      totalPago: pagoMensal + pagoMontagens,
      totalTendasMontadas,
    };
  }, [employees, employeePayments, competencia, refMes]);

  const funcionariosFiltrados = useMemo(() => {
    return employees.filter((e) =>
      filtroTipo === "todos" ? true : e.tipoPagamento === filtroTipo,
    );
  }, [employees, filtroTipo]);

  const abrirNovoFuncionario = (tipoInicial: EmployeePaymentType = "mensal") => {
    const mapaInicial: Record<string, number> = {};
    for (const t of tents) {
      mapaInicial[t.id] = 0;
    }
    setEditandoFuncionario({
      id: "",
      nome: "",
      telefone: "",
      cargo: "",
      pix: "",
      tipoPagamento: tipoInicial,
      salarioMensal: 0,
      diaPagamento: 5,
      valoresPorTenda: mapaInicial,
      valorPadraoTenda: 0,
      ativo: true,
      criadoEm: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de filtros e ações rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mês de referência</Label>
            <Select value={competencia} onValueChange={setCompetencia}>
              <SelectTrigger className="w-44" id="select-competencia-funcionarios">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os meses</SelectItem>
                {mesesDisponiveis.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatarCompetencia(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Modalidade</Label>
            <Select
              value={filtroTipo}
              onValueChange={(v) => setFiltroTipo(v as "todos" | EmployeePaymentType)}
            >
              <SelectTrigger className="w-52" id="select-filtro-modalidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as modalidades</SelectItem>
                <SelectItem value="mensal">Pagamento mensal (fixo)</SelectItem>
                <SelectItem value="por_tenda">Por tenda montada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="hero"
            id="btn-novo-funcionario"
            onClick={() => abrirNovoFuncionario("mensal")}
          >
            <UserPlus /> Cadastrar funcionário
          </Button>
          <Button
            variant="soft"
            id="btn-vincular-locacao"
            onClick={() => setVincularLocacao({ aberto: true })}
          >
            <Link2 /> Vincular locação montada
          </Button>
          <Button
            variant="outline"
            id="btn-montagem-avulsa"
            onClick={() => setMontagemAvulsaPara({ aberto: true })}
          >
            <Hammer /> Lançar montagem avulsa
          </Button>
        </div>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Equipe ativa
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {resumoEquipe.totalFuncionarios}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" /> {resumoEquipe.qtdMensalistas} mensal ·{" "}
            {resumoEquipe.qtdPorTenda} por tenda
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            A pagar (pendente)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {brl(resumoEquipe.totalPendente)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-warning-foreground" /> salários + montagens em
            aberto
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total pago ({formatarCompetencia(competencia)})
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-whatsapp">
            {brl(resumoEquipe.totalPago)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Banknote className="h-3.5 w-3.5 text-whatsapp" /> pagamentos concluídos
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Participações em tendas
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {resumoEquipe.totalTendasMontadas}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Hammer className="h-3.5 w-3.5 text-primary" /> tendas montadas lançadas
          </p>
        </div>
      </div>

      {/* Lista de funcionários */}
      {funcionariosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">Nenhum funcionário cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre seus funcionários escolhendo entre pagamento mensal fixo ou pagamento por tenda
            montada (com valor personalizado para cada tamanho de tenda).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="hero" onClick={() => abrirNovoFuncionario("mensal")}>
              <Plus /> Cadastrar funcionário mensalista
            </Button>
            <Button variant="soft" onClick={() => abrirNovoFuncionario("por_tenda")}>
              <Hammer /> Cadastrar montador por tenda
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {funcionariosFiltrados.map((emp) => (
            <FuncionarioCard
              key={emp.id}
              employee={emp}
              tents={tents}
              rentals={rentals}
              payments={employeePayments.filter((p) => p.employeeId === emp.id)}
              competencia={competencia}
              refMes={refMes}
              onEdit={() => setEditandoFuncionario(emp)}
              onDelete={() => {
                void deleteEmployee(emp.id);
                toast.success("Funcionário removido.");
              }}
              onToggleMonthlyPaid={(pago, valorCustom) => {
                void upsertMonthlySalaryPayment(emp, refMes, pago, valorCustom);
                toast.success(
                  pago
                    ? `Salário de ${emp.nome} (${formatarCompetencia(refMes)}) marcado como pago!`
                    : "Pagamento mensal reaberto.",
                );
              }}
              onAddMontagemAvulsa={() =>
                setMontagemAvulsaPara({ aberto: true, employeeId: emp.id })
              }
              onVincularLocacao={() => setVincularLocacao({ aberto: true, employeeId: emp.id })}
              onTogglePaymentPaid={(paymentId) => {
                void toggleEmployeePaymentPaid(paymentId);
              }}
              onPayAllPending={() => {
                void payAllPendingForEmployee(emp.id, competencia);
                toast.success(`Todos os pagamentos pendentes de ${emp.nome} foram quitados!`);
              }}
              onDeletePayment={(paymentId) => {
                void deleteEmployeePayment(paymentId);
                toast.success("Lançamento removido.");
              }}
            />
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Funcionário */}
      <EmployeeDialog
        employee={editandoFuncionario}
        tents={tents}
        onClose={() => setEditandoFuncionario(null)}
        onSave={(emp) => {
          void saveEmployee(emp);
          setEditandoFuncionario(null);
          toast.success("Funcionário salvo com sucesso!");
        }}
      />

      {/* Modal de Lançamento de Montagem Avulsa */}
      <MontagemAvulsaDialog
        open={montagemAvulsaPara.aberto}
        initialEmployeeId={montagemAvulsaPara.employeeId}
        employees={employees}
        tents={tents}
        defaultCompetencia={refMes}
        onClose={() => setMontagemAvulsaPara({ aberto: false })}
        onSave={(record) => {
          void addEmployeePayment(record);
          setMontagemAvulsaPara({ aberto: false });
          toast.success("Montagem registrada para o funcionário!");
        }}
      />

      {/* Modal de Vínculo de Funcionários a uma Locação */}
      <VincularLocacaoDialog
        open={vincularLocacao.aberto}
        initialRentalId={vincularLocacao.rentalId}
        initialEmployeeId={vincularLocacao.employeeId}
        rentals={rentals}
        employees={employees}
        employeePayments={employeePayments}
        tents={tents}
        onClose={() => setVincularLocacao({ aberto: false })}
        onSaveBatch={(records) => {
          void addEmployeePaymentsBatch(records);
          setVincularLocacao({ aberto: false });
          toast.success(
            records.length === 1
              ? "Montagem vinculada ao funcionário!"
              : `Montagem vinculada a ${records.length} funcionários!`,
          );
        }}
      />
    </div>
  );
}

function FuncionarioCard({
  employee,
  tents,
  rentals,
  payments,
  competencia,
  refMes,
  onEdit,
  onDelete,
  onToggleMonthlyPaid,
  onAddMontagemAvulsa,
  onVincularLocacao,
  onTogglePaymentPaid,
  onPayAllPending,
  onDeletePayment,
}: {
  employee: Employee;
  tents: Tent[];
  rentals: Rental[];
  payments: EmployeePaymentRecord[];
  competencia: string;
  refMes: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleMonthlyPaid: (pago: boolean, valorCustom?: number) => void;
  onAddMontagemAvulsa: () => void;
  onVincularLocacao: () => void;
  onTogglePaymentPaid: (id: string) => void;
  onPayAllPending: () => void;
  onDeletePayment: (id: string) => void;
}) {
  const [valorMensalEdit, setValorMensalEdit] = useState<string>("");

  const registroMensalAtual = useMemo(
    () => payments.find((p) => p.tipo === "mensal" && p.competencia === refMes),
    [payments, refMes],
  );

  const montagensPeriodo = useMemo(
    () =>
      payments.filter(
        (p) => p.tipo === "montagem" && (competencia === "todas" || p.competencia === competencia),
      ),
    [payments, competencia],
  );

  const historicoMensal = useMemo(() => payments.filter((p) => p.tipo === "mensal"), [payments]);

  const totalPendentePorTenda = montagensPeriodo
    .filter((p) => !p.pago)
    .reduce((s, p) => s + p.valor, 0);
  const totalPagoPorTenda = montagensPeriodo.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);
  const qtdTendasPeriodo = montagensPeriodo.reduce((s, p) => s + p.quantidadeTendas, 0);

  const mensalPago = Boolean(registroMensalAtual?.pago);
  const valorMensalExibido = registroMensalAtual?.valor ?? employee.salarioMensal;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      {/* Cabeçalho do funcionário */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold">{employee.nome}</h3>
            <Badge
              className={
                employee.tipoPagamento === "mensal"
                  ? "border-0 bg-primary text-primary-foreground"
                  : "border-0 bg-secondary text-secondary-foreground"
              }
            >
              {EMPLOYEE_PAYMENT_TYPE_LABEL[employee.tipoPagamento]}
            </Badge>
            {!employee.ativo && (
              <Badge variant="outline" className="text-muted-foreground">
                Inativo
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {employee.cargo && <span>Cargo: {employee.cargo}</span>}
            {employee.telefone && <span>Tel: {employee.telefone}</span>}
            {employee.pix && (
              <span className="inline-flex items-center gap-1">
                PIX: <strong className="text-foreground">{employee.pix}</strong>
                <button
                  type="button"
                  className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground"
                  title="Copiar chave PIX"
                  onClick={() => {
                    void navigator.clipboard?.writeText(employee.pix);
                    toast.success("Chave PIX copiada!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="soft" size="sm" onClick={onEdit}>
            <Pencil /> Editar
          </Button>
          <Button variant="ghost" size="icon" aria-label="Remover funcionário" onClick={onDelete}>
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </div>

      {/* Conteúdo específico para MENSALISTA */}
      {employee.tipoPagamento === "mensal" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Salário mensal fixo · Competência {formatarCompetencia(refMes)}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-primary">
                  {brl(valorMensalExibido)}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Vencimento todo dia {employee.diaPagamento || 5})
                </span>
              </div>
              {registroMensalAtual?.pago && registroMensalAtual.pagoEm && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pago em {formatarData(registroMensalAtual.pagoEm)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  mensalPago
                    ? "border-0 bg-whatsapp text-whatsapp-foreground"
                    : "border-0 bg-warning text-warning-foreground"
                }
              >
                {mensalPago
                  ? `Salário pago (${formatarCompetencia(refMes)})`
                  : `Pagamento pendente (${formatarCompetencia(refMes)})`}
              </Badge>

              {!mensalPago && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    placeholder={String(valorMensalExibido)}
                    value={valorMensalEdit}
                    onChange={(e) => setValorMensalEdit(e.target.value)}
                    className="h-9 w-28 text-sm"
                    aria-label="Ajustar valor do mês"
                  />
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => {
                      const custom = valorMensalEdit.trim() ? Number(valorMensalEdit) : undefined;
                      onToggleMonthlyPaid(true, custom);
                      setValorMensalEdit("");
                    }}
                  >
                    <CheckCircle2 /> Confirmar pagamento mensal
                  </Button>
                </div>
              )}

              {mensalPago && (
                <Button variant="soft" size="sm" onClick={() => onToggleMonthlyPaid(false)}>
                  Reabrir pagamento
                </Button>
              )}
            </div>
          </div>

          {historicoMensal.length > 0 && (
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Histórico de salários registrados
              </p>
              <div className="flex flex-wrap gap-2">
                {historicoMensal.map((h) => (
                  <div
                    key={h.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{formatarCompetencia(h.competencia)}</span>
                    <span>{brl(h.valor)}</span>
                    <Badge
                      className={
                        h.pago
                          ? "border-0 bg-whatsapp px-1.5 py-0 text-[10px] text-whatsapp-foreground"
                          : "border-0 bg-warning px-1.5 py-0 text-[10px] text-warning-foreground"
                      }
                    >
                      {h.pago ? "Pago" : "Pendente"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => onDeletePayment(h.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remover registro"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Conteúdo específico para POR TENDA MONTADA */
        <div className="mt-4 space-y-4">
          {/* Tabela compacta de valores por tamanho/modelo de tenda deste funcionário */}
          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tabela de ganhos por tenda montada (por modelo / tamanho)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tents.map((t) => {
                const val = employee.valoresPorTenda?.[t.id] ?? employee.valorPadraoTenda ?? 0;
                return (
                  <div
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs"
                  >
                    <span className="font-medium">{t.nome}</span>
                    <span className="text-muted-foreground">({t.dimensoes}):</span>
                    <strong className="text-primary">{brl(val)}</strong>
                  </div>
                );
              })}
              {employee.valorPadraoTenda > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                  <span>Valor padrão (outros modelos):</span>
                  <strong className="text-foreground">{brl(employee.valorPadraoTenda)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Resumo + botões de lançamento da modalidade por tenda */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tendas montadas: </span>
                <strong className="font-semibold">{qtdTendasPeriodo}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Pendente a pagar: </span>
                <strong className="font-display text-base font-bold text-primary">
                  {brl(totalPendentePorTenda)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Já pago: </span>
                <strong className="font-semibold text-whatsapp">{brl(totalPagoPorTenda)}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="soft" size="sm" onClick={onVincularLocacao}>
                <Link2 /> Vincular locação
              </Button>
              <Button variant="outline" size="sm" onClick={onAddMontagemAvulsa}>
                <Plus /> Montagem avulsa
              </Button>
              {totalPendentePorTenda > 0 && (
                <Button variant="hero" size="sm" onClick={onPayAllPending}>
                  <CheckCircle2 /> Pagar pendentes ({brl(totalPendentePorTenda)})
                </Button>
              )}
            </div>
          </div>

          {/* Lista de montagens lançadas para este funcionário */}
          {montagensPeriodo.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma tenda montada registrada para este funcionário neste período.
            </p>
          ) : (
            <div className="space-y-2">
              {montagensPeriodo.map((m) => {
                const locacaoVinculada = m.rentalId
                  ? rentals.find((r) => r.id === m.rentalId)
                  : undefined;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{m.descricao || "Montagem de tendas"}</span>
                        {locacaoVinculada && (
                          <Badge variant="outline" className="text-[11px]">
                            Pedido: {locacaoVinculada.cliente}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Data: {formatarData(m.data)}
                        </span>
                      </div>
                      {m.itens.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {m.itens
                            .map(
                              (i) =>
                                `${i.quantidade}x ${i.nome}${i.dimensoes ? ` (${i.dimensoes})` : ""} a ${brl(i.valorUnitario)}/un`,
                            )
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-primary">{brl(m.valor)}</span>
                      <Badge
                        className={
                          m.pago
                            ? "border-0 bg-whatsapp text-whatsapp-foreground"
                            : "border-0 bg-warning text-warning-foreground"
                        }
                      >
                        {m.pago ? "Pago" : "Pendente"}
                      </Badge>
                      <Button variant="soft" size="sm" onClick={() => onTogglePaymentPaid(m.id)}>
                        <CheckCircle2 /> {m.pago ? "Reabrir" : "Marcar pago"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir lançamento"
                        onClick={() => onDeletePayment(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Componente compacto exibido dentro de cada card na aba Locações
 * para vincular rapidamente os funcionários que montaram as tendas daquela locação.
 */
export function EquipeMontagemLocacao({ rental }: { rental: Rental }) {
  const {
    employees,
    employeePayments,
    tents,
    addEmployeePaymentsBatch,
    toggleEmployeePaymentPaid,
  } = useTendas();
  const [dialogAberto, setDialogAberto] = useState(false);

  const lancamentosLocacao = useMemo(
    () => employeePayments.filter((p) => p.rentalId === rental.id && p.tipo === "montagem"),
    [employeePayments, rental.id],
  );

  return (
    <div className="mt-2 w-full rounded-xl border border-border/70 bg-background/50 p-2.5 text-left text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground">
          Montadores ({lancamentosLocacao.length})
        </span>
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => setDialogAberto(true)}
        >
          <Users className="h-3.5 w-3.5" /> Vincular montadores
        </Button>
      </div>

      {lancamentosLocacao.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {lancamentosLocacao.map((l) => {
            const emp = employees.find((e) => e.id === l.employeeId);
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-2 py-1"
              >
                <span>
                  <strong>{emp?.nome ?? "Funcionário"}</strong> · {brl(l.valor)}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleEmployeePaymentPaid(l.id)}
                  className={
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold " +
                    (l.pago
                      ? "bg-whatsapp text-whatsapp-foreground"
                      : "bg-warning text-warning-foreground")
                  }
                >
                  {l.pago ? "Pago ✓" : "Pendente (clicar p/ pagar)"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <VincularLocacaoDialog
        open={dialogAberto}
        initialRentalId={rental.id}
        rentals={[rental]}
        employees={employees}
        employeePayments={employeePayments}
        tents={tents}
        onClose={() => setDialogAberto(false)}
        onSaveBatch={(records) => {
          void addEmployeePaymentsBatch(records);
          setDialogAberto(false);
          toast.success("Montadores vinculados à locação!");
        }}
      />
    </div>
  );
}

function EmployeeDialog({
  employee,
  tents,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  tents: Tent[];
  onClose: () => void;
  onSave: (e: Employee) => void;
}) {
  const [draft, setDraft] = useState<Employee | null>(employee);

  // Sincroniza quando muda o funcionário selecionado
  const atual =
    draft && employee && draft.id === employee.id && draft.criadoEm === employee.criadoEm
      ? draft
      : employee;

  if (!atual) return null;

  const setCampo = <K extends keyof Employee>(campo: K, valor: Employee[K]) => {
    setDraft({ ...atual, [campo]: valor });
  };

  const setValorTenda = (tentId: string, valor: number) => {
    setDraft({
      ...atual,
      valoresPorTenda: {
        ...atual.valoresPorTenda,
        [tentId]: Math.max(0, valor),
      },
    });
  };

  return (
    <Dialog open={!!employee} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {atual.id ? "Editar funcionário" : "Cadastrar funcionário"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!atual.nome.trim()) {
              toast.error("Informe o nome do funcionário.");
              return;
            }
            if (atual.tipoPagamento === "mensal" && atual.salarioMensal <= 0) {
              toast.error("Informe o valor do salário mensal.");
              return;
            }
            onSave({
              ...atual,
              nome: atual.nome.trim(),
              telefone: atual.telefone.trim(),
              cargo: atual.cargo.trim(),
              pix: atual.pix.trim(),
            });
            setDraft(null);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="emp-nome">Nome do funcionário *</Label>
            <Input
              id="emp-nome"
              value={atual.nome}
              placeholder="Ex: João da Silva"
              onChange={(e) => setCampo("nome", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-cargo">Função / Cargo</Label>
              <Input
                id="emp-cargo"
                value={atual.cargo}
                placeholder="Ex: Montador, Motorista"
                onChange={(e) => setCampo("cargo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-telefone">Telefone / WhatsApp</Label>
              <Input
                id="emp-telefone"
                value={atual.telefone}
                placeholder="(11) 99999-9999"
                onChange={(e) => setCampo("telefone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-pix">Chave PIX (opcional)</Label>
            <Input
              id="emp-pix"
              value={atual.pix}
              placeholder="CPF, telefone, e-mail ou chave aleatória"
              onChange={(e) => setCampo("pix", e.target.value)}
            />
          </div>

          {/* Seleção da opção de pagamento (Mensal OU Por Tenda Montada) */}
          <div className="space-y-2">
            <Label>Opção de pagamento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="opt-pagamento-mensal"
                onClick={() => setCampo("tipoPagamento", "mensal")}
                className={
                  "flex flex-col items-start rounded-xl border p-3 text-left transition " +
                  (atual.tipoPagamento === "mensal"
                    ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40")
                }
              >
                <span className="font-display text-sm font-bold text-foreground">
                  Pagamento Mensal
                </span>
                <span className="mt-0.5 text-xs">Salário fixo todo mês</span>
              </button>

              <button
                type="button"
                id="opt-pagamento-por-tenda"
                onClick={() => setCampo("tipoPagamento", "por_tenda")}
                className={
                  "flex flex-col items-start rounded-xl border p-3 text-left transition " +
                  (atual.tipoPagamento === "por_tenda"
                    ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40")
                }
              >
                <span className="font-display text-sm font-bold text-foreground">
                  Por Tenda Montada
                </span>
                <span className="mt-0.5 text-xs">Valor por tamanho/modelo montado</span>
              </button>
            </div>
          </div>

          {atual.tipoPagamento === "mensal" ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-salario">Salário mensal (R$) *</Label>
                <Input
                  id="emp-salario"
                  type="number"
                  min={0}
                  step="0.01"
                  value={atual.salarioMensal || ""}
                  placeholder="Ex: 2200"
                  onChange={(e) => setCampo("salarioMensal", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-dia-pag">Dia de pagamento</Label>
                <Input
                  id="emp-dia-pag"
                  type="number"
                  min={1}
                  max={31}
                  value={atual.diaPagamento || 5}
                  onChange={(e) => setCampo("diaPagamento", Number(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <div>
                <p className="text-sm font-semibold">
                  Valor pago por tenda montada (por modelo / tamanho)
                </p>
                <p className="text-xs text-muted-foreground">
                  Defina quanto este funcionário recebe por unidade montada de cada modelo de tenda:
                </p>
              </div>

              <div className="space-y-2">
                {tents.map((t) => {
                  const valorAtual = atual.valoresPorTenda?.[t.id] ?? 0;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho: {t.dimensoes} · Tipo: {t.tipo}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-9 w-28"
                          value={valorAtual || ""}
                          placeholder="0,00"
                          aria-label={`Valor para ${t.nome}`}
                          onChange={(e) => setValorTenda(t.id, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 border-t border-border/60 pt-2">
                <Label htmlFor="emp-valor-padrao" className="text-xs">
                  Valor padrão para outros tamanhos / novas tendas (R$)
                </Label>
                <Input
                  id="emp-valor-padrao"
                  type="number"
                  min={0}
                  step="0.01"
                  value={atual.valorPadraoTenda || ""}
                  placeholder="Ex: 50"
                  onChange={(e) => setCampo("valorPadraoTenda", Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={atual.ativo}
              onChange={(e) => setCampo("ativo", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Funcionário ativo na equipe
          </label>

          <Button variant="hero" size="lg" className="w-full" type="submit">
            Salvar funcionário
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MontagemAvulsaDialog({
  open,
  initialEmployeeId,
  employees,
  tents,
  defaultCompetencia,
  onClose,
  onSave,
}: {
  open: boolean;
  initialEmployeeId?: string | undefined;
  employees: Employee[];
  tents: Tent[];
  defaultCompetencia: string;
  onClose: () => void;
  onSave: (r: NewEmployeePaymentRecord) => void;
}) {
  const porTendaEmployees = useMemo(
    () => employees.filter((e) => e.tipoPagamento === "por_tenda"),
    [employees],
  );
  const listaOpcoes = porTendaEmployees.length > 0 ? porTendaEmployees : employees;

  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId ?? "");
  const [data, setData] = useState<string>(hojeISO());
  const [descricao, setDescricao] = useState<string>("");
  const [itens, setItens] = useState<{ tentId: string; quantidade: number }[]>([
    { tentId: tents[0]?.id ?? "", quantidade: 1 },
  ]);
  const [valorManual, setValorManual] = useState<string>("");
  const [pago, setPago] = useState<boolean>(false);

  const empSelecionado =
    employees.find((e) => e.id === (employeeId || initialEmployeeId)) ?? listaOpcoes[0];

  const calculo = useMemo(() => {
    if (!empSelecionado) {
      return { itens: [], quantidadeTendas: 0, valorTotal: 0 };
    }
    return calcularMontagemFuncionario(
      empSelecionado,
      itens.filter((i) => i.tentId && i.quantidade > 0),
      tents,
    );
  }, [empSelecionado, itens, tents]);

  const valorFinal = valorManual.trim() ? Number(valorManual) || 0 : calculo.valorTotal;

  const reset = () => {
    setEmployeeId("");
    setData(hojeISO());
    setDescricao("");
    setItens([{ tentId: tents[0]?.id ?? "", quantidade: 1 }]);
    setValorManual("");
    setPago(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Lançar montagem avulsa de tenda</DialogTitle>
        </DialogHeader>

        {listaOpcoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre primeiro um funcionário para registrar uma montagem.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!empSelecionado) {
                toast.error("Selecione o funcionário.");
                return;
              }
              if (calculo.quantidadeTendas <= 0 && !valorManual.trim()) {
                toast.error("Adicione ao menos uma tenda montada.");
                return;
              }
              const comp = data && data.length >= 7 ? data.slice(0, 7) : defaultCompetencia;
              onSave({
                employeeId: empSelecionado.id,
                tipo: "montagem",
                competencia: comp,
                data: data || hojeISO(),
                rentalId: null,
                descricao: descricao.trim() || "Montagem avulsa",
                itens: calculo.itens,
                quantidadeTendas: calculo.quantidadeTendas,
                valor: valorFinal,
                pago,
                pagoEm: pago ? new Date().toISOString() : null,
              });
              reset();
            }}
          >
            <div className="space-y-1.5">
              <Label>Funcionário</Label>
              <Select value={empSelecionado?.id ?? ""} onValueChange={(v) => setEmployeeId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {listaOpcoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({EMPLOYEE_PAYMENT_TYPE_LABEL[e.tipoPagamento]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ma-data">Data da montagem</Label>
                <Input
                  id="ma-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ma-desc">Cliente / Local (opcional)</Label>
                <Input
                  id="ma-desc"
                  value={descricao}
                  placeholder="Ex: Evento Sítio São José"
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tendas montadas pelo funcionário</Label>
              {itens.map((item, idx) => {
                const tent = tents.find((t) => t.id === item.tentId);
                const unitVal =
                  empSelecionado && item.tentId
                    ? (empSelecionado.valoresPorTenda?.[item.tentId] ??
                      empSelecionado.valorPadraoTenda ??
                      0)
                    : 0;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={item.tentId}
                      onValueChange={(v) =>
                        setItens((arr) => arr.map((x, i) => (i === idx ? { ...x, tentId: v } : x)))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Modelo / tamanho da tenda" />
                      </SelectTrigger>
                      <SelectContent>
                        {tents.map((t) => {
                          const vUnit =
                            empSelecionado?.valoresPorTenda?.[t.id] ??
                            empSelecionado?.valorPadraoTenda ??
                            0;
                          return (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome} ({t.dimensoes}) — {brl(vUnit)}/un
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={item.quantidade}
                      aria-label={`Quantidade da tenda ${tent?.nome ?? idx + 1}`}
                      onChange={(e) =>
                        setItens((arr) =>
                          arr.map((x, i) =>
                            i === idx
                              ? { ...x, quantidade: Math.max(1, Number(e.target.value)) }
                              : x,
                          ),
                        )
                      }
                    />
                    <span className="w-20 text-right text-xs font-medium text-muted-foreground">
                      {brl(unitVal * item.quantidade)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover tenda"
                      onClick={() => setItens((arr) => arr.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() =>
                  setItens((arr) => [...arr, { tentId: tents[0]?.id ?? "", quantidade: 1 }])
                }
              >
                <Plus /> Adicionar outro tamanho de tenda
              </Button>
            </div>

            <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/30 p-3">
              <Label htmlFor="ma-valor">Valor total a pagar ao funcionário (R$)</Label>
              <Input
                id="ma-valor"
                type="number"
                min={0}
                step="0.01"
                value={valorManual}
                placeholder={String(calculo.valorTotal)}
                onChange={(e) => setValorManual(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente pela tabela do funcionário:{" "}
                <strong className="text-primary">{brl(calculo.valorTotal)}</strong> (
                {calculo.quantidadeTendas} tenda(s)) — edite caso queira alterar o valor.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pago}
                onChange={(e) => setPago(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Já foi pago ao funcionário
            </label>

            <Button variant="hero" size="lg" className="w-full" type="submit">
              Registrar montagem
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VincularLocacaoDialog({
  open,
  initialRentalId,
  initialEmployeeId,
  rentals,
  employees,
  employeePayments,
  tents,
  onClose,
  onSaveBatch,
}: {
  open: boolean;
  initialRentalId?: string | undefined;
  initialEmployeeId?: string | undefined;
  rentals: Rental[];
  employees: Employee[];
  employeePayments: EmployeePaymentRecord[];
  tents: Tent[];
  onClose: () => void;
  onSaveBatch: (records: NewEmployeePaymentRecord[]) => void;
}) {
  const locacoesAtivas = useMemo(
    () => rentals.filter((r) => r.situacao !== "desistencia"),
    [rentals],
  );

  const [rentalId, setRentalId] = useState<string>(initialRentalId ?? "");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [valoresCustom, setValoresCustom] = useState<Record<string, string>>({});
  const [pago, setPago] = useState<boolean>(false);

  const locacaoSelecionada =
    locacoesAtivas.find((r) => r.id === (rentalId || initialRentalId)) ?? locacoesAtivas[0];

  const candidatos = useMemo(() => {
    const porTenda = employees.filter((e) => e.tipoPagamento === "por_tenda" && e.ativo);
    return porTenda.length > 0 ? porTenda : employees.filter((e) => e.ativo);
  }, [employees]);

  const estaSelecionado = (empId: string) => {
    if (empId in selecionados) return selecionados[empId];
    if (initialEmployeeId && empId === initialEmployeeId) return true;
    return false;
  };

  const reset = () => {
    setRentalId("");
    setSelecionados({});
    setValoresCustom({});
    setPago(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            Vincular funcionários à montagem de locação
          </DialogTitle>
        </DialogHeader>

        {locacoesAtivas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma locação ativa encontrada para vincular.
          </p>
        ) : candidatos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre primeiro um funcionário (modalidade "Por tenda montada") na aba Funcionários.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!locacaoSelecionada) {
                toast.error("Selecione uma locação.");
                return;
              }
              const escolhidos = candidatos.filter((c) => estaSelecionado(c.id));
              if (escolhidos.length === 0) {
                toast.error("Selecione ao menos um funcionário que participou da montagem.");
                return;
              }

              const dataRef = locacaoSelecionada.inicio || hojeISO();
              const comp = dataRef.length >= 7 ? dataRef.slice(0, 7) : competenciaAtual();

              const novos: NewEmployeePaymentRecord[] = escolhidos.map((emp) => {
                const calc = calcularMontagemFuncionario(emp, locacaoSelecionada.itens, tents);
                const customStr = valoresCustom[emp.id]?.trim();
                const valorFinal = customStr ? Number(customStr) || 0 : calc.valorTotal;
                return {
                  employeeId: emp.id,
                  tipo: "montagem",
                  competencia: comp,
                  data: dataRef,
                  rentalId: locacaoSelecionada.id,
                  descricao: `${locacaoSelecionada.cliente}${locacaoSelecionada.local ? ` — ${locacaoSelecionada.local}` : ""}`,
                  itens: calc.itens,
                  quantidadeTendas: calc.quantidadeTendas,
                  valor: valorFinal,
                  pago,
                  pagoEm: pago ? new Date().toISOString() : null,
                };
              });

              onSaveBatch(novos);
              reset();
            }}
          >
            {!initialRentalId && (
              <div className="space-y-1.5">
                <Label>Escolha a locação / pedido</Label>
                <Select value={locacaoSelecionada?.id ?? ""} onValueChange={(v) => setRentalId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a locação" />
                  </SelectTrigger>
                  <SelectContent>
                    {locacoesAtivas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.cliente} ({formatarData(r.inicio)}) —{" "}
                        {r.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {locacaoSelecionada && (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  {locacaoSelecionada.cliente}{" "}
                  {locacaoSelecionada.local ? `· ${locacaoSelecionada.local}` : ""}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Tendas do pedido:{" "}
                  {locacaoSelecionada.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Selecione quais funcionários montaram esta locação</Label>
              <div className="space-y-2">
                {candidatos.map((emp) => {
                  const marcado = estaSelecionado(emp.id);
                  const calc = locacaoSelecionada
                    ? calcularMontagemFuncionario(emp, locacaoSelecionada.itens, tents)
                    : { itens: [], quantidadeTendas: 0, valorTotal: 0 };
                  const jaVinculado =
                    locacaoSelecionada &&
                    employeePayments.some(
                      (p) => p.rentalId === locacaoSelecionada.id && p.employeeId === emp.id,
                    );

                  return (
                    <div
                      key={emp.id}
                      className={
                        "rounded-xl border p-3 transition " +
                        (marcado ? "border-primary bg-primary/5" : "border-border/70 bg-card")
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={(e) =>
                              setSelecionados((s) => ({ ...s, [emp.id]: e.target.checked }))
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>{emp.nome}</span>
                          {jaVinculado && (
                            <Badge variant="outline" className="text-[10px]">
                              Já vinculado
                            </Badge>
                          )}
                        </label>
                        <span className="font-display text-sm font-bold text-primary">
                          {brl(
                            valoresCustom[emp.id]?.trim()
                              ? Number(valoresCustom[emp.id]) || 0
                              : calc.valorTotal,
                          )}
                        </span>
                      </div>

                      {calc.itens.length > 0 && (
                        <p className="mt-1 pl-6 text-xs text-muted-foreground">
                          {calc.itens
                            .map(
                              (i) =>
                                `${i.quantidade}x ${i.nome}${i.dimensoes ? ` (${i.dimensoes})` : ""} × ${brl(i.valorUnitario)}`,
                            )
                            .join(" + ")}
                        </p>
                      )}

                      {marcado && (
                        <div className="mt-2 flex items-center gap-2 pl-6">
                          <Label className="text-xs text-muted-foreground">
                            Ajustar valor (R$):
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 w-28 text-xs"
                            placeholder={String(calc.valorTotal)}
                            value={valoresCustom[emp.id] ?? ""}
                            onChange={(e) =>
                              setValoresCustom((v) => ({ ...v, [emp.id]: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pago}
                onChange={(e) => setPago(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Marcar como já pago aos funcionários selecionados
            </label>

            <Button variant="hero" size="lg" className="w-full" type="submit">
              Confirmar vínculo de montagem
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
