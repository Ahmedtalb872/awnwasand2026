-- Add allow_multiple column to polls table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'polls' 
                     AND column_name = 'allow_multiple') THEN
        ALTER TABLE public.polls ADD COLUMN allow_multiple BOOLEAN DEFAULT false;
    END IF;
END $$;
