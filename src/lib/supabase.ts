import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ✅ Only throw an error in the browser, not during the Next.js build process
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    `Missing Supabase Environment Variables.\nDid you create a .env.local file in the ROOT of your project?\nIt must contain:\nNEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_ANON_KEY=...\nIf you just added it, RESTART your terminal server (Ctrl+C, then npm run dev).`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)