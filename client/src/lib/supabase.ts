import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(projectUrl && anonKey);

// 100% free serverless newsletter endpoint sending straight to your iCloud
const freeNewsletterEndpoint = "https://formsubmit.co/ajax/peterturner824@icloud.com";
export const isNewsletterConfigured = true;

// Clean Supabase client initialization
export const supabase = createClient(
  projectUrl || "https://setup-required.supabase.co",
  anonKey || "setup-required-public-key",
);

export async function subscribeEmail(email: string, honeypot = "") {
  if (honeypot) return { savedInDatabase: false, forwarded: false, forwardingConfigured: true, ignoredAsSpam: true };

  const normalizedEmail = email.trim().toLowerCase();
  let savedInDatabase = false;
  let forwarded = false;
  let lastError: unknown;

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("subscribers").upsert(
      { email: normalizedEmail },
      { onConflict: "email", ignoreDuplicates: true },
    );
    if (error) lastError = error;
    else savedInDatabase = true;
  }

  try {
    const response = await fetch(freeNewsletterEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: normalizedEmail, _subject: "New Turmoil in the Turnsoil signup" }),
    });
    if (!response.ok) throw new Error("Serverless form handler could not accept the signup.");
    forwarded = true;
  } catch (error) {
    lastError = error;
  }

  if (!savedInDatabase && !forwarded) {
    throw lastError instanceof Error ? lastError : new Error("Could not save or forward your signup.");
  }

  return { savedInDatabase, forwarded, forwardingConfigured: true, ignoredAsSpam: false };
}

export const isFormspreeConfigured = false;
