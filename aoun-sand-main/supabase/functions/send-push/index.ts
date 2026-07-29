// supabase/functions/send-push/index.ts
// Deploy: npx supabase functions deploy send-push --project-ref YOUR_REF
// Env secrets needed:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

// @deno-types="npm:@types/web-push@3"
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Setup VAPID ──────────────────────────────────────────
    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@aoun-sand.com';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured in environment secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // ── Parse body ───────────────────────────────────────────
    const body = await req.json();
    const { title, message, link = '/', media_url = null } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Supabase client (service role to bypass RLS) ─────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ── Fetch all push subscriptions ─────────────────────────
    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key');

    if (subsErr) throw new Error(`DB error: ${subsErr.message}`);

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0, message: 'No subscribers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Payload ──────────────────────────────────────────────
    const payload = JSON.stringify({ title, message, link, media_url });

    // ── Send in parallel batches of 20 ───────────────────────
    const staleEndpoints: string[] = [];
    let sent = 0;
    let failed = 0;

    const BATCH = 20;
    for (let i = 0; i < subs.length; i += BATCH) {
      const batch = subs.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            payload,
            { TTL: 86400, urgency: 'high' }
          )
        )
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          const errMsg = result.reason?.statusCode?.toString() ?? result.reason?.message ?? '';
          // 410 Gone = subscription expired/revoked → delete it
          if (errMsg.includes('410') || errMsg.includes('404')) {
            staleEndpoints.push(batch[idx].endpoint);
          }
          console.warn(`[Push] Failed for ${batch[idx].endpoint.slice(-20)}: ${errMsg}`);
        }
      });
    }

    // ── Cleanup expired subscriptions ────────────────────────
    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints);
      console.log(`[Push] Cleaned ${staleEndpoints.length} stale subscriptions`);
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        total: subs.length,
        cleaned: staleEndpoints.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Push] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
