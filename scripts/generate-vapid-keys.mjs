// Generates a VAPID key pair for Web Push.
//   node scripts/generate-vapid-keys.mjs
// Put the public key in VITE_VAPID_PUBLIC_KEY and the private key in the
// Supabase Edge Function secret VAPID_PRIVATE_KEY. Never commit the private key.
import { webcrypto } from 'node:crypto'

const base64url = (buffer) =>
  Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])

const publicKey = base64url(await webcrypto.subtle.exportKey('raw', pair.publicKey))
const jwk = await webcrypto.subtle.exportKey('jwk', pair.privateKey)

console.log('VITE_VAPID_PUBLIC_KEY=%s', publicKey)
console.log('VAPID_PRIVATE_KEY=%s', jwk.d)

// The Edge Functions read all three of VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY and
// VAPID_SUBJECT. Omitting the public key leaves push silently broken, so set all three.
console.log('\nSet the Edge Function secrets:')
console.log(
  '  supabase secrets set VAPID_PRIVATE_KEY=%s VAPID_PUBLIC_KEY=%s VAPID_SUBJECT=mailto:you@example.com',
  jwk.d,
  publicKey,
)
