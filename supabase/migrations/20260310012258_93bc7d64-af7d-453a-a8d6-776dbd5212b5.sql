-- Add new notification types for events
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NEW_EVENT';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';