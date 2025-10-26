import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vekzbptyhnbstckyvhyg.supabase.co"; // <-- from Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla3picHR5aG5ic3Rja3l2aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjkwNjgsImV4cCI6MjA3NzAwNTA2OH0.CEiyFxdbuM2XkiOHLHPEdLyOq7UEhsHhatEmGOuamQQ"; // <-- from anon public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
