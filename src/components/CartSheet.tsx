import { useState } from "react";
import { CalendarDays, MessageCircle, Percent, Sparkles, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  brl,
  DESCONTO_DIARIA_ADICIONAL,
  diffDias,
  type NewRental,
} from "@/lib/tendas-data";
import { useTendas } from "@/lib/tendas-store";
import { formatRentalWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";

type Form = { nome: string; telefone: string; local: string; inicio: string; fim: string };
const vazio: Form = { nome: "", telefone: "", local: "", inicio: "", fim: "" };

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { cart, removeFromCart, clearCart, whatsapp, addRental, calcularResumo, calcularSubtotal } =
    useTendas();
  const [form, setForm] = useState<Form>(vazio);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});

  const dias = diffDias(form.inicio, form.fim);
  const resumo = calcularResumo(dias);
  const total = resumo.total;
  const temDesconto = dias >= 2 && resumo.descontoTotal > 0;

  const validar = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (form.nome.trim().length < 3) e.nome = "Informe seu nome completo.";
    if (form.telefone.replace(/\D/g, "").length < 10) e.telefone = "Telefone com DDD.";
    if (form.local.trim().length < 5) e.local = "Informe o endereço do evento.";
    if (!form.inicio) e.inicio = "Data inicial obrigatória.";
    if (!form.fim) e.fim = "Data final obrigatória.";
    if (form.inicio && form.fim && dias === 0) e.fim = "A data final deve ser após a inicial.";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const finalizar = async () => {
    if (cart.length === 0) {
      toast.error("Selecione pelo menos uma tenda.");
      return;
    }
    if (!validar()) {
      toast.error("Revise os campos destacados.");
      return;
    }

    const rental: NewRental = {
      cliente: form.nome,
      telefone: form.telefone,
      local: form.local,
      inicio: form.inicio,
      fim: form.fim,
      dias,
      itens: cart,
      total,
      pago: false,
      situacao: "pendente",
    };
    await addRental(rental);

    const mensagem = formatRentalWhatsAppMessage({
      cliente: form.nome,
      telefone: form.telefone,
      local: form.local,
      inicio: form.inicio,
      fim: form.fim,
      dias,
      itens: cart,
    });
    const { url, ok } = openWhatsApp(whatsapp, mensagem);

    clearCart();
    setForm(vazio);
    onOpenChange(false);

    if (ok) {
      toast.success("Pedido enviado para o WhatsApp!", {
        description: "Não abriu? Toque em 'Abrir WhatsApp'.",
        duration: 15000,
        action: {
          label: "Abrir WhatsApp",
          onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
        },
      });
    } else {
      void navigator.clipboard?.writeText(mensagem).catch(() => {});
      toast.error("Seu navegador bloqueou a abertura automática.", {
        description: "Copiamos a mensagem. Toque em 'Abrir WhatsApp' para continuar.",
        duration: 20000,
        action: {
          label: "Abrir WhatsApp",
          onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
        },
      });
    }
  };

  const campo = (key: keyof Form, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...props}
      />
      {erros[key] && <p className="text-xs text-destructive">{erros[key]}</p>}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">Sua reserva</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          <div className="flex items-center gap-2 rounded-xl border border-whatsapp/30 bg-whatsapp/10 px-3 py-2 text-xs font-medium text-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-whatsapp" />
            <span>
              <strong>Promoção ativa:</strong> 2ª diária em diante com{" "}
              <strong className="text-whatsapp">50% OFF</strong> nas tendas!
            </span>
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tenda selecionada ainda. Escolha um modelo no catálogo.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((i) => {
                const diariaPromocional = i.diaria * DESCONTO_DIARIA_ADICIONAL;
                const subtotalItem = dias > 0 ? calcularSubtotal(i, dias) : 0;
                return (
                  <li
                    key={i.tentId}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-card p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold">{i.nome}</p>
                        {i.isTent !== false && (
                          <Badge className="border-0 bg-whatsapp/15 px-1.5 py-0 text-[10px] font-semibold text-whatsapp">
                            2ª diária 50% OFF
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {i.quantidade}x · 1ª diária: {brl(i.diaria)}/un.
                        {i.isTent !== false && (
                          <> · 2ª+ diária: <strong className="text-foreground">{brl(diariaPromocional)}/un.</strong></>
                        )}
                      </p>
                      {dias > 0 && (
                        <p className="text-xs font-medium text-primary">
                          Subtotal ({dias} {dias === 1 ? "diária" : "diárias"}): {brl(subtotalItem)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${i.nome}`}
                      onClick={() => removeFromCart(i.tentId)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            {campo("inicio", "Início", { type: "date" })}
            {campo("fim", "Fim", { type: "date" })}
          </div>
          {campo("nome", "Nome completo", { placeholder: "Seu nome" })}
          {campo("telefone", "Telefone / WhatsApp", { placeholder: "(11) 99999-9999" })}
          {campo("local", "Local do evento", { placeholder: "Rua, número, cidade" })}

          <div className="rounded-xl bg-accent/60 p-4 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Diárias
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                {dias || "—"}
                {temDesconto && (
                  <Badge className="border-0 bg-whatsapp text-whatsapp-foreground text-[10px]">
                    2ª+ diária 50% OFF
                  </Badge>
                )}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-muted-foreground">
              <span>1ª diária (integral)</span>
              <span className="font-medium text-foreground">{brl(resumo.valorPrimeiraDiaria)}</span>
            </div>

            {dias >= 2 ? (
              <>
                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-whatsapp" />
                    +{resumo.diasAdicionais}{" "}
                    {resumo.diasAdicionais === 1 ? "diária adicional" : "diárias adicionais"} (50% OFF)
                  </span>
                  <span className="font-medium text-whatsapp">
                    {brl(resumo.valorDiariasAdicionais)}
                  </span>
                </div>
                <p className="mt-1.5 rounded-md bg-whatsapp/10 px-2 py-1 text-xs text-muted-foreground">
                  1ª diária: <strong>{brl(resumo.valorPrimeiraDiaria)}</strong> + diárias adicionais
                  com 50% OFF: <strong>{brl(resumo.valorDiariasAdicionais)}</strong>{" "}
                  <span className="font-semibold text-whatsapp">
                    (economia de {brl(resumo.descontoTotal)})
                  </span>
                </p>
              </>
            ) : (
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>A partir da 2ª diária (50% OFF)</span>
                <span className="font-medium text-whatsapp">
                  +{brl(resumo.valorPorDiariaAdicional)}/dia
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-display text-lg font-bold text-primary">
              <span>Total</span>
              <div className="flex items-baseline gap-2">
                {temDesconto && (
                  <span className="text-xs font-normal text-muted-foreground line-through">
                    {brl(resumo.totalSemDesconto)}
                  </span>
                )}
                <span>{brl(total)}</span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-background/70 p-2 text-xs text-muted-foreground">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-whatsapp" />
              <span>
                O valor acima não inclui <strong>frete</strong>: a entrega e montagem são cobradas à
                parte e variam conforme o local do evento. Confirmamos o valor exato no WhatsApp.
              </span>
            </p>
          </div>

          <p className="rounded-lg bg-warning/10 p-2 text-xs text-muted-foreground">
            Ao finalizar, seu pedido entra como <strong>pendente de confirmação</strong> e as tendas
            já ficam separadas para você até o gestor confirmar.
          </p>

          <Button variant="whatsapp" size="xl" className="w-full" onClick={() => void finalizar()}>
            <MessageCircle /> Finalizar pedido no WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
