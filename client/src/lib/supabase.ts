import { createClient, type Session } from "@supabase/supabase-js";

export type SupabaseSession = Session;
export type SiteAsset = {
  id: string;
  filename: string;
  file_path?: string;
  category: string;
  mime_type: string;
  size_bytes: number;
  is_published: boolean;
  uploaded_by?: string;
  created_at: string;
  url?: string;
};

const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const formspreeEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
export const isSupabaseConfigured = Boolean(projectUrl && anonKey);
export const isFormspreeConfigured = Boolean(formspreeEndpoint && /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(formspreeEndpoint));
export const isNewsletterConfigured = isSupabaseConfigured || isFormspreeConfigured;

// The anon/publishable key is intentionally public. Row Level Security in
// supabase/schema.sql is the security boundary; never put a service key here.
export const supabase = createClient(
  projectUrl || "https://setup-required.supabase.co",
  anonKey || "setup-required-public-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

function ensureConfigured() {
  if (!isSupabaseConfigured) throw new Error("Backend is not configured yet. Add the Supabase URL and public anon key to the GitHub Actions variables.");
}

export async function currentSession(): Promise<SupabaseSession | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onSessionChanged(callback: (session: SupabaseSession | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session)).data.subscription;
}

export async function signIn(email: string, password: string) {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function isCurrentUserAdmin(session?: SupabaseSession | null) {
  if (session === undefined) session = (await supabase.auth.getSession()).data.session;
  if (!session) return false;
  const { data, error } = await supabase.from("site_admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listPublishedAssets(): Promise<SiteAsset[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.functions.invoke("public-assets", { method: "GET" });
  if (error) throw error;
  return (data ?? []) as SiteAsset[];
}

export async function listAllAssets() {
  ensureConfigured();
  const { data, error } = await supabase.from("site_assets").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as SiteAsset[];
}

export async function uploadAndRegisterAsset(file: File, category: string) {
  ensureConfigured();
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const session = authData.session;
  if (!session) throw new Error("Your sign-in expired. Please sign in again.");
  const safeName = file.name.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "upload";
  const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream",
  });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from("site_assets").insert({
    filename: safeName,
    file_path: path,
    category,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    is_published: false,
    uploaded_by: session.user.id,
  }).select("*").single();
  if (error) {
    await supabase.storage.from("site-assets").remove([path]);
    throw error;
  }
  return data as SiteAsset;
}

export async function setAssetPublished(id: string, isPublished: boolean) {
  ensureConfigured();
  const { error } = await supabase.from("site_assets").update({ is_published: isPublished }).eq("id", id);
  if (error) throw error;
}

export async function listSubscribers() {
  ensureConfigured();
  const { data, error } = await supabase.from("newsletter_subscribers").select("id,email,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Array<{ id: string; email: string; created_at: string }>;
}

export async function subscribeEmail(email: string, honeypot = "") {
  if (honeypot) return { savedInDatabase: false, forwarded: false, forwardingConfigured: isFormspreeConfigured, ignoredAsSpam: true };
  if (!isNewsletterConfigured) throw new Error("Email signups are not connected yet.");

  const normalizedEmail = email.trim().toLowerCase();
  let savedInDatabase = false;
  let forwarded = false;
  let lastError: unknown;

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      { email: normalizedEmail },
      { onConflict: "email", ignoreDuplicates: true },
    );
    if (error) lastError = error;
    else savedInDatabase = true;
  }

  if (isFormspreeConfigured && formspreeEndpoint) {
    try {
      const response = await fetch(formspreeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: normalizedEmail, _subject: "New Turmoil in the Turnsoil signup" }),
      });
      if (!response.ok) throw new Error("Formspree could not accept the signup.");
      forwarded = true;
    } catch (error) {
      lastError = error;
    }
  }

  if (!savedInDatabase && !forwarded) {
    throw lastError instanceof Error ? lastError : new Error("Could not save or forward your signup.");
  }

  return { savedInDatabase, forwarded, forwardingConfigured: isFormspreeConfigured, ignoredAsSpam: false };
}
