import { useState } from "react";
import { CalendarDays, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { brl, diffDias, type Rental } from "@/lib/tendas-data";
import { useTendas } from "@/lib/tendas-store";
import { openWhatsApp } from "@/lib/whatsapp";


type Form = { nome: string; telefone: string; local: string; inicio: string; fim: string };
const vazio: Form = { nome: "", telefone: "", local: "", inicio: "", fim: "" };

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { cart, removeFromCart, clearCart, whatsapp, addRental } = useTendas();
  const [form, setForm] = useState<Form>(vazio);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});

  const dias = diffDias(form.inicio, form.fim);
  const subtotal = cart.reduce((s, i) => s + i.diaria * i.quantidade, 0);
  const total = subtotal * (dias || 0);

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

  const finalizar = () => {
    if (cart.length === 0) {
      toast.error("Selecione pelo menos uma tenda.");
      return;
    }
    if (!validar()) {
      toast.error("Revise os campos destacados.");
      return;
    }

    const rental: Rental = {
      id: `r${Date.now()}`,
      cliente: form.nome,
      telefone: form.telefone,
      local: form.local,
      inicio: form.inicio,
      fim: form.fim,
      dias,
      itens: cart,
      total,
      pago: false,
      criadoEm: new Date().toISOString(),
    };
    addRental(rental);

    const linhas = [
      "*NOVO PEDIDO DE RESERVA — TendasPro*",
      "",
      `*Cliente:* ${form.nome}`,
      `*Telefone:* ${form.telefone}`,
      `*Local do evento:* ${form.local}`,
      `*Período:* ${form.inicio.split("-").reverse().join("/")} até ${form.fim
        .split("-")
        .reverse()
        .join("/")} (${dias} dia${dias > 1 ? "s" : ""})`,
      "",
      "*Itens escolhidos:*",
      ...cart.map(
        (i) => `• ${i.quantidade}x ${i.nome} — ${brl(i.diaria)}/dia`,
      ),
      "",
      `*Valor total estimado:* ${brl(total)}`,
      "",
      "_Obs.: o valor do frete/entrega é calculado à parte, conforme o local do evento._",
    ];

    openWhatsApp(whatsapp, linhas.join("\n"));

    clearCart();
    setForm(vazio);
    onOpenChange(false);
    toast.success("Pedido enviado para o WhatsApp!");
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
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tenda selecionada ainda. Escolha um modelo no catálogo.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((i) => (
                <li
                  key={i.tentId}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{i.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.quantidade}x · {brl(i.diaria)}/dia
                    </p>
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
              ))}
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
              <span>{dias || "—"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-muted-foreground">
              <span>Valor por dia</span>
              <span>{brl(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-display text-lg font-bold text-primary">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>
          </div>

          <Button variant="whatsapp" size="xl" className="w-full" onClick={finalizar}>
            <MessageCircle /> Finalizar pedido no WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
