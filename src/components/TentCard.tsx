import { Ruler, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, STATUS_LABEL, type Tent } from "@/lib/tendas-data";

export function TentCard({
  tent,
  inCart,
  onAdd,
}: {
  tent: Tent;
  inCart: boolean;
  onAdd: () => void;
}) {
  const indisponivel = tent.status === "manutencao" || tent.estoque <= 0;

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

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="font-display text-xl font-bold text-primary">{brl(tent.diaria)}</span>
            <span className="text-xs text-muted-foreground"> /dia</span>
          </div>
          <Button
            variant={inCart ? "soft" : "hero"}
            size="sm"
            disabled={indisponivel}
            onClick={onAdd}
          >
            {inCart ? <Check /> : <Plus />}
            {inCart ? "Na reserva" : "Reservar"}
          </Button>
        </div>
      </div>
    </article>
  );
}
