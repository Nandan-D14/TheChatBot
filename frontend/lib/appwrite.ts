import { Client, Account, Databases } from 'appwrite'

// Appwrite client configuration
export const client = new Client()
    .setEndpoint("https://sgp.cloud.appwrite.io/v1")
    .setProject("69bd76f0003bc4dbe918");

export const account = new Account(client)
export const databases = new Databases(client)

// Database and collection IDs
export const DATABASE_ID = 'chatbot_db'
export const SESSIONS_COLLECTION = 'sessions'
export const MESSAGES_COLLECTION = 'messages'
export const MEMORY_COLLECTION = 'memory'

// Helper functions
export function getClient() {
  return client
}

export function isConfigured(): boolean {
  // Configuration is now hardcoded, so always return true
  return true
}
