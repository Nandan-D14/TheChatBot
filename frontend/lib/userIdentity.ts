const ACCESS_KEY_STORAGE_KEY = 'chatbot_access_key'
const ACCESS_KEY_EXPIRY_STORAGE_KEY = 'chatbot_access_key_expires_at'
const ACCESS_KEY_TTL_MS = 60 * 60 * 1000

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getExpectedAccessKey(): string {
  return process.env.NEXT_PUBLIC_APP_ACCESS_KEY?.trim() || 'PES2UG23CS363'
}

export function clearStoredAccessKey(): void {
  if (!canUseStorage()) {
    return
  }

  try {
    localStorage.removeItem(ACCESS_KEY_STORAGE_KEY)
    localStorage.removeItem(ACCESS_KEY_EXPIRY_STORAGE_KEY)
  } catch {
    // Ignore storage errors and treat as logged out.
  }
}

export function setAccessKeyForOneHour(accessKey: string): void {
  if (!canUseStorage()) {
    return
  }

  const expiresAt = Date.now() + ACCESS_KEY_TTL_MS
  localStorage.setItem(ACCESS_KEY_STORAGE_KEY, accessKey)
  localStorage.setItem(ACCESS_KEY_EXPIRY_STORAGE_KEY, String(expiresAt))
}

export function getStoredAccessKey(): string | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const accessKey = localStorage.getItem(ACCESS_KEY_STORAGE_KEY)
    const expiresAtRaw = localStorage.getItem(ACCESS_KEY_EXPIRY_STORAGE_KEY)

    if (!accessKey || !expiresAtRaw) {
      clearStoredAccessKey()
      return null
    }

    const expiresAt = Number(expiresAtRaw)
    if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
      clearStoredAccessKey()
      return null
    }

    return accessKey
  } catch {
    clearStoredAccessKey()
    return null
  }
}

export function hasValidAccessKey(): boolean {
  return !!getStoredAccessKey()
}

export function isAccessKeyValid(accessKey: string): boolean {
  return accessKey.trim() === getExpectedAccessKey()
}

export function getAuthHeaders(): Record<string, string> {
  const key = getStoredAccessKey()
  if (!key) {
    return {}
  }

  return { 'x-app-access-key': key }
}
