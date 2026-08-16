CREATE TABLE public.admin_credentials (
  id text PRIMARY KEY DEFAULT 'default',
  senha_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_credentials TO service_role;

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_credentials (id, senha_hash)
VALUES ('default', '35fce55f1edbb6d56e08bd55c020a4fc52daa19c19bb1783386b586f9c10a655');