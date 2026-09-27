ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS lembrete_vespera_em timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_dia_em timestamptz,
  ADD COLUMN IF NOT EXISTS montada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vespera_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_aviso_em timestamptz;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Define lembretes padrão ao confirmar (horário de Brasília)
CREATE OR REPLACE FUNCTION public.definir_lembretes_padrao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.situacao = 'confirmado' AND NEW.inicio IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.situacao IS DISTINCT FROM 'confirmado') THEN
    IF NEW.lembrete_vespera_em IS NULL THEN
      NEW.lembrete_vespera_em := ((NEW.inicio - 1)::timestamp + time '08:00') AT TIME ZONE 'America/Sao_Paulo';
    END IF;
    IF NEW.lembrete_dia_em IS NULL THEN
      NEW.lembrete_dia_em := (NEW.inicio::timestamp + time '06:00') AT TIME ZONE 'America/Sao_Paulo';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rentals_lembretes_padrao
BEFORE INSERT OR UPDATE ON public.rentals
FOR EACH ROW EXECUTE FUNCTION public.definir_lembretes_padrao();