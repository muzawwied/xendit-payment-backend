import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_BASE_URL = "https://api.resend.com";

async function resendRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${RESEND_BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  try {

    // ─────────────────────────────────────────────
    // 1. SEND EMAIL SIMPLE
    // POST ?action=send
    // Body: { to, subject, text?, html?, from? }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "send") {
      const body = await req.json();

      if (!body.to || !body.subject) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: to, subject"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload: Record<string, unknown> = {
        from: body.from || "Resend Test <onboarding@resend.dev>",
        to: Array.isArray(body.to) ? body.to : [body.to],
        subject: body.subject,
      };

      if (body.html) payload.html = body.html;
      if (body.text) payload.text = body.text;
      if (!body.html && !body.text) payload.text = body.subject;
      if (body.reply_to) payload.reply_to = body.reply_to;
      if (body.cc) payload.cc = Array.isArray(body.cc) ? body.cc : [body.cc];
      if (body.bcc) payload.bcc = Array.isArray(body.bcc) ? body.bcc : [body.bcc];

      const result = await resendRequest("POST", "/emails", payload);

      return new Response(JSON.stringify({
        success: result.status === 200 || result.status === 201,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 2. SEND EMAIL WITH HTML TEMPLATE
    // POST ?action=send_template
    // Body: { to, subject, name, message, from? }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "send_template") {
      const body = await req.json();

      if (!body.to || !body.subject) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: to, subject"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 32px 24px; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
    .message { font-size: 15px; color: #374151; line-height: 1.6; background: #f9fafb; border-left: 3px solid #6366f1; padding: 16px; border-radius: 6px; }
    .footer { padding: 20px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 ${body.subject}</h1>
      <p>Email dikirim via Resend</p>
    </div>
    <div class="body">
      <p class="greeting">Halo${body.name ? ', ' + body.name : ''}! 👋</p>
      <div class="message">${body.message || body.subject}</div>
    </div>
    <div class="footer">
      Email ini dikirim secara otomatis. Harap tidak membalas email ini.<br/>
      &copy; ${new Date().getFullYear()} — Powered by Resend
    </div>
  </div>
</body>
</html>`;

      const payload = {
        from: body.from || "Resend Test <onboarding@resend.dev>",
        to: Array.isArray(body.to) ? body.to : [body.to],
        subject: body.subject,
        html,
      };

      const result = await resendRequest("POST", "/emails", payload);

      return new Response(JSON.stringify({
        success: result.status === 200 || result.status === 201,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 3. GET EMAIL STATUS
    // POST ?action=get
    // Body: { email_id }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "get") {
      const body = await req.json();

      if (!body.email_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: email_id"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await resendRequest("GET", `/emails/${body.email_id}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // DEFAULT: Dokumentasi
    // ─────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      service: "Resend Email Backend",
      version: "1.0.0",
      base_url: "https://superagent-d156b22f.base44.app/functions/resendEmail",
      note: "Gunakan 'onboarding@resend.dev' sebagai from untuk sandbox/testing",
      endpoints: [
        {
          action: "send",
          method: "POST",
          description: "Kirim email plain text atau HTML custom",
          required_body: ["to", "subject"],
          optional_body: ["from", "html", "text", "reply_to", "cc", "bcc"],
        },
        {
          action: "send_template",
          method: "POST",
          description: "Kirim email dengan HTML template siap pakai",
          required_body: ["to", "subject"],
          optional_body: ["from", "name", "message"],
        },
        {
          action: "get",
          method: "POST",
          description: "Cek status pengiriman email",
          required_body: ["email_id"],
        },
      ],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[RESEND ERROR]", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
