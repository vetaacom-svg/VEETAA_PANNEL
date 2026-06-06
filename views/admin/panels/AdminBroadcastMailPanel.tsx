import React, { useMemo, useState, useCallback } from 'react';
import { Mail, Copy, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import type { UserProfile } from '../../../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
/** Limite prudente pour l’URL Gmail (sinon copier-coller). */
const GMAIL_URL_SAFE_MAX = 1700;

function normalizeEmail(raw: string | undefined | null): string | null {
   if (!raw || typeof raw !== 'string') return null;
   const t = raw.trim();
   if (!t || !EMAIL_RE.test(t)) return null;
   return t.toLowerCase();
}

function buildGmailComposeUrl(opts: { bcc: string[]; subject?: string; body?: string }): string {
   const params = new URLSearchParams();
   params.set('view', 'cm');
   params.set('fs', '1');
   params.set('tf', '1');
   if (opts.bcc.length) params.set('bcc', opts.bcc.join(','));
   if (opts.subject?.trim()) params.set('su', opts.subject.trim());
   if (opts.body?.trim()) params.set('body', opts.body.trim());
   return `https://mail.google.com/mail/?${params.toString()}`;
}

export type AdminBroadcastMailPanelProps = {
   users: UserProfile[];
   darkMode?: boolean;
};

const AdminBroadcastMailPanel: React.FC<AdminBroadcastMailPanelProps> = ({ users, darkMode = false }) => {
   const [subject, setSubject] = useState('');
   const [body, setBody] = useState('');
   const [copied, setCopied] = useState(false);

   const { emails, withoutEmailCount } = useMemo(() => {
      const set = new Set<string>();
      let noMail = 0;
      for (const u of users) {
         const e = normalizeEmail(u.email);
         if (e) set.add(e);
         else noMail += 1;
      }
      return { emails: Array.from(set).sort((a, b) => a.localeCompare(b)), withoutEmailCount: noMail };
   }, [users]);

   const gmailUrl = useMemo(() => buildGmailComposeUrl({ bcc: emails, subject, body }), [emails, subject, body]);
   const urlTooLong = gmailUrl.length > GMAIL_URL_SAFE_MAX;

   const copyEmails = useCallback(async () => {
      const text = emails.join(', ');
      try {
         await navigator.clipboard.writeText(text);
         setCopied(true);
         window.setTimeout(() => setCopied(false), 2000);
      } catch {
         /* ignore */
      }
   }, [emails]);

   const openGmail = useCallback(() => {
      if (emails.length === 0) return;
      if (urlTooLong) {
         void copyEmails();
         window.open('https://mail.google.com/mail/?view=cm&fs=1&tf=1', '_blank', 'noopener,noreferrer');
         return;
      }
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
   }, [emails.length, urlTooLong, gmailUrl, copyEmails]);

   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-6">
         <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-800 bg-slate-950/60 text-slate-100' : 'border-slate-100 bg-white'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
               <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                     <Mail size={22} strokeWidth={2.25} />
                  </div>
                  <div>
                     <h2 className={`text-lg font-black tracking-tight sm:text-xl ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Annonce par e-mail</h2>
                     <p className={`mt-1 max-w-2xl text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Préparez un message puis ouvrez Gmail avec toutes les adresses des clients en <strong className="text-slate-700">copie
                        invisible (CCI)</strong>, pour protéger les adresses entre elles.
                     </p>
                  </div>
               </div>
            </div>
         </section>

         <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`rounded-2xl border p-5 shadow-sm lg:col-span-2 ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h3 className={`text-sm font-black ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Message (optionnel)</h3>
               <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Préremplit l’objet et le corps dans Gmail si l’URL reste assez courte.</p>
               <div className="mt-4 space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objet</label>
                     <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex. Nouveauté Veetaa — livraison"
                        className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/25 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-slate-50/50 focus:bg-white'}`}
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corps</label>
                     <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={6}
                        placeholder="Bonjour,&#10;&#10;…"
                        className={`mt-1.5 w-full resize-y rounded-xl border px-4 py-3 text-sm font-medium outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/25 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-slate-50/50 focus:bg-white'}`}
                     />
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className={`rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
                  <h3 className={`text-sm font-black ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Destinataires</h3>
                  <p className={`mt-2 text-3xl font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{emails.length}</p>
                  <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>e-mails uniques (clients)</p>
                  {withoutEmailCount > 0 && (
                     <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {withoutEmailCount} profil(s) sans e-mail valide (ignorés).
                     </p>
                  )}
               </div>

               <div className={`rounded-2xl border p-5 shadow-sm ${darkMode ? 'border-orange-900/30 bg-orange-900/10' : 'border-orange-100 bg-orange-50/50'}`}>
                  {urlTooLong && emails.length > 0 && (
                     <p className="mb-3 flex items-start gap-2 text-xs font-medium text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Trop d’adresses pour une seule URL Gmail. Le bouton ci-dessous copie la liste, puis ouvre Gmail : collez les
                        adresses dans le champ CCI.
                     </p>
                  )}
                  <button
                     type="button"
                     disabled={emails.length === 0}
                     onClick={openGmail}
                     className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     <ExternalLink size={18} />
                     Ouvrir Gmail — envoi
                  </button>
                  <button
                     type="button"
                     disabled={emails.length === 0}
                     onClick={() => void copyEmails()}
                     className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-300/60 hover:text-orange-300' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'}`}
                  >
                     {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                     {copied ? 'Copié' : 'Copier les e-mails (CCI)'}
                  </button>
               </div>
            </div>
         </div>

         <section className={`rounded-2xl border p-4 text-sm ${darkMode ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-100 bg-slate-50/60 text-slate-600'}`}>
            <p className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>À savoir</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed sm:text-sm">
               <li>Vous devez être connecté à votre compte Gmail dans le navigateur.</li>
               <li>Les adresses sont issues du champ <code className="rounded bg-white px-1">email</code> des fiches clients.</li>
               <li>En cas de liste très longue, utilisez « Copier les e-mails » puis collez-les dans le champ CCI de Gmail.</li>
            </ul>
         </section>
      </div>
   );
};

export default AdminBroadcastMailPanel;
