import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Lock,
  Pencil,
  Plus,
  ThumbsUp,
  Trash2,
  TrendingUp,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import {
  brl,
  diffDias,
  SITUACAO_LABEL,
  SITUACOES_OCUPANDO,
  STATUS_LABEL,
  TENT_TYPES,
  type CartItem,
  type NewRental,
  type Tent,
  type TentStatus,
} from "@/lib/tendas-data";

import { useTendas } from "@/lib/tendas-store";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel de Gestão | Lecão Aluguel de Tendas" },
      {
        name: "description",
        content:
          "Painel do gestor: controle o estoque de tendas, status de locação, faturamento e taxa de ocupação.",
      },
      { property: "og:title", content: "Painel de Gestão | Lecão Aluguel de Tendas" },
      {
        property: "og:description",
        content: "Estoque de tendas, faturamento e ocupação em um só lugar.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useTendas();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {isAdmin ? <Painel /> : <Login />}
    </div>
  );
}

function Login() {
  const { setIsAdmin, senha: senhaAtual } = useTendas();
  const [senha, setSenhaInput] = useState("");

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-20">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Acesso do gestor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a senha cadastrada em Configurações.
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (senha === senhaAtual) {
            setIsAdmin(true);
            toast.success("Bem-vindo ao painel!");
          } else {
            toast.error("Senha incorreta.");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenhaInput(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button variant="hero" size="lg" className="w-full" type="submit">
          Entrar
        </Button>
      </form>
    </div>
  );
}

function TrocarSenha() {
  const { senha: senhaAtualSalva, setSenha } = useTendas();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");

  return (
    <form
      className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (atual !== senhaAtualSalva) {
          toast.error("Senha atual incorreta.");
          return;
        }
        if (nova.length < 6) {
          toast.error("A nova senha deve ter ao menos 6 caracteres.");
          return;
        }
        if (nova !== confirma) {
          toast.error("As senhas não coincidem.");
          return;
        }
        setSenha(nova);
        setAtual("");
        setNova("");
        setConfirma("");
        toast.success("Senha alterada com sucesso!");
      }}
    >
      <p className="font-semibold">Trocar senha do painel</p>
      {(
        [
          ["atual", "Senha atual", atual, setAtual],
          ["nova", "Nova senha", nova, setNova],
          ["confirma", "Confirmar nova senha", confirma, setConfirma],
        ] as const
      ).map(([id, label, valor, set]) => (
        <div key={id} className="space-y-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="password"
            value={valor}
            onChange={(e) => set(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      ))}
      <Button variant="hero" className="w-full" type="submit">
        Salvar nova senha
      </Button>
    </form>
  );
}


function Painel() {
  const {
    tents,
    rentals,
    setIsAdmin,
    setStatus,
    deleteTent,
    saveTent,
    togglePaid,
    deleteRental,
    setSituacao,
    reservadas,
    whatsapp,
    setWhatsapp,
    addRental,
  } = useTendas();
  const [editando, setEditando] = useState<Tent | null>(null);
  const [novoPedido, setNovoPedido] = useState(false);

  const totalEstoque = tents.reduce((s, t) => s + t.estoque, 0);
  const qtdItens = (situacoes: readonly string[]) =>
    rentals
      .filter((r) => situacoes.includes(r.situacao))
      .reduce((s, r) => s + r.itens.reduce((x, i) => x + i.quantidade, 0), 0);
  const alugadas = qtdItens(["confirmado"]);
  const pendentes = rentals.filter((r) => r.situacao === "pendente").length;
  const comprometidas = qtdItens(SITUACOES_OCUPANDO);
  const ativos = rentals.filter((r) => r.situacao !== "desistencia");
  const faturamentoRealizado = ativos.filter((r) => r.pago).reduce((s, r) => s + r.total, 0);
  const faturamentoEstimado = ativos.reduce((s, r) => s + r.total, 0);
  const ocupacao = totalEstoque ? Math.round((comprometidas / totalEstoque) * 100) : 0;

  const metrics = [
    { label: "Tendas alugadas", valor: String(alugadas), sub: `${ativos.length} locações ativas` },
    {
      label: "Pendentes de confirmação",
      valor: String(pendentes),
      sub: `${comprometidas} tendas separadas`,
    },
    { label: "Faturamento realizado", valor: brl(faturamentoRealizado), sub: "pedidos pagos" },
    { label: "Faturamento estimado", valor: brl(faturamentoEstimado), sub: "incluindo pendentes" },
    { label: "Taxa de ocupação", valor: `${ocupacao}%`, sub: `${totalEstoque} itens em estoque` },
  ];


  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel de gestão</h1>
          <p className="text-sm text-muted-foreground">Estoque, locações e faturamento.</p>
        </div>
        <Button variant="outline" onClick={() => setIsAdmin(false)}>
          Sair do modo gestor
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-primary">{m.valor}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-whatsapp" /> {m.sub}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="estoque" className="mt-8">
        <TabsList>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="locacoes">Locações</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque" className="mt-4 space-y-4">
          <Button
            variant="hero"
            onClick={() =>
              setEditando({
                id: "",
                nome: "",
                tipo: "Piramidal",

                dimensoes: "",
                area: 0,
                diaria: 0,
                estoque: 1,
                status: "disponivel",
                imagem: "",
                descricao: "",
              })
            }
          >
            <Plus /> Nova tenda
          </Button>

          <div className="space-y-3">
            {tents.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-card"
              >
                {t.imagem && (
                  <img
                    src={t.imagem}
                    alt={t.nome}
                    loading="lazy"
                    className="h-16 w-20 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{t.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.dimensoes} · {brl(t.diaria)}/dia · {t.estoque} no estoque
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-warning-foreground/80">{reservadas(t.id)} comprometidas</span>{" "}
                    ·{" "}
                    <strong className="text-foreground">
                      {t.status === "manutencao"
                        ? 0
                        : Math.max(0, t.estoque - reservadas(t.id))}{" "}
                      disponíveis
                    </strong>
                  </p>
                </div>
                <Select
                  value={t.status}
                  onValueChange={(v) => void setStatus(t.id, v as TentStatus)}
                >

                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as TentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="soft" size="icon" aria-label="Editar" onClick={() => setEditando(t)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover"
                  onClick={() => {
                    void deleteTent(t.id);
                    toast.success("Tenda removida.");
                  }}

                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locacoes" className="mt-4 space-y-3">
          <Button variant="hero" onClick={() => setNovoPedido(true)}>
            <Plus /> Registrar pedido manual
          </Button>
          {rentals.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma locação registrada ainda.</p>
          )}

          {rentals.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.cliente}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.telefone} · {r.local}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.inicio.split("-").reverse().join("/")} →{" "}
                    {r.fim.split("-").reverse().join("/")} ({r.dias} dias)
                  </p>
                  <ul className="mt-2 text-sm">
                    {r.itens.map((i) => (
                      <li key={i.tentId} className="text-muted-foreground">
                        {i.quantidade}x {i.nome}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-display text-lg font-bold text-primary">
                    {brl(r.total)}
                  </span>
                  <Badge
                    className={
                      "border-0 " +
                      (r.situacao === "confirmado"
                        ? "bg-primary text-primary-foreground"
                        : r.situacao === "pendente"
                          ? "bg-warning text-warning-foreground"
                          : "bg-secondary text-secondary-foreground")
                    }
                  >
                    {SITUACAO_LABEL[r.situacao]}
                  </Badge>
                  <Badge
                    className={
                      r.pago
                        ? "border-0 bg-whatsapp text-whatsapp-foreground"
                        : "border-0 bg-muted text-muted-foreground"
                    }
                  >
                    {r.pago ? "Pago / concluído" : "Pagamento pendente"}
                  </Badge>

                  {r.situacao === "pendente" && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => {
                          void setSituacao(r.id, "confirmado");
                          toast.success("Aluguel confirmado! Tendas seguem reservadas.");
                        }}
                      >
                        <ThumbsUp /> Confirmar aluguel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void setSituacao(r.id, "desistencia");
                          toast.success("Desistência registrada. Tendas liberadas no estoque.");
                        }}
                      >
                        <XCircle /> Desistência cliente
                      </Button>
                    </div>
                  )}

                  {r.situacao === "desistencia" && (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => void setSituacao(r.id, "pendente")}
                    >
                      Reabrir pedido
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button variant="soft" size="sm" onClick={() => void togglePaid(r.id)}>
                      <CheckCircle2 /> {r.pago ? "Reabrir pagamento" : "Marcar pago"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir locação"
                      onClick={() => void deleteRental(r.id)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="config" className="mt-4 max-w-md space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="wpp">WhatsApp da empresa (com DDI e DDD)</Label>
            <Input
              id="wpp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground">
              Todos os pedidos do site serão enviados para este número.
            </p>
          </div>

          <TrocarSenha />
        </TabsContent>

      </Tabs>

      <TentDialog
        tent={editando}
        onClose={() => setEditando(null)}
        onSave={(t) => {
          void saveTent(t);
          setEditando(null);
          toast.success("Tenda salva!");
        }}
      />

      <PedidoManualDialog
        open={novoPedido}
        tents={tents}
        onClose={() => setNovoPedido(false)}
        onSave={(r) => {
          void addRental(r);
          setNovoPedido(false);
          toast.success("Pedido registrado!");
        }}
      />
    </div>
  );
}

type ItemDraft = { tentId: string; quantidade: number };

function PedidoManualDialog({
  open,
  tents,
  onClose,
  onSave,
}: {
  open: boolean;
  tents: Tent[];
  onClose: () => void;
  onSave: (r: NewRental) => void;
}) {

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [local, setLocal] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [pago, setPago] = useState(false);
  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [totalManual, setTotalManual] = useState("");

  const dias = diffDias(inicio, fim);
  const itensValidos = itens
    .map((i) => {
      const t = tents.find((x) => x.id === i.tentId);
      return t
        ? { tentId: t.id, nome: t.nome, diaria: t.diaria, quantidade: Math.max(1, i.quantidade) }
        : null;
    })
    .filter((i): i is CartItem => !!i);
  const subtotal = itensValidos.reduce((s, i) => s + i.diaria * i.quantidade, 0);
  const totalCalculado = subtotal * (dias || 1);
  const total = totalManual.trim() ? Number(totalManual) || 0 : totalCalculado;

  const reset = () => {
    setCliente("");
    setTelefone("");
    setLocal("");
    setInicio("");
    setFim("");
    setPago(false);
    setItens([]);
    setTotalManual("");
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
          <DialogTitle className="font-display">Pedido manual (feito por fora)</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              cliente: cliente.trim() || "Cliente não informado",
              telefone: telefone.trim(),
              local: local.trim(),
              inicio,
              fim,
              dias,
              itens: itensValidos,
              total,
              pago,
              situacao: "confirmado",
            });

            reset();
          }}
        >
          <p className="text-xs text-muted-foreground">
            Nenhum campo é obrigatório — preencha o que tiver.
          </p>

          {(
            [
              ["cliente", "Nome do cliente", cliente, setCliente, "Opcional"],
              ["telefone", "Telefone", telefone, setTelefone, "(11) 90000-0000"],
              ["local", "Local do evento", local, setLocal, "Cidade / endereço"],
            ] as const
          ).map(([id, label, valor, set, ph]) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={`pm-${id}`}>{label}</Label>
              <Input
                id={`pm-${id}`}
                value={valor}
                placeholder={ph}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-inicio">Início</Label>
              <Input
                id="pm-inicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-fim">Fim</Label>
              <Input id="pm-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tendas do pedido</Label>
            {itens.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={item.tentId}
                  onValueChange={(v) =>
                    setItens((arr) => arr.map((x, i) => (i === idx ? { ...x, tentId: v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a tenda" />
                  </SelectTrigger>
                  <SelectContent>
                    {tents.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} — {brl(t.diaria)}/dia
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={item.quantidade}
                  aria-label="Quantidade"
                  onChange={(e) =>
                    setItens((arr) =>
                      arr.map((x, i) =>
                        i === idx ? { ...x, quantidade: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover item"
                  onClick={() => setItens((arr) => arr.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => setItens((arr) => [...arr, { tentId: "", quantidade: 1 }])}
            >
              <Plus /> Adicionar tenda
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pm-total">Valor total (R$)</Label>
            <Input
              id="pm-total"
              type="number"
              min={0}
              value={totalManual}
              placeholder={String(totalCalculado)}
              onChange={(e) => setTotalManual(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Calculado: {brl(totalCalculado)} {dias ? `(${dias} dias)` : "(sem datas)"} — edite para
              usar outro valor.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Já está pago / concluído
          </label>

          <Button variant="hero" size="lg" className="w-full" type="submit">
            Registrar pedido
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function TentDialog({
  tent,
  onClose,
  onSave,
}: {
  tent: Tent | null;
  onClose: () => void;
  onSave: (t: Tent) => void;
}) {
  const [draft, setDraft] = useState<Tent | null>(tent);
  const atual = draft && tent && draft.id === tent.id ? draft : tent;

  return (
    <Dialog open={!!tent} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Cadastro de tenda</DialogTitle>
        </DialogHeader>
        {atual && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!atual.nome.trim() || !atual.dimensoes.trim() || atual.diaria <= 0) {
                toast.error("Preencha nome, dimensões e valor da diária.");
                return;
              }
              onSave(atual);
            }}
          >
            {(
              [
                ["nome", "Nome do modelo", "text"],
                ["dimensoes", "Dimensões (ex: 10m x 10m)", "text"],
                ["descricao", "Descrição", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  value={atual[key]}
                  onChange={(e) => setDraft({ ...atual, [key]: e.target.value })}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Tipo de tenda</Label>
              <Select
                value={TENT_TYPES.includes(atual.tipo as (typeof TENT_TYPES)[number]) ? atual.tipo : ""}
                onValueChange={(v) => setDraft({ ...atual, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imagem">URL da imagem</Label>
              <Input
                id="imagem"
                type="url"
                value={atual.imagem.startsWith("data:") ? "" : atual.imagem}
                placeholder="https://..."
                onChange={(e) => setDraft({ ...atual, imagem: e.target.value })}
              />
              <Label htmlFor="upload" className="pt-2 text-xs text-muted-foreground">
                ou envie uma imagem do seu dispositivo
              </Label>
              <Input
                id="upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 3 * 1024 * 1024) {
                    toast.error("Imagem muito grande. Escolha um arquivo de até 3 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () =>
                    setDraft({ ...atual, imagem: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
              {atual.imagem && (
                <img
                  src={atual.imagem}
                  alt="Pré-visualização da tenda"
                  className="mt-2 h-28 w-full rounded-lg object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="diaria">Valor da diária (R$)</Label>
                <Input
                  id="diaria"
                  type="number"
                  min={0}
                  value={atual.diaria}
                  onChange={(e) => setDraft({ ...atual, diaria: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estoque">Quantidade em estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min={0}
                  value={atual.estoque}
                  onChange={(e) => setDraft({ ...atual, estoque: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit">
              Salvar tenda
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
