import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

// This project's account/access-token can't set Edge Function secrets (dashboard/
// Management API both reject it), so the OneSignal REST API key is stored in
// Supabase Vault instead and read here via a service-role-only RPC — see
// public.get_vault_secret in the database (migration 0012_vault_secret_helper.sql),
// granted to service_role only.
const { data: ONESIGNAL_REST_API_KEY } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'onesignal_rest_api_key' });

// Generic OneSignal relay — the client builds the full notification payload
// (app_id, filters/aliases, headings/contents, icons) exactly as before, since
// none of that is sensitive. Only the REST API key must never ship in the app
// bundle (anyone holding it could push arbitrary notifications to every
// HomeSewa user), so the actual OneSignal call happens here instead.
//
// `_log`, if present, is stripped out before forwarding to OneSignal and used
// to write the audit-log row into public.notifications instead — this is now
// the only place that ever writes that table (the anon key's own INSERT
// privilege on it was revoked, see 0020_lock_notifications_insert.sql),
// since this function is already the sole trigger point for every
// notification the app ever sends.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!ONESIGNAL_REST_API_KEY) {
      return json({ success: false, message: 'Missing OneSignal config' }, 500);
    }
    const { _log, ...oneSignalPayload } = await req.json();

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oneSignalPayload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ success: false, message: data?.errors?.[0] || 'OneSignal request failed' }, 502);
    }

    if (_log) {
      // Awaited deliberately — an un-awaited insert here risks the edge
      // runtime tearing down before it completes, silently dropping history
      // entries from the in-app "My Notifications" feed.
      const { error } = await supabaseAdmin.from('notifications').insert([{
        title: _log.title,
        body: _log.body,
        screen: _log.screen || null,
        link_id: _log.linkId || null,
        audience: _log.audience,
        audience_service: _log.service || null,
        audience_city: _log.city || null,
        audience_phone: _log.phone || null,
      }]);
      if (error) console.error('notifications log insert failed:', error);
    }

    return json({ success: true });
  } catch (e) {
    console.error('send-notification error:', e);
    return json({ success: false, message: 'Could not send notification' }, 500);
  }
});
