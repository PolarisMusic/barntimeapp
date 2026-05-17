// Tiny transactional-email helper. If RESEND_API_KEY is unset we no-op,
// which keeps local dev working without configuring an email provider.
//
// To enable: set RESEND_API_KEY (https://resend.com) and EMAIL_FROM to a
// verified sender (e.g. "Barntime <tickets@yourdomain.com>").

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendTransactionalEmail(args: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email:skip] would send "${args.subject}" to ${args.to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email:error]", res.status, body);
    }
  } catch (err) {
    console.error("[email:error]", err);
  }
}

export function ticketConfirmationEmail(args: {
  eventName: string;
  eventStart: string | null;
  seatLines: string[];
  eventUrl: string;
  myTicketsUrl: string;
}): { subject: string; html: string; text: string } {
  const dateLine = args.eventStart
    ? new Date(args.eventStart).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const subject = `You're in: ${args.eventName}`;
  const text = [
    `You're in!`,
    ``,
    `${args.eventName}`,
    dateLine,
    ``,
    `Confirmed seats:`,
    ...args.seatLines.map((s) => `  - ${s}`),
    ``,
    `Event page: ${args.eventUrl}`,
    `My tickets: ${args.myTicketsUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h1 style="margin:0 0 8px;font-size:24px">You're in 🎉</h1>
      <p style="margin:0 0 4px;color:#374151">
        <strong>${escapeHtml(args.eventName)}</strong>
      </p>
      ${dateLine ? `<p style="margin:0 0 16px;color:#6b7280">${escapeHtml(dateLine)}</p>` : ""}
      <p style="margin:16px 0 4px;color:#374151"><strong>Confirmed seats</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#111">
        ${args.seatLines.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ul>
      <p style="margin:0 0 8px"><a href="${escapeAttr(args.myTicketsUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">View my tickets</a></p>
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px">
        Address is revealed close to the event. We'll send updates here.
      </p>
    </div>
  `;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
