const FALLBACK_USER_ID = `demo_user_${Math.random().toString(36).slice(2, 10)}`

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getUserIdSafe(): string | null {
  if (!canUseStorage()) {
    return FALLBACK_USER_ID
  }

  try {
    return localStorage.getItem('temp_user_id') || localStorage.getItem('user_id') || FALLBACK_USER_ID
  } catch {
    return FALLBACK_USER_ID
  }
}

export function ensureTempUserIdSafe(): string {
  if (!canUseStorage()) {
    return FALLBACK_USER_ID
  }

  try {
    const existingUserId = localStorage.getItem('user_id')
    if (existingUserId) {
      return existingUserId
    }

    let tempUserId = localStorage.getItem('temp_user_id')
    if (!tempUserId) {
      tempUserId = FALLBACK_USER_ID
      localStorage.setItem('temp_user_id', tempUserId)
    }

    return tempUserId
  } catch {
    return FALLBACK_USER_ID
  }
}
