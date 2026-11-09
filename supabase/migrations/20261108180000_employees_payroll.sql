CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  pix text NOT NULL DEFAULT '',
  tipo_pagamento text NOT NULL DEFAULT 'mensal',
  salario_mensal numeric NOT NULL DEFAULT 0,
  dia_pagamento integer NOT NULL DEFAULT 5,
  valores_por_tenda jsonb NOT NULL DEFAULT '{}'::jsonb,
  valor_padrao_tenda numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionarios visiveis para o painel" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Painel cadastra funcionarios" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Painel atualiza funcionarios" ON public.employees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Painel remove funcionarios" ON public.employees FOR DELETE USING (true);
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'montagem',
  competencia text NOT NULL DEFAULT '',
  data date,
  rental_id uuid REFERENCES public.rentals(id) ON DELETE SET NULL,
  descricao text NOT NULL DEFAULT '',
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantidade_tendas integer NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_payments TO anon, authenticated;
GRANT ALL ON public.employee_payments TO service_role;
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pagamentos visiveis para o painel" ON public.employee_payments FOR SELECT USING (true);
CREATE POLICY "Painel cria pagamentos" ON public.employee_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Painel atualiza pagamentos" ON public.employee_payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Painel remove pagamentos" ON public.employee_payments FOR DELETE USING (true);
CREATE TRIGGER update_employee_payments_updated_at BEFORE UPDATE ON public.employee_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
