export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin)
}

export async function hashPin(pin: string) {
  const data = new TextEncoder().encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
