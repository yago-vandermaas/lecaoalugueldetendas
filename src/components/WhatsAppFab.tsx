import { MessageCircle } from "lucide-react";
import { useTendas } from "@/lib/tendas-store";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppFab() {
  const { whatsapp } = useTendas();
  const href = buildWhatsAppUrl(
    whatsapp,
    "Olá! Vim pelo site e gostaria de um orçamento de tendas.",
  );



  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-glow transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle className="!h-7 !w-7" />
    </a>
  );
}
