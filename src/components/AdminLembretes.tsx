import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bell, Hammer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obterChavePush, registrarAparelho } from "@/lib/push.functions";
import { useTendas } from "@/lib/tendas-store";
import type { Rental } from "@/lib/tendas-data";

/** ISO -> valor de <input type="datetime-local"> no horário de Brasília */
const paraInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};
const deInput = (v: string) => (v ? new Date(v + ":00-03:00").toISOString() : null);

const b64ToBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function AtivarNotificacoes() {
  const chave = useServerFn(obterChavePush);
  const registrar = useServerFn(registrarAparelho);
  const [senha, setSenha] = useState("");
  const [ativando, setAtivando] = useState(false);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void navigator.serviceWorker?.getRegistration("/sw-push.js").then(async (reg) => {
        if (await reg?.pushManager.getSubscription()) setAtivo(true);
      });
    }
  }, []);

  const ativar = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Este navegador não aceita notificações. No iPhone, adicione o site à Tela de Início.");
      return;
    }
    if (window.top !== window.self) {
      toast.error("Abra o painel em uma aba própria (ou no site publicado) para ativar.");
      return;
    }
    if (!senha) {
      toast.error("Digite a senha do painel.");
      return;
    }
    setAtivando(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permissão negada. Libere as notificações nas configurações do navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;
      const pub = await chave();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToBytes(pub),
        }));
      const res = await registrar({ data: { senha, endpoint: sub.endpoint } });
      if (res.ok) {
        setAtivo(true);
        setSenha("");
        toast.success("Notificações ativadas neste aparelho!");
      } else toast.error(res.motivo === "senha" ? "Senha incorreta." : "Erro ao ativar.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ativar as notificações.");
    } finally {
      setAtivando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <p className="flex items-center gap-2 font-semibold">
        <Bell className="size-4" /> Notificações de montagem
      </p>
      <p className="text-xs text-muted-foreground">
        Receba avisos 1 dia antes e no dia de cada aluguel confirmado (repetindo a cada 2 horas até
        marcar "Tenda montada"). Ative em cada aparelho que deve receber.
      </p>
      {ativo ? (
        <Badge className="border-0 bg-whatsapp text-whatsapp-foreground">Ativo neste aparelho</Badge>
      ) : (
        <>
          <Input
            type="password"
            placeholder="Senha do painel"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button variant="hero" className="w-full" disabled={ativando} onClick={() => void ativar()}>
            {ativando ? "Ativando..." : "Ativar notificações neste aparelho"}
          </Button>
        </>
      )}
    </div>
  );
}

export function LembretesLocacao({ rental }: { rental: Rental }) {
  const { recarregar } = useTendas();
  const [vespera, setVespera] = useState(paraInput(rental.lembreteVespera));
  const [dia, setDia] = useState(paraInput(rental.lembreteDia));

  useEffect(() => {
    setVespera(paraInput(rental.lembreteVespera));
    setDia(paraInput(rental.lembreteDia));
  }, [rental.lembreteVespera, rental.lembreteDia]);

  const atualizar = async (campos: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from("rentals").update(campos).eq("id", rental.id);
    if (error) return toast.error("Erro ao salvar.");
    toast.success(msg);
    await recarregar();
  };

  return (
    <div className="w-full space-y-2 rounded-xl border border-border/70 p-3 text-left text-sm">
      <Badge
        className={
          rental.montada
            ? "border-0 bg-whatsapp text-whatsapp-foreground"
            : "border-0 bg-warning text-warning-foreground"
        }
      >
        {rental.montada ? "Montada" : "Aguardando montagem"}
      </Badge>
      {!rental.montada && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Lembrete da véspera</Label>
            <Input type="datetime-local" value={vespera} onChange={(e) => setVespera(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lembrete do dia (repete a cada 2h)</Label>
            <Input type="datetime-local" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={() =>
                void atualizar(
                  {
                    lembrete_vespera_em: deInput(vespera),
                    lembrete_dia_em: deInput(dia),
                    vespera_enviado: false,
                    ultimo_aviso_em: null,
                  },
                  "Horários dos lembretes salvos.",
                )
              }
            >
              <Bell /> Salvar horários
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={() => void atualizar({ montada: true }, "Tenda marcada como montada.")}
            >
              <Hammer /> Tenda montada
            </Button>
          </div>
        </>
      )}
      {rental.montada && (
        <Button variant="ghost" size="sm" onClick={() => void atualizar({ montada: false }, "Reaberto.")}>
          Desfazer montagem
        </Button>
      )}
    </div>
  );
}
