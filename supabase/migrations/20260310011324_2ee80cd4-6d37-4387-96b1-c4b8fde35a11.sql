-- Add new point_action enum values for daily login and streak
ALTER TYPE public.point_action ADD VALUE IF NOT EXISTS 'DAILY_LOGIN';
ALTER TYPE public.point_action ADD VALUE IF NOT EXISTS 'STREAK_BONUS';
ALTER TYPE public.point_action ADD VALUE IF NOT EXISTS 'ADMIN_BONUS';

-- Add LEVEL_UP to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'LEVEL_UP';