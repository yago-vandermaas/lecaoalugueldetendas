CREATE OR REPLACE FUNCTION public.verificar_senha_admin(senha_hash_input text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_credentials
    WHERE id = 'default'
      AND senha_hash = senha_hash_input
  );
$$;

CREATE OR REPLACE FUNCTION public.alterar_senha_admin(
  senha_atual_hash_input text,
  senha_nova_hash_input text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_credentials
    WHERE id = 'default'
      AND senha_hash = senha_atual_hash_input
  ) THEN
    RETURN 'incorreta';
  END IF;

  UPDATE public.admin_credentials
  SET senha_hash = senha_nova_hash_input,
      updated_at = now()
  WHERE id = 'default';

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_senha_admin(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.alterar_senha_admin(text, text) TO anon, authenticated, service_role;
