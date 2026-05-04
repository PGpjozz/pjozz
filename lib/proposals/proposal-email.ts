function appOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL;
  if (u) return u.replace(/\/$/, "");
  const v = process.env.VERCEL_URL;
  if (v) return `https://${v.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function buildProposalClientEmailHtml(opts: {
  proposalTitle: string;
  companyName: string;
  publicUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#0a0a0a;font-family:Segoe UI,system-ui,sans-serif;color:#e8e8e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border:1px solid #2a2a3a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#0a2a22,#0a0a0a);border-bottom:1px solid #00e5a055;">
          <div style="font-size:20px;font-weight:700;color:#00e5a0;">Pjozz<span style="color:#fff;">.</span></div>
          <div style="font-size:11px;color:#889;letter-spacing:.08em;margin-top:4px;">SMART SYSTEMS · REAL RESULTS</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:15px;color:#fff;">Hi ${escapeHtml(opts.companyName)},</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#bbb;">
            Your proposal <strong style="color:#fff;">${escapeHtml(opts.proposalTitle)}</strong> is ready. Review it securely online — no login required.
          </p>
          <a href="${opts.publicUrl}" style="display:inline-block;background:#00e5a0;color:#0a0a0a;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:14px;">View proposal</a>
          <p style="margin:24px 0 0;font-size:11px;color:#666;line-height:1.5;">
            If the button doesn’t work, paste this link into your browser:<br/>
            <span style="color:#00e5a0;word-break:break-all;">${opts.publicUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function publicProposalUrl(shareToken: string): string {
  return `${appOrigin()}/p/${encodeURIComponent(shareToken)}`;
}
