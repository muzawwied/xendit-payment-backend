import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") || "";
const XENDIT_BASE_URL = "https://api.xendit.co";

// Helper: base64 encode for Basic Auth
function basicAuth(secretKey: string): string {
  return "Basic " + btoa(secretKey + ":");
}

// Helper: Xendit API request
async function xenditRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${XENDIT_BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": basicAuth(XENDIT_SECRET_KEY),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

Deno.serve(async (req: Request) => {
  // CORS headers
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
    // 1. CREATE INVOICE
    // POST /functions/xenditPayment?action=create_invoice
    // Body: { external_id, amount, payer_email, description, currency?, success_redirect_url?, failure_redirect_url? }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "create_invoice") {
      const body = await req.json();

      if (!body.external_id || !body.amount || !body.payer_email || !body.description) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: external_id, amount, payer_email, description"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload = {
        external_id: body.external_id,
        amount: body.amount,
        payer_email: body.payer_email,
        description: body.description,
        currency: body.currency || "IDR",
        success_redirect_url: body.success_redirect_url || "",
        failure_redirect_url: body.failure_redirect_url || "",
        should_send_email: body.should_send_email ?? true,
        invoice_duration: body.invoice_duration || 86400, // 24 jam default
        payment_methods: body.payment_methods || [
          "BCA", "BNI", "BRI", "MANDIRI", "PERMATA",
          "OVO", "DANA", "LINKAJA", "SHOPEEPAY",
          "QRIS", "CREDIT_CARD"
        ],
      };

      const result = await xenditRequest("POST", "/v2/invoices", payload);

      return new Response(JSON.stringify({
        success: result.status === 200 || result.status === 201,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 2. GET INVOICE
    // GET /functions/xenditPayment?action=get_invoice
    // Body: { invoice_id }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "get_invoice") {
      const body = await req.json();

      if (!body.invoice_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: invoice_id"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await xenditRequest("GET", `/v2/invoices/${body.invoice_id}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 3. EXPIRE INVOICE
    // POST /functions/xenditPayment?action=expire_invoice
    // Body: { invoice_id }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "expire_invoice") {
      const body = await req.json();

      if (!body.invoice_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: invoice_id"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await xenditRequest("POST", `/invoices/expire/${body.invoice_id}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 4. CREATE VIRTUAL ACCOUNT (VA)
    // POST /functions/xenditPayment?action=create_va
    // Body: { external_id, bank_code, name, expected_amount, is_closed?, expiration_date? }
    // bank_code: BCA, BNI, BRI, MANDIRI, PERMATA, BSI, BJB, CIMB, SAHABAT_SAMPOERNA
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "create_va") {
      const body = await req.json();

      if (!body.external_id || !body.bank_code || !body.name) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: external_id, bank_code, name"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload: Record<string, unknown> = {
        external_id: body.external_id,
        bank_code: body.bank_code.toUpperCase(),
        name: body.name,
        is_closed: body.is_closed ?? false,
        is_single_use: body.is_single_use ?? false,
      };

      if (body.expected_amount) payload.expected_amount = body.expected_amount;
      if (body.expiration_date) payload.expiration_date = body.expiration_date;

      const result = await xenditRequest("POST", "/callback_virtual_accounts", payload);

      return new Response(JSON.stringify({
        success: result.status === 200 || result.status === 201,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 5. GET VIRTUAL ACCOUNT
    // POST /functions/xenditPayment?action=get_va
    // Body: { va_id }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "get_va") {
      const body = await req.json();

      if (!body.va_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: va_id"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await xenditRequest("GET", `/callback_virtual_accounts/${body.va_id}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 6. CREATE EWALLET CHARGE
    // POST /functions/xenditPayment?action=create_ewallet
    // Body: { reference_id, currency, amount, checkout_method, channel_code, channel_properties, success_redirect_url }
    // channel_code: OVO, DANA, LINKAJA, SHOPEEPAY
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "create_ewallet") {
      const body = await req.json();

      if (!body.reference_id || !body.amount || !body.channel_code) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: reference_id, amount, channel_code"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload = {
        reference_id: body.reference_id,
        currency: body.currency || "IDR",
        amount: body.amount,
        checkout_method: body.checkout_method || "ONE_TIME_PAYMENT",
        channel_code: body.channel_code.toUpperCase(),
        channel_properties: body.channel_properties || {
          success_redirect_url: body.success_redirect_url || "https://yourwebsite.com/success",
          mobile_number: body.mobile_number || "",
          cashtag: body.cashtag || "",
        },
        metadata: body.metadata || {},
      };

      const result = await xenditRequest("POST", "/ewallets/charges", payload);

      return new Response(JSON.stringify({
        success: result.status === 200 || result.status === 201,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 7. GET EWALLET CHARGE
    // POST /functions/xenditPayment?action=get_ewallet
    // Body: { charge_id }
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "get_ewallet") {
      const body = await req.json();

      if (!body.charge_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Field wajib: charge_id"
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await xenditRequest("GET", `/ewallets/charges/${body.charge_id}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 8. WEBHOOK HANDLER (Simulasi/Terima callback dari Xendit)
    // POST /functions/xenditPayment?action=webhook
    // Xendit akan POST ke URL ini saat pembayaran berhasil
    // ─────────────────────────────────────────────
    if (req.method === "POST" && action === "webhook") {
      const webhookToken = req.headers.get("x-callback-token") || "";
      const expectedToken = Deno.env.get("XENDIT_WEBHOOK_TOKEN") || "";

      // Verifikasi token jika ada
      if (expectedToken && webhookToken !== expectedToken) {
        return new Response(JSON.stringify({
          success: false,
          error: "Unauthorized webhook"
        }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload = await req.json();
      const eventType = payload.event || payload.status || "UNKNOWN";

      console.log(`[XENDIT WEBHOOK] Event: ${eventType}`, JSON.stringify(payload));

      // Di sini kamu bisa tambahkan logic:
      // - Update status order di database
      // - Kirim notifikasi ke user
      // - Trigger workflow lainnya

      return new Response(JSON.stringify({
        success: true,
        message: "Webhook received",
        event_type: eventType,
        data: payload,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // 9. BALANCE / CEK SALDO
    // GET /functions/xenditPayment?action=balance
    // ─────────────────────────────────────────────
    if (req.method === "GET" && action === "balance") {
      const currency = url.searchParams.get("currency") || "IDR";
      const result = await xenditRequest("GET", `/balance?account_type=CASH&currency=${currency}`);

      return new Response(JSON.stringify({
        success: result.status === 200,
        data: result.data,
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // DEFAULT: Dokumentasi endpoint
    // ─────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      service: "Xendit Payment Backend - Sandbox Mode",
      version: "1.0.0",
      base_url: "https://superagent-d156b22f.base44.app/functions/xenditPayment",
      endpoints: [
        {
          action: "create_invoice",
          method: "POST",
          description: "Buat invoice pembayaran (semua metode tersedia)",
          required_body: ["external_id", "amount", "payer_email", "description"],
          optional_body: ["currency", "success_redirect_url", "failure_redirect_url", "payment_methods", "invoice_duration"],
        },
        {
          action: "get_invoice",
          method: "POST",
          description: "Cek status invoice",
          required_body: ["invoice_id"],
        },
        {
          action: "expire_invoice",
          method: "POST",
          description: "Expire/batalkan invoice",
          required_body: ["invoice_id"],
        },
        {
          action: "create_va",
          method: "POST",
          description: "Buat Virtual Account",
          required_body: ["external_id", "bank_code", "name"],
          optional_body: ["expected_amount", "is_closed", "is_single_use", "expiration_date"],
          bank_codes: ["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "BSI", "CIMB"],
        },
        {
          action: "get_va",
          method: "POST",
          description: "Cek status Virtual Account",
          required_body: ["va_id"],
        },
        {
          action: "create_ewallet",
          method: "POST",
          description: "Buat charge eWallet",
          required_body: ["reference_id", "amount", "channel_code"],
          channel_codes: ["OVO", "DANA", "LINKAJA", "SHOPEEPAY"],
        },
        {
          action: "get_ewallet",
          method: "POST",
          description: "Cek status eWallet charge",
          required_body: ["charge_id"],
        },
        {
          action: "webhook",
          method: "POST",
          description: "Endpoint untuk callback Xendit (daftarkan di dashboard Xendit)",
        },
        {
          action: "balance",
          method: "GET",
          description: "Cek saldo akun Xendit",
          optional_params: ["currency (default: IDR)"],
        },
      ],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[XENDIT ERROR]", err);
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
