import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShieldCheck, Truck, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSheet } from "@/components/CartSheet";
import { TentCard } from "@/components/TentCard";
import { TENT_TYPES } from "@/lib/tendas-data";
import { useTendas } from "@/lib/tendas-store";
import heroImg from "@/assets/hero-tendas.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aluguel de Tendas para Eventos | Lecão Aluguel de Tendas" },
      {
        name: "description",
        content:
          "Aluguel de tendas para casamentos, festas e feiras. Veja modelos, tamanhos e preços da diária e reserve em minutos pelo WhatsApp.",
      },
      { property: "og:title", content: "Aluguel de Tendas para Eventos | Lecão Aluguel de Tendas" },
      {
        property: "og:description",
        content: "Catálogo de tendas com preço da diária e reserva rápida pelo WhatsApp.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { tents, cart, addToCart } = useTendas();
  const [cartOpen, setCartOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<string>("todos");

  const filtradas = useMemo(
    () =>
      tents.filter((t) => {
        const q = busca.trim().toLowerCase();
        const matchBusca =
          !q ||
          t.nome.toLowerCase().includes(q) ||
          t.dimensoes.toLowerCase().includes(q) ||
          t.tipo.toLowerCase().includes(q);
        return matchBusca && (tipo === "todos" || t.tipo === tipo);
      }),
    [tents, busca, tipo],
  );

  return (
    <div className="min-h-screen">
      <SiteHeader onOpenCart={() => setCartOpen(true)} />

      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Tendas brancas iluminadas em um evento ao anoitecer"
          width={1600}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full bg-whatsapp/20 px-3 py-1 text-xs font-semibold text-whatsapp-foreground ring-1 ring-whatsapp/40">
            <Star className="h-3.5 w-3.5" /> +1.200 eventos atendidos
          </span>
          <h1 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-tight text-primary-foreground sm:text-6xl">
            Sua festa protegida com a tenda certa
          </h1>
          <p className="mt-4 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
            Locação de tendas para casamentos, aniversários, feiras e eventos corporativos. Montagem
            profissional, entrega no dia e orçamento na hora pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="xl" variant="whatsapp" asChild>
              <a href="#catalogo">Ver tendas disponíveis</a>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setCartOpen(true)}
            >
              Calcular minha reserva
            </Button>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Truck, t: "Entrega e montagem", d: "Equipe própria inclusa" },
              { icon: Clock, t: "Resposta em minutos", d: "Atendimento no WhatsApp" },
              { icon: ShieldCheck, t: "Estrutura segura", d: "Tendas revisadas" },
            ].map(({ icon: Icon, t, d }) => (
              <div
                key={t}
                className="rounded-xl bg-primary-foreground/10 p-4 ring-1 ring-primary-foreground/15"
              >
                <Icon className="h-5 w-5 text-whatsapp" />
                <dt className="mt-2 text-sm font-semibold text-primary-foreground">{t}</dt>
                <dd className="text-xs text-primary-foreground/75">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-bold">Catálogo de tendas</h2>
          <p className="text-muted-foreground">
            Escolha o modelo, informe as datas e receba o orçamento fechado no WhatsApp.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, tamanho ou tipo (ex: 10x10)"
              className="h-11 pl-9"
              aria-label="Buscar tendas"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["todos", ...TENT_TYPES].map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tipo === t ? "hero" : "soft"}
                onClick={() => setTipo(t)}
              >
                {t === "todos" ? "Todas" : t}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((tent) => (
            <TentCard
              key={tent.id}
              tent={tent}
              inCart={cart.some((i) => i.tentId === tent.id)}
              cartQty={cart.find((i) => i.tentId === tent.id)?.quantidade ?? 0}
              onAdd={(qtd) => {
                addToCart(tent, qtd);
                setCartOpen(true);
              }}
            />
          ))}
        </div>

        {filtradas.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhuma tenda encontrada com esse filtro.
          </p>
        )}
      </section>

      <footer className="border-t border-border bg-secondary/50 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          <p className="font-display text-base font-bold text-foreground">
            Lecão Aluguel de Tendas
          </p>
          <p className="mt-1">Atendimento todos os dias.</p>
        </div>
      </footer>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
