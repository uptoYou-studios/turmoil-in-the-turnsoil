import { useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { currentSession, isCurrentUserAdmin, isSupabaseConfigured, listSubscribers, onSessionChanged, type SupabaseSession } from "@/lib/supabase";

type Subscriber = { id: string; email: string; created_at: string };

export default function Subscribers() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [admin, setAdmin] = useState(false);
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [notice, setNotice] = useState("Checking owner access…");
  useEffect(() => {
    let active = true;
    const subscription = onSessionChanged((next) => { if (active) setSession(next); });
    currentSession().then((next) => { if (active) setSession(next); }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Could not restore sign-in."); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setNotice("The backend is not configured yet."); return; }
    if (!session) { setAdmin(false); setRows([]); setNotice("Sign in from the File Storage page first."); return; }
    isCurrentUserAdmin().then(async (isAdmin) => {
      if (!active) return;
      setAdmin(isAdmin);
      if (!isAdmin) { setNotice("This page is only available to the site owner."); return; }
      try { const result = await listSubscribers(); if (active) { setRows(result); setNotice(`${result.length} signup${result.length === 1 ? "" : "s"} saved.`); } }
      catch (error) { if (active) setNotice(error instanceof Error ? error.message : "Could not load subscriber list."); }
    }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Could not verify owner access."); });
    return () => { active = false; };
  }, [session]);

  function downloadCsv() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["email,subscribed_at", ...rows.map((row) => `${quote(row.email)},${quote(row.created_at)}`)].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "turnsoil-subscribers.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <SiteLayout><section aria-labelledby="subscribers-heading"><h2 id="subscribers-heading">Subscribers</h2><p role="status">{notice}</p>{admin && <><p><small>These addresses are stored for your update list. This page does not send emails or subscribe contacts to an external email-marketing service.</small></p><button type="button" onClick={downloadCsv} disabled={!rows.length}>Download CSV</button>{rows.length > 0 ? <ol>{rows.map((row) => <li key={row.id}>{row.email} <small>· {new Date(row.created_at).toLocaleDateString()}</small></li>)}</ol> : <p>No subscribers yet.</p>}</>}</section></SiteLayout>;
}
