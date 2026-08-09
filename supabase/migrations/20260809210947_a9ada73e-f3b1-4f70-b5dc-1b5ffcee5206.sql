CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.tents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Piramidal',
  dimensoes text NOT NULL DEFAULT '',
  area numeric NOT NULL DEFAULT 0,
  diaria numeric NOT NULL DEFAULT 0,
  estoque integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'disponivel',
  imagem text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tents TO anon, authenticated;
GRANT ALL ON public.tents TO service_role;
ALTER TABLE public.tents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico de tendas" ON public.tents FOR SELECT USING (true);
CREATE POLICY "Gestao das tendas pelo painel" ON public.tents FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar tendas pelo painel" ON public.tents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Remover tendas pelo painel" ON public.tents FOR DELETE USING (true);
CREATE TRIGGER update_tents_updated_at BEFORE UPDATE ON public.tents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  local text NOT NULL DEFAULT '',
  inicio date,
  fim date,
  dias integer NOT NULL DEFAULT 0,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  situacao text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentals TO anon, authenticated;
GRANT ALL ON public.rentals TO service_role;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locacoes visiveis para o painel" ON public.rentals FOR SELECT USING (true);
CREATE POLICY "Clientes podem criar pedidos" ON public.rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "Painel atualiza locacoes" ON public.rentals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Painel remove locacoes" ON public.rentals FOR DELETE USING (true);
CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.settings (
  id text PRIMARY KEY DEFAULT 'default',
  whatsapp text NOT NULL DEFAULT '5511999999999',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configuracoes publicas" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Painel cria configuracoes" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Painel atualiza configuracoes" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.settings (id, whatsapp) VALUES ('default', '5511999999999');

INSERT INTO public.tents (nome, tipo, dimensoes, area, diaria, estoque, status, imagem, descricao) VALUES
('Tenda Piramidal 10x10', 'Piramidal', '10m x 10m', 100, 850, 3, 'disponivel', '/tendas/tenda-1.jpg', 'Ideal para casamentos e festas de até 120 pessoas. Fechamento lateral incluso.'),
('Tenda Piramidal 3x3', 'Piramidal', '3m x 3m', 9, 180, 12, 'disponivel', '/tendas/tenda-2.jpg', 'Perfeita para food trucks, feiras e pequenos estandes. Montagem rápida.'),
('Tenda Chapéu de Bruxa 12x20', 'Chapéu de bruxa', '12m x 20m', 240, 2400, 1, 'disponivel', '/tendas/tenda-3.jpg', 'Estrutura premium com forro e iluminação decorativa para grandes eventos.'),
('Tenda Chapéu de Bruxa 6x6', 'Chapéu de bruxa', '6m x 6m', 36, 420, 5, 'disponivel', '/tendas/tenda-4.jpg', 'Charme clássico com cortinas brancas. Ótima para recepções e áreas de bar.');

INSERT INTO public.rentals (cliente, telefone, local, inicio, fim, dias, itens, total, pago, situacao)
SELECT 'Marina Duarte', '(11) 98888-1212', 'Chácara Bela Vista, Itu - SP', '2026-07-10', '2026-07-12', 3,
  jsonb_build_array(jsonb_build_object('tentId', t.id::text, 'nome', t.nome, 'diaria', t.diaria, 'quantidade', 1)), 2550, true, 'confirmado'
FROM public.tents t WHERE t.nome = 'Tenda Piramidal 10x10';

INSERT INTO public.rentals (cliente, telefone, local, inicio, fim, dias, itens, total, pago, situacao)
SELECT 'Prefeitura de Salto', '(11) 97777-3434', 'Praça Central, Salto - SP', '2026-08-05', '2026-08-07', 3,
  jsonb_build_array(jsonb_build_object('tentId', t.id::text, 'nome', t.nome, 'diaria', t.diaria, 'quantidade', 6)), 3240, false, 'pendente'
FROM public.tents t WHERE t.nome = 'Tenda Piramidal 3x3';