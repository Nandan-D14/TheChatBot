import { Client, Account, Databases } from 'appwrite'

let client: Client | null = null

// Database and collection IDs
export const DATABASE_ID = 'chatbot_db'
export const SESSIONS_COLLECTION = 'sessions'
export const MESSAGES_COLLECTION = 'messages'
export const MEMORY_COLLECTION = 'memory'

// Helper functions
export function getClient() {
  if (!client) {
    client = new Client()
      .setEndpoint('https://sgp.cloud.appwrite.io/v1')
      .setProject('69bd76f0003bc4dbe918')
  }
  return client
}

export function getAccount() {
  return new Account(getClient())
}

export function getDatabases() {
  return new Databases(getClient())
}

export function isConfigured(): boolean {
  // Configuration is now hardcoded, so always return true
  return true
}
