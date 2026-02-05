/**
 * =============================================
 * SITE-EMAR 2026 – Supabase Client (Frontend Safe)
 * =============================================
 */

/* global supabase */

// Supabase Project Credentials
const SUPABASE_URL = 'https://cikaeialdcyxniwxtmzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2FlaWFsZGN5eG5pd3h0bXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MjMsImV4cCI6MjA4NTYwNTYyM30.BtcIqTyIR4QZLNG6fYq-bQ3pY3xmjITzDTN9Z4SiOvQ';

// Create client
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

/* =========================
   AUTH HELPERS
========================= */

async function getCurrentUser() {
    const { data } = await supabaseClient.auth.getUser();
    return data?.user || null;
}

async function getCurrentSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data?.session || null;
}

async function requireAuth(redirect = "login.html") {
    const session = await getCurrentSession();
    if (!session) {
        window.location.href = redirect;
        return false;
    }
    return true;
}

/* =========================
   ADMIN CHECK (SAFE)
========================= */

async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
        .from("admins")
        .select("*")
        .eq("auth_id", user.id)
        .eq("is_active", true)
        .single();

    if (error) return null;
    return data;
}

/* =========================
   GLOBAL EXPORTS
========================= */

window.supabaseClient = supabaseClient;
window.auth = {
    getCurrentUser,
    getCurrentSession,
    requireAuth,
    isAdmin
};

console.log("✅ Supabase client initialized");
