import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { siteContent, type ImageAsset } from "@/content";
import staticAssets from "@/static-asset-manifest.json";
import { currentSession, isCurrentUserAdmin, isFormspreeConfigured, isNewsletterConfigured, isSupabaseConfigured, listPublishedAssets, onSessionChanged, signOut, subscribeEmail, type SiteAsset, type SupabaseSession } from "@/lib/supabase";

export type StoredSiteAsset = {
  filename: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

const base = import.meta.env.BASE_URL || "/";
const staticAssetRows = (staticAssets as StoredSiteAsset[]).map(asset => ({
  ...asset,
  url: asset.url && !asset.url.startsWith("http") ? base + asset.url.replace(/^\/+/, "") : asset.url
}));
const PublishedAssetsContext = createContext<Record<string, StoredSiteAsset>>({});

export function useStoredSiteAsset(filename: string) {
  return useContext(PublishedAssetsContext)[filename];
}

function uploadedFontFormat(mimeType: string, fallback: string) {
  return ({
    "font/ttf": "truetype",
    "font/otf": "opentype",
    "font/woff": "woff",
    "font/woff2": "woff2",
  } as Record<string, string>)[mimeType] ?? fallback;
}

export function Asset({ asset, alt, className = "" }: { asset: ImageAsset; alt: string; className?: string }) {
  const stored = useStoredSiteAsset(asset.filename);
  const src = asset.url || stored?.url;
  if (src) return <img className={`asset-image ${className}`} src={src} alt={alt} />;
  return <span className={`asset-placeholder ${className}`} role="img" aria-label={`${alt} image not added yet`}>[ {asset.filename} ]</span>;
}

export function Newsletter({ id }: { id: string }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    const trap = String(data.get("website") ?? "");
    setBusy(true);
    setNotice("Saving your signup…");
    try {
      const result = await subscribeEmail(email, trap);
      form.reset();
      if (result.forwarded && result.savedInDatabase) setNotice("Thanks! You’re on the update list, and the signup was forwarded to the creator.");
      else if (result.forwarded) setNotice("Thanks! Your signup was forwarded to the creator.");
      else if (result.savedInDatabase && result.forwardingConfigured) setNotice("Your address was saved, but the notification email could not be sent. Please try again later.");
      else if (result.savedInDatabase) setNotice("Thanks! You’re on the update list. Email forwarding is not connected yet.");
      else if (result.ignoredAsSpam) setNotice("Thanks! Your signup was received.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save your signup. Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="newsletter" aria-label={siteContent.newsletter.heading}>
      <h3>{siteContent.newsletter.heading}:</h3>
      <p>{siteContent.newsletter.prompt}</p>
      {isNewsletterConfigured ? (
        <>
          <form onSubmit={onSubmit}>
            <label htmlFor={`email-${id}`}>Email: </label>
            <input id={`email-${id}`} name="email" type="email" autoComplete="email" required maxLength={320} />{" "}
            <label className="newsletter-honeypot" aria-hidden="true">Leave this blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : "Subscribe"}</button>
          </form>
          <p role="status"><small>{notice || (isSupabaseConfigured && isFormspreeConfigured ? "Your email is saved for episode updates; Formspree also forwards signups to the creator." : isSupabaseConfigured ? "Your email is stored for episode updates. Email forwarding is optional." : "Your signup will be forwarded to the creator by Formspree.")}</small></p>
        </>
      ) : (
        <>
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor={`email-${id}`}>Email: </label>
            <input id={`email-${id}`} name={`email-${id}`} type="email" autoComplete="email" required disabled />{" "}
            <button type="submit" disabled>Subscribe</button>
          </form>
          <p><small>Email signups are disabled until Supabase or Formspree is configured in GitHub Actions.</small></p>
        </>
      )}
    </section>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isGitHubPages = import.meta.env.VITE_GITHUB_PAGES === "true";
  const [supabaseAssets, setSupabaseAssets] = useState<SiteAsset[]>([]);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const authSubscription = onSessionChanged((nextSession) => { if (active) setSession(nextSession); });
    void currentSession().then((nextSession) => { if (active) setSession(nextSession); }).catch((error) => console.error("Could not restore sign-in", error));
    const load = () => listPublishedAssets().then((assets) => { if (active) setSupabaseAssets(assets); }).catch((error) => console.error("Could not load published assets", error));
    window.addEventListener("turnsoil-assets-changed", load);
    void load();
    return () => {
      active = false;
      authSubscription.unsubscribe();
      window.removeEventListener("turnsoil-assets-changed", load);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session || !isSupabaseConfigured) { setIsAdmin(false); return; }
    isCurrentUserAdmin().then((admin) => { if (active) setIsAdmin(admin); }).catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [session]);

  const assetsByFilename = useMemo(() => {
    const byFilename: Record<string, StoredSiteAsset> = {};
    if (isGitHubPages) {
      for (const asset of staticAssetRows) {
        let assetUrl = asset.url;
        if (!assetUrl) {
          assetUrl = base + asset.filename;
        } else if (!assetUrl.startsWith("http")) {
          assetUrl = base + assetUrl.replace(/^\/+/, "");
        }
        byFilename[asset.filename] = {
        ...asset,
        url: `${import.meta.env.BASE_URL}site-assets/${encodeURIComponent(asset.filename)}`,
      };
    }
    const seenSupabase = new Set<string>();
    for (const asset of supabaseAssets) {
      if (asset.url && !seenSupabase.has(asset.filename)) {
        seenSupabase.add(asset.filename);
        byFilename[asset.filename] = {
        filename: asset.filename,
        category: asset.category,
        mimeType: asset.mime_type,
        sizeBytes: asset.size_bytes,
        url: asset.url,
        };
      }
    }
    return byFilename;
  }, [isGitHubPages, supabaseAssets]);
  const fonts = siteContent.assets.fonts;
  const titleFontAsset = assetsByFilename[fonts.title.filename];
  const bodyFontAsset = assetsByFilename[fonts.body.filename];
  const emphasisFontAsset = assetsByFilename[fonts.emphasis.filename];
  const fontRules = [
    fonts.title.url && `@font-face { font-family: 'TurnsoilTitle'; src: url('${fonts.title.url}') format('${fonts.title.format}'); font-display: swap; }`,
    titleFontAsset?.url && `@font-face { font-family: 'TurnsoilTitle'; src: url('${titleFontAsset.url}') format('${uploadedFontFormat(titleFontAsset.mimeType, fonts.title.format)}'); font-display: swap; }`,
    bodyFontAsset?.url && `@font-face { font-family: 'TurnsoilBody'; src: url('${bodyFontAsset.url}') format('${uploadedFontFormat(bodyFontAsset.mimeType, fonts.body.format)}'); font-display: swap; }`,
    emphasisFontAsset?.url && `@font-face { font-family: 'TurnsoilEmphasis'; src: url('${emphasisFontAsset.url}') format('${uploadedFontFormat(emphasisFontAsset.mimeType, fonts.emphasis.format)}'); font-display: swap; }`,
    fonts.body.url && `@font-face { font-family: 'TurnsoilBody'; src: url('${fonts.body.url}') format('${fonts.body.format}'); font-display: swap; }`,
    fonts.emphasis.url && `@font-face { font-family: 'TurnsoilEmphasis'; src: url('${fonts.emphasis.url}') format('${fonts.emphasis.format}'); font-display: swap; }`,
  ].filter(Boolean).join("\n");

  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  async function logout() { await signOut(); setSession(null); }

  return (
    <PublishedAssetsContext.Provider value={assetsByFilename}>
      <div className="page">
        {fontRules && <style>{fontRules}</style>}
        <header className="site-header">
          <Link href="/" aria-label={`${siteContent.title} home`}>
            <Asset asset={siteContent.assets.logoVertical} alt="UPTOYOU STUDIOS vertical logo" className="logo-vertical" />
          </Link>
          <h1 className="site-title">{siteContent.title}</h1>
          <p>{siteContent.studioName}</p>
        </header>
        <hr />
        <nav aria-label="Main navigation">
          {siteContent.navigation.map((item, index) => <span key={item.href}>{index > 0 && " | "}<Link href={item.href} aria-current={location === item.href ? "page" : undefined}>{item.label}</Link></span>)}
          {isGitHubPages && isSupabaseConfigured && <span> | <Link href="/file-storage">File Storage</Link>{isAdmin && <> | <Link href="/subscribers">Subscribers</Link> | <button type="button" className="text-link" onClick={logout}>Sign out</button></>}</span>}
          {!isGitHubPages && session && isAdmin && <span> | <Link href="/file-storage">File Storage</Link></span>}
        </nav>
        <hr />
        <main className="route-content">{children}</main>
        <hr />
        <footer><p>{siteContent.studioName} · {siteContent.title}</p><p><Link href="/">Back to Home</Link></p></footer>
      </div>
    </PublishedAssetsContext.Provider>
  );
}
