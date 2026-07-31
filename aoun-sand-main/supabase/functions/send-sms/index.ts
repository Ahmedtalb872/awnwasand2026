// supabase/functions/send-sms/index.ts
// Sends bulk SMS to a list of phone numbers via the Chinguisoft Campaign API.
// Deploy: npx supabase functions deploy send-sms --project-ref YOUR_REF
// Env secrets needed (set with `npx supabase secrets set`, never commit these):
//   CHINGUISOFT_CAMPAIGN_KEY, CHINGUISOFT_CAMPAIGN_TOKEN
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already set by default on Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsResult {
  phone: string;
  status: 'sent' | 'failed';
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CAMPAIGN_KEY = Deno.env.get('CHINGUISOFT_CAMPAIGN_KEY');
    const CAMPAIGN_TOKEN = Deno.env.get('CHINGUISOFT_CAMPAIGN_TOKEN');

    if (!CAMPAIGN_KEY || !CAMPAIGN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Chinguisoft campaign credentials not configured in environment secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { admin_id, phones, lang = 'ar', url = null } = body;

    if (!admin_id) {
      return new Response(
        JSON.stringify({ error: 'admin_id is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!Array.isArray(phones) || phones.length === 0) {
      return new Response(
        JSON.stringify({ error: 'phones must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (lang !== 'ar' && lang !== 'fr') {
      return new Response(
        JSON.stringify({ error: 'lang must be "ar" or "fr"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Only an active admin session may trigger a paid SMS send.
    const { data: admin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('id', admin_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniquePhones = [...new Set(phones.map((p: string) => String(p).trim()).filter(Boolean))];
    const endpoint = `https://chinguisoft.com/api/sms/campaign/${CAMPAIGN_KEY}`;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendOne = async (phone: string): Promise<string> => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Campaign-token': CAMPAIGN_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, lang, url }),
      });
      if (res.status === 429) {
        // Rate-limited — wait a bit and retry once before giving up.
        await sleep(2000);
        const retryRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Campaign-token': CAMPAIGN_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, lang, url }),
        });
        if (!retryRes.ok) {
          const text = await retryRes.text().catch(() => '');
          throw new Error(`HTTP ${retryRes.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
        }
        return phone;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
      }
      return phone;
    };

    // Small batches with a pause between them — sending too many
    // requests to Chinguisoft at once triggers their rate limit (429).
    const results: SmsResult[] = [];
    const BATCH = 3;
    const BATCH_DELAY_MS = 700;
    for (let i = 0; i < uniquePhones.length; i += BATCH) {
      const batch = uniquePhones.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(batch.map(sendOne));

      batchResults.forEach((r, idx) => {
        const phone = batch[idx];
        if (r.status === 'fulfilled') {
          results.push({ phone, status: 'sent' });
        } else {
          const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
          results.push({ phone, status: 'failed', error: err });
        }
      });

      if (i + BATCH < uniquePhones.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Log every attempt for admin visibility (this costs real balance).
    await supabase.from('sms_logs').insert(
      results.map((r) => ({
        phone: r.phone,
        lang,
        url,
        status: r.status,
        error: r.error ?? null,
        admin_id,
      }))
    );

    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ sent, failed, total: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SMS] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
