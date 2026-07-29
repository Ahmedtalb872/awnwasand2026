import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// VAPID Public Key — generated once, safe to expose publicly
const VAPID_PUBLIC_KEY = 'BHZicyftCwmL-hl5y31PZQ2ZkeAJx-wl47gG5hqy2efy7qnpF_qNJ1C4srIV_pO_cWY3lxUflJ-H-X9XLMcYt_Q';

/** Convert VAPID base64url string to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * usePushNotifications
 *
 * Full Web Push flow:
 * 1. Register Service Worker
 * 2. Request notification permission
 * 3. Subscribe via PushManager (VAPID)
 * 4. Store subscription in push_subscriptions table
 * 5. Listen via Supabase Realtime for in-app alerts (when app is open)
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const subscribedRef = useRef(false);

  /* ── Register SW ── */
  const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
      return null;
    }
  };

  /* ── Subscribe user to Web Push & save in DB ── */
  const subscribeUser = async (reg: ServiceWorkerRegistration) => {
    if (!user || subscribedRef.current) return;
    if (!('PushManager' in window)) return;

    try {
      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // Create new subscription with VAPID
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON() as PushSubscriptionJSON & {
        keys: { p256dh: string; auth: string };
      };

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      // Save to Supabase (upsert on endpoint to avoid duplicates)
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth_key: json.keys.auth,
          user_agent: navigator.userAgent.substring(0, 200),
        },
        { onConflict: 'endpoint' }
      );

      subscribedRef.current = true;
    } catch (e: any) {
      // User denied or browser issue — don't throw
      if (!e.message?.includes('denied')) {
        console.warn('[Push] Subscribe failed:', e.message);
      }
    }
  };

  /* ── Request permission ── */
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  };

  /* ── Show browser notification (fallback for when app IS open) ── */
  const showInAppNotification = async (
    title: string,
    body: string,
    url = '/',
    icon?: string
  ) => {
    if (Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: icon || '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        data: { url },
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: false,
        tag: `aoun-notif-${Date.now()}`,
      } as any);
      // Update badge
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(1).catch(() => {});
      }
    } catch {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    }
  };

  /* ── Main effect ── */
  useEffect(() => {
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // 1. Register SW always (needed even for guests)
      const reg = await registerSW();

      // 2. Request permission & subscribe if user is logged in
      if (user && reg) {
        const granted = await requestPermission();
        if (granted) {
          await subscribeUser(reg);
        }
      }

      // 3. Realtime: show in-app notification when tab is open
      realtimeChannel = supabase
        .channel('push:realtime:v3')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          async (payload) => {
            const notif = payload.new as any;
            if (!notif) return;
            if (notif.scheduled_at && new Date(notif.scheduled_at) > new Date()) return;
            // Show in-app notification (complements the background push)
            await showInAppNotification(
              notif.title || 'إشعار جديد',
              notif.message || '',
              notif.link || '/'
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'polls' },
          async (payload) => {
            const poll = payload.new as any;
            if (!poll || poll.is_closed) return;
            await showInAppNotification(
              '🗳️ استطلاع رأي جديد',
              poll.title || 'شارك برأيك الآن',
              '/'
            );
          }
        )
        .subscribe();
    };

    init();

    // 4. Handle SW notification click → navigate to URL
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIF_CLICK') {
        window.focus();
        const url = event.data.url || '/';
        if (window.location.pathname !== url) window.location.href = url;
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [user]);
};
