SELECT cron.schedule(
  'process-streaks-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://wfuwenylojhabresnrvi.supabase.co/functions/v1/process-streaks',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdXdlbnlsb2poYWJyZXNucnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTQ3NzEsImV4cCI6MjA4ODU5MDc3MX0._1kAuL6VJYuWJvqWmu9EuQqHwCW5OL_AxyMdXXz-lps"}'::jsonb,
    body:='{"time": "daily"}'::jsonb
  ) AS request_id;
  $$
);