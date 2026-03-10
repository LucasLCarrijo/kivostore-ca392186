SELECT cron.schedule(
  'event-reminders-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://wfuwenylojhabresnrvi.supabase.co/functions/v1/event-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdXdlbnlsb2poYWJyZXNucnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTQ3NzEsImV4cCI6MjA4ODU5MDc3MX0._1kAuL6VJYuWJvqWmu9EuQqHwCW5OL_AxyMdXXz-lps"}'::jsonb,
    body:='{"time": "reminder"}'::jsonb
  ) AS request_id;
  $$
);