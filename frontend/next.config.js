/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  turbopack: {
    root: 'C:\\Users\\nanda\\OneDrive\\Desktop\\TheChatBot\\frontend',
  },
}

module.exports = nextConfig