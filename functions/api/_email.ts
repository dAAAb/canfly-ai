/**
 * System email notifications via Cloudflare Email Routing (CAN-283).
 *
 * Sends buyer-facing emails from hi@canfly.ai when tasks are completed.
 * Requires `send_email` binding configured in wrangler.toml and
 * Cloudflare Email Routing enabled for the canfly.ai domain.
 */
import { createMimeMessage } from 'mimetext'
import { deriveViewToken } from './_crypto'

const SYSTEM_EMAIL = 'hi@canfly.ai'
const SYSTEM_NAME = 'CanFly.ai'
const DEFAULT_SITE_URL = 'https://canfly.ai'

interface TaskCompletionEmailOpts {
  taskId: string
  skillName: string
  sellerAgent: string
  completedAt: string
  executionMs: number | null
  resultUrl: string | null
  buyerEmail: string
  siteUrl?: string
  encryptionKey?: string
}

/** Format execution time for display */
function formatExecTime(ms: number | null): string {
  if (ms == null) return 'N/A'
  if (ms < 60_000) return `${Math.round(ms / 1000)} seconds`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} minutes`
  return `${Math.round(ms / 3_600_000)} hours`
}

/** Format ISO date for display */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

/** Build the task result page URL with optional view token */
async function buildResultPageUrl(
  taskId: string,
  siteUrl: string,
  encryptionKey?: string,
): Promise<string> {
  const base = `${siteUrl}/tasks/${taskId}`
  if (!encryptionKey) return base
  const token = await deriveViewToken(taskId, encryptionKey)
  return `${base}?token=${token}`
}

/** Generate the HTML email body */
function buildHtmlBody(opts: TaskCompletionEmailOpts & { resultPageUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

<!-- Header -->
<tr><td style="background:#0f172a;padding:24px 32px;text-align:center">
  <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px">CanFly.ai</span>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px">
  <p style="margin:0 0 8px;font-size:14px;color:#64748b">Task Completed</p>
  <h1 style="margin:0 0 24px;font-size:22px;color:#0f172a;font-weight:700">${escapeHtml(opts.skillName)}</h1>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#94a3b8;width:120px">Seller</td>
      <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:500">${escapeHtml(opts.sellerAgent)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9">Completed</td>
      <td style="padding:8px 0;font-size:14px;color:#1e293b;border-top:1px solid #f1f5f9">${formatDate(opts.completedAt)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9">Duration</td>
      <td style="padding:8px 0;font-size:14px;color:#1e293b;border-top:1px solid #f1f5f9">${formatExecTime(opts.executionMs)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9">Task ID</td>
      <td style="padding:8px 0;font-size:14px;color:#1e293b;font-family:monospace;border-top:1px solid #f1f5f9">${opts.taskId.slice(0, 12)}...</td>
    </tr>
  </table>

  <!-- CTA Button -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px 0 24px">
      <a href="${escapeHtml(opts.resultPageUrl)}"
         style="display:inline-block;padding:12px 32px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
        View Result
      </a>
    </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
    If you have questions, reply to this email or visit
    <a href="${escapeHtml(opts.siteUrl || DEFAULT_SITE_URL)}" style="color:#2563eb;text-decoration:none">canfly.ai</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
  <p style="margin:0;font-size:11px;color:#94a3b8">
    CanFly.ai &mdash; Now You Can Fly
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

/** Build plain-text fallback */
function buildTextBody(opts: TaskCompletionEmailOpts & { resultPageUrl: string }): string {
  return [
    `Your task is complete!`,
    ``,
    `Skill: ${opts.skillName}`,
    `Seller: ${opts.sellerAgent}`,
    `Completed: ${formatDate(opts.completedAt)}`,
    `Duration: ${formatExecTime(opts.executionMs)}`,
    `Task ID: ${opts.taskId}`,
    ``,
    `View your result:`,
    opts.resultPageUrl,
    ``,
    `— CanFly.ai`,
  ].join('\n')
}

/** Escape HTML special characters */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Send a task completion notification email to the buyer.
 *
 * Uses Cloudflare Email Routing via the `send_email` binding.
 * Falls back gracefully if the binding is not configured.
 */
export async function sendBuyerCompletionEmail(
  env: { SEND_EMAIL?: { send: (msg: unknown) => Promise<void> }; CANFLY_SITE_URL?: string; ENCRYPTION_KEY?: string },
  opts: Omit<TaskCompletionEmailOpts, 'siteUrl' | 'encryptionKey'>,
): Promise<{ sent: boolean; error?: string }> {
  if (!env.SEND_EMAIL) {
    return { sent: false, error: 'SEND_EMAIL binding not configured' }
  }

  try {
    const siteUrl = (env.CANFLY_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '')
    const resultPageUrl = await buildResultPageUrl(opts.taskId, siteUrl, env.ENCRYPTION_KEY)

    const fullOpts = { ...opts, siteUrl, resultPageUrl, encryptionKey: env.ENCRYPTION_KEY }

    const msg = createMimeMessage()
    msg.setSender({ name: SYSTEM_NAME, addr: SYSTEM_EMAIL })
    msg.setRecipient(opts.buyerEmail)
    msg.setSubject(`Your ${opts.skillName} task is complete!`)
    msg.addMessage({ contentType: 'text/plain', data: buildTextBody(fullOpts) })
    msg.addMessage({ contentType: 'text/html', data: buildHtmlBody(fullOpts) })

    // Use the Cloudflare EmailMessage constructor from cloudflare:email
    // The send_email binding expects an EmailMessage object
    const { EmailMessage } = await import('cloudflare:email')
    const emailMessage = new EmailMessage(SYSTEM_EMAIL, opts.buyerEmail, msg.asRaw())

    await env.SEND_EMAIL.send(emailMessage)

    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email send failed'
    return { sent: false, error: message }
  }
}
