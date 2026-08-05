import { useState } from "react";
import { Ruler, Plus, Check, Minus, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, STATUS_LABEL, type Tent } from "@/lib/tendas-data";

export function TentCard({
  tent,
  inCart,
  cartQty = 0,
  onAdd,
}: {
  tent: Tent;
  inCart: boolean;
  cartQty?: number;
  onAdd: (quantidade: number) => void;
}) {
  const disponiveis = Math.max(0, tent.estoque - cartQty);
  const indisponivel = tent.status === "manutencao" || disponiveis <= 0;
  const [qtd, setQtd] = useState(1);
  const max = Math.max(1, disponiveis);
  const quantidade = Math.min(qtd, max);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elev">
      <div className="relative aspect-4/3 overflow-hidden">
        <img
          src={tent.imagem}
          alt={`${tent.nome} — tenda ${tent.dimensoes} para eventos`}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge
          className={
            "absolute left-3 top-3 border-0 " +
            (tent.status === "disponivel"
              ? "bg-whatsapp text-whatsapp-foreground"
              : tent.status === "reservada"
                ? "bg-warning text-warning-foreground"
                : "bg-secondary text-secondary-foreground")
          }
        >
          {STATUS_LABEL[tent.status]}
        </Badge>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-bold">{tent.nome}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tent.descricao}</p>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Ruler className="h-4 w-4" /> {tent.dimensoes}
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {tent.tipo}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-2.5 py-2 text-xs">
          <Boxes className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">
            Estoque total: <strong className="text-foreground">{tent.estoque}</strong> ·{" "}
            {tent.status === "manutencao" ? (
              <strong className="text-foreground">0 disponíveis (manutenção)</strong>
            ) : (
              <>
                <strong className={disponiveis > 0 ? "text-whatsapp" : "text-destructive"}>
                  {disponiveis}
                </strong>{" "}
                disponíveis agora
              </>
            )}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="font-display text-xl font-bold text-primary">{brl(tent.diaria)}</span>
            <span className="text-xs text-muted-foreground"> /dia</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Diminuir quantidade"
                disabled={indisponivel || quantidade <= 1}
                onClick={() => setQtd((q) => Math.max(1, Math.min(q, max) - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">{quantidade}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Aumentar quantidade"
                disabled={indisponivel || quantidade >= max}
                onClick={() => setQtd((q) => Math.min(max, Math.min(q, max) + 1))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant={inCart ? "soft" : "hero"}
              size="sm"
              disabled={indisponivel}
              onClick={() => {
                onAdd(quantidade);
                setQtd(1);
              }}
            >
              {inCart ? <Check /> : <Plus />}
              {inCart ? `Na reserva (${cartQty})` : "Reservar"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
