import { Link } from "@tanstack/react-router";
import { ShoppingCart, TentTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTendas } from "@/lib/tendas-store";

export function SiteHeader({ onOpenCart }: { onOpenCart?: () => void }) {
  const { cart } = useTendas();
  const count = cart.reduce((s, i) => s + i.quantidade, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TentTree className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold leading-none">
            Lecão&nbsp;Aluguel de Tendas
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">Painel</Link>
          </Button>
          {onOpenCart && (
            <Button variant="hero" size="sm" onClick={onOpenCart} className="relative">
              <ShoppingCart />
              <span className="hidden sm:inline">Reserva</span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-whatsapp px-1 text-[11px] font-bold text-whatsapp-foreground">
                  {count}
                </span>
              )}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
