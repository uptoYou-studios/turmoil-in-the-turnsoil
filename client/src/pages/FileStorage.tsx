import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import SiteLayout from "@/components/SiteLayout";
import { currentSession, isCurrentUserAdmin, isSupabaseConfigured, listAllAssets, onSessionChanged, setAssetPublished, signIn, signOut, uploadAndRegisterAsset, type SiteAsset, type SupabaseSession } from "@/lib/supabase";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const categories = ["images", "logos", "audio", "video", "episodes", "fonts"] as const;
type Category = (typeof categories)[number];
const acceptByCategory: Record<Category, string> = {
  images: ".png,.jpg,.jpeg,.webp,.gif", logos: ".png,.jpg,.jpeg,.webp,.gif",
  audio: ".mp3,.wav,.m4a,.ogg", video: ".mp4,.webm", episodes: ".pdf", fonts: ".ttf,.otf,.woff,.woff2",
};
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileStorage() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [admin, setAdmin] = useState(false);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [category, setCategory] = useState<Category>("images");
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refreshList() {
    setAssets(await listAllAssets());
    window.dispatchEvent(new Event("turnsoil-assets-changed"));
  }

  useEffect(() => {
    let active = true;
    const subscription = onSessionChanged((next) => { if (active) setSession(next); });
    currentSession().then((next) => { if (active) setSession(next); }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Could not restore sign-in."); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session) { setAdmin(false); setAssets([]); if (!checking) setNotice(""); return; }
    setChecking(true);
    isCurrentUserAdmin().then(async (result) => {
      if (!active) return;
      setAdmin(result);
      if (result) {
        try { await refreshList(); }
        catch (error) { if (active) setNotice(error instanceof Error ? error.message : "Could not load uploaded files."); }
        if (active && !result) setNotice("This account is not an administrator.");
      } else if (active) setNotice("This account is signed in but is not listed as a site administrator.");
    }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Could not verify the site-owner account."); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [session]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("Signing in…");
    try { const next = await signIn(email, password); setSession(next); setPassword(""); setNotice("Signed in. Checking owner access…"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Sign in failed."); }
    finally { setBusy(false); }
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setNotice("Choose a file first.");
    if (file.size > MAX_FILE_BYTES) return setNotice("That file exceeds the 50 MB storage limit.");
    setBusy(true); setNotice("Uploading private draft…");
    try {
      const saved = await uploadAndRegisterAsset(file, category);
      setNotice(`${saved.filename} uploaded as a private draft. Publish it when you are ready.`);
      setFile(null); if (fileInput.current) fileInput.current.value = "";
      await refreshList();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed. Check the file and try again."); }
    finally { setBusy(false); }
  }

  async function toggle(asset: SiteAsset) {
    setBusy(true); setNotice("");
    try {
      await setAssetPublished(asset.id, !asset.is_published);
      await refreshList();
      setNotice(asset.is_published ? "Asset unpublished; its public link is no longer issued." : "Asset published on the public site.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update publication status."); }
    finally { setBusy(false); }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setNotice(selected && selected.size > MAX_FILE_BYTES ? "That file exceeds the 50 MB storage limit." : "");
  }

  async function onLogout() { await signOut(); setSession(null); setNotice("Signed out."); }

  return <SiteLayout><section aria-labelledby="storage-heading">
    <h2 id="storage-heading">File Storage</h2>
    {!isSupabaseConfigured ? <>
      <p>The backend is not configured yet. Follow the setup guide and add your Supabase project URL and public anon key to the GitHub Actions repository variables.</p>
      <p><small>Never place a service-role or secret key in this site, GitHub repository, or any VITE_ variable.</small></p>
    </> : checking ? <p>Checking sign-in…</p> : !session ? <>
      <p>Sign in with the site-owner account to manage uploads. Create that account in Supabase Authentication first.</p>
      <form onSubmit={onLogin} className="file-upload-form">
        <p><label htmlFor="owner-email">Email: </label><input id="owner-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></p>
        <p><label htmlFor="owner-password">Password: </label><input id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></p>
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      {notice && <p role="status">{notice}</p>}
    </> : !admin ? <>
      <p>This account is signed in but is not listed as a site administrator. Add its user ID to the Supabase <code>site_admins</code> table as described in the setup guide.</p>
      <button type="button" onClick={onLogout}>Sign out</button>
      {notice && <p role="status">{notice}</p>}
    </> : <>
      <p>Upload images, logos, episode PDFs, audio, video, or fonts. New files are private until you publish them.</p>
      <p><small>Use matching filenames from <code>client/src/site-content.json</code> (for example <code>ep0.pdf</code> or <code>yanagi.png</code>). Supabase Free allows files up to 50 MB each. Publish the latest matching filename to replace the public version.</small></p>
      <form className="file-upload-form" onSubmit={onUpload}>
        <p><label htmlFor="asset-category">File type: </label><select id="asset-category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></p>
        <p><label htmlFor="asset-file">Choose file: </label><input ref={fileInput} id="asset-file" type="file" accept={acceptByCategory[category]} onChange={onFileChange} /></p>
        {file && <p><small>Selected: {file.name} ({formatBytes(file.size)})</small></p>}
        <button type="submit" disabled={!file || busy}>{busy ? "Working…" : "Upload as private draft"}</button>
      </form>
      {notice && <p role="status"><b>{notice}</b></p>}
      <h3>Uploaded files</h3>
      {assets.length ? <ul className="stored-asset-list">{assets.map((asset) => <li className="stored-asset" key={asset.id}><div><b>{asset.filename}</b><div><small>{asset.category} · {asset.mime_type} · {formatBytes(asset.size_bytes)}</small></div><div><small>Status: {asset.is_published ? "Published on site" : "Private draft"}</small></div></div><button type="button" disabled={busy} onClick={() => toggle(asset)}>{asset.is_published ? "Unpublish" : "Publish on site"}</button></li>)}</ul> : <p>No files uploaded yet.</p>}
      <p><small>Unpublishing stops the site from issuing a public file link. It does not delete the stored file; delete it in Supabase Storage to free space.</small></p>
      <button type="button" onClick={onLogout}>Sign out</button>
    </>}
  </section></SiteLayout>;
}
