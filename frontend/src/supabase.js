import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://shotdzuirteocjrxiwwq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_V_ms0VOp49Y7nwM2v7tk4A_WVytKUp1'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)