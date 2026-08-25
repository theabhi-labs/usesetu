# Custom Domain Setup Guide — UseSetu

This guide explains how to connect your custom brand domain (e.g. `www.mydigitalcenter.in` or `portal.sharmacsc.com`) to your UseSetu digital service center.

---

## 1. Prerequisites
- An active UseSetu application on a **Professional** or **Business** plan.
- Access to your domain registrar's DNS management console (e.g., GoDaddy, Namecheap, Cloudflare, Hostinger, Google Domains/Squarespace).

---

## 2. Step-by-Step Connection Process

### Step 1: Add Your Domain in UseSetu
1. Navigate to **UseSetu Console** → **My Applications**.
2. Select your application and click on the **Domain Settings** tab.
3. Click **Connect Custom Domain**.
4. Enter your full domain name (e.g. `www.mydigitalcenter.in`) and click **Connect Domain**.

---

### Step 2: Configure DNS Records at Your Domain Registrar

UseSetu will generate DNS instructions for your domain.

#### Standard Subdomain Configuration (Recommended):
- **Record Type:** `CNAME`
- **Host / Name:** `www` (or your subdomain prefix like `portal`, `app`, `seva`)
- **Points To / Target:** `domains.usesetu.com`
- **TTL:** Automatic or 3600 (1 hour)

#### Root / Apex Domain Configuration (e.g., `mydigitalcenter.in`):
- If your DNS provider supports **CNAME Flattening**, **ALIAS**, or **ANAME** records, create an `ALIAS`/`ANAME` record on `@` pointing to `domains.usesetu.com`.
- Otherwise, add the TXT verification record:
  - **Record Type:** `TXT`
  - **Host / Name:** `_usesetu-verification`
  - **Value:** `usesetu-verification=<your-unique-token>`

---

## 3. Provider-Specific Guides

### GoDaddy
1. Log in to your **GoDaddy Domain Control Center**.
2. Select your domain and click **DNS** → **Manage DNS**.
3. Under **DNS Records**, click **Add New Record**.
4. Set **Type** to `CNAME`, **Name** to `www`, and **Value** to `domains.usesetu.com`.
5. Click **Save**.

### Namecheap
1. Log in to your **Namecheap Dashboard**.
2. Click **Domain List** → **Manage** next to your domain.
3. Select the **Advanced DNS** tab.
4. Under **Host Records**, click **Add New Record**.
5. Select `CNAME Record`, set **Host** to `www`, and **Target** to `domains.usesetu.com`.
6. Click the green checkmark to save.

### Cloudflare
1. Log in to your **Cloudflare Dashboard** and select your domain.
2. Go to **DNS** → **Records**.
3. Click **Add Record**.
4. Set **Type** to `CNAME`, **Name** to `www`, **Target** to `domains.usesetu.com`.
5. Set **Proxy status** to *DNS only* (gray cloud) for initial verification or *Proxied* with SSL set to Full/Strict.
6. Click **Save**.

### Hostinger
1. Open **Hostinger hPanel** → **Domains**.
2. Click **Manage** next to your domain → **DNS / Nameservers**.
3. Under **Manage DNS records**, select `CNAME`.
4. Enter `www` in **Name**, `domains.usesetu.com` in **Target**.
5. Click **Add Record**.

---

## 4. Step 3: Verify & Activate in UseSetu
1. After adding your DNS record, allow 2–10 minutes for DNS propagation.
2. Return to your UseSetu application's **Domain Settings** tab.
3. Click **Verify DNS**.
4. Once verified, UseSetu automatically provisions an SSL certificate and activates edge routing.
5. You can now click **Make Primary** to make your custom domain the primary web address for your service center.

---

## 5. Troubleshooting & FAQs

- **Why is my verification failing?**
  DNS changes can take up to 24–48 hours to propagate worldwide, though most update within 15 minutes. Double check that the target hostname is exactly `domains.usesetu.com`.
- **Can I keep my default `.usesetu.com` address?**
  Yes. Your default subdomain (`<slug>.usesetu.com`) will remain active and serve as a reliable fallback at all times.
