import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://shotdzuirteocjrxiwwq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_V_ms0VOp49Y7nwM2v7tk4A_WVytKUp1'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] Missing env vars. Create frontend/.env with:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  )
}


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)