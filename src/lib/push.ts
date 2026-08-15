import { supabase } from './supabase'

/**
 * Web Push subscription handling.
 *
 * On iOS this only works once the PWA is installed to the home screen (16.4+), which is
 * why `pushSupport()` reports that case separately instead of just "unsupported".
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport = 'supported' | 'needs-install' | 'unsupported' | 'not-configured'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (!('Notification' in window)) return 'unsupported'
  return 'supported'
}

export function permissionState(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/** Asks for permission, subscribes, and records the endpoint against the family. */
export async function enablePush(): Promise<PushSupport | 'denied' | 'ok'> {
  const support = pushSupport()
  if (support !== 'supported') return support

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
    }))

  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys.auth) return 'unsupported'

  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw error

  return 'ok'
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const [{ error }, unsubscribed] = await Promise.all([
    supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint),
    subscription.unsubscribe(),
  ])
  if (error) throw error
  if (!unsubscribed) throw new Error('push unsubscribe failed')
}

export async function isPushEnabled(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (permissionState() !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  return (await registration.pushManager.getSubscription()) !== null
}
