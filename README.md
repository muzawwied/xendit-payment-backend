# Xendit Payment Backend — Sandbox Mode

Backend function siap pakai untuk integrasi pembayaran Xendit (sandbox).

## 🔗 Live Base URL
```
https://superagent-d156b22f.base44.app/functions/xenditPayment
```

## ✅ Fitur
- Invoice (semua metode: Transfer Bank, eWallet, QRIS, Kartu Kredit)
- Virtual Account (BCA, BNI, BRI, Mandiri, Permata, BSI, CIMB)
- eWallet (OVO, DANA, LinkAja, ShopeePay)
- Webhook Handler
- Cek Saldo

## 📋 Endpoints

| Action | Method | Deskripsi |
|---|---|---|
| `create_invoice` | POST | Buat invoice pembayaran |
| `get_invoice` | POST | Cek status invoice |
| `expire_invoice` | POST | Batalkan invoice |
| `create_va` | POST | Buat Virtual Account |
| `get_va` | POST | Cek status VA |
| `create_ewallet` | POST | Charge eWallet |
| `get_ewallet` | POST | Cek status eWallet |
| `webhook` | POST | Callback dari Xendit |
| `balance` | GET | Cek saldo akun |

## 🚀 Cara Pakai

### 1. Create Invoice
```javascript
const res = await fetch(
  "https://superagent-d156b22f.base44.app/functions/xenditPayment?action=create_invoice",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: "order-001",
      amount: 150000,
      payer_email: "user@email.com",
      description: "Pembayaran Order #001"
    })
  }
);
const { data } = await res.json();
window.open(data.invoice_url); // Buka halaman bayar
```

### 2. Create Virtual Account
```javascript
const res = await fetch(
  "https://superagent-d156b22f.base44.app/functions/xenditPayment?action=create_va",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: "va-001",
      bank_code: "BCA",
      name: "John Doe",
      expected_amount: 150000
    })
  }
);
const { data } = await res.json();
console.log(data.account_number); // Nomor VA
```

### 3. Create eWallet (OVO/DANA/dll)
```javascript
const res = await fetch(
  "https://superagent-d156b22f.base44.app/functions/xenditPayment?action=create_ewallet",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_id: "ewallet-001",
      amount: 50000,
      channel_code: "OVO",
      mobile_number: "+628123456789",
      success_redirect_url: "https://yoursite.com/success"
    })
  }
);
const { data } = await res.json();
```

### 4. Webhook
Daftarkan URL ini di **Xendit Dashboard → Settings → Webhooks:**
```
https://superagent-d156b22f.base44.app/functions/xenditPayment?action=webhook
```

## ⚙️ Environment Variables
```
XENDIT_SECRET_KEY=xnd_development_xxxx   # Wajib
XENDIT_WEBHOOK_TOKEN=xxxxx               # Opsional (untuk verifikasi webhook)
```

## 📦 Tech Stack
- Deno (TypeScript)
- Xendit API v2
- Base44 Backend Functions

## 📄 Lisensi
MIT
