-- Add columns to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Create notification_reads to track read status per user
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(notification_id, user_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notification_reads;
CREATE POLICY "Users can mark notifications as read" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their read notifications" ON public.notification_reads;
CREATE POLICY "Users can view their read notifications" ON public.notification_reads FOR SELECT USING (auth.uid() = user_id);

-- Add columns to polls
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

-- Enhance get_admin_users to get more details or just use the current one.
