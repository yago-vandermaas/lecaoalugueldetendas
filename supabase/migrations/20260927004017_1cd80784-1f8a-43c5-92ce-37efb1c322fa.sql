-- lovable-cron-fallback-reviewed: lembretes com horário definido pelo gestor e repetição a cada 2h exigem checagem por tempo; 30 min mantém atraso máximo aceitável
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'lembretes-montagem',
  '*/30 * * * *',
  $$ SELECT net.http_post(url := 'https://project--b725e7dc-ce1d-4d0a-8982-1e6cd8f2c27d.lovable.app/api/public/lembretes', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb); $$
);