-- Checks reminders every 30 minutes, keeping the maximum delay at 30 minutes.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'lembretes-montagem',
  '*/30 * * * *',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'LEMBRETES_URL' LIMIT 1) || '/api/public/lembretes', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb); $$
);
