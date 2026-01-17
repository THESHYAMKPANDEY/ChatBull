# Deploying on Render (Backend) + Email OTP

## Backend on Render
1. Create a new **Web Service** on Render from your Git repo.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

## Required Environment Variables (Render → Environment)
### Core
- `NODE_ENV=production`
- `PORT` (Render sets this; do not hardcode)
- `HOST=0.0.0.0`
- `MONGODB_URI=...`

### Firebase Admin (required for Email OTP custom token + Socket auth)
- `FIREBASE_SERVICE_ACCOUNT_JSON=...` (single-line JSON)

### CORS (recommended)
- `CORS_ORIGINS=https://yourdomain.com,https://anotherdomain.com`

## Email OTP via Brevo (Free SMTP option)
Brevo Free plan includes **300 email sends/day**. (Source: https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)

### Steps
1. Create a Brevo account (Free plan is fine).
2. Create an SMTP key in Brevo (SMTP settings).
3. Add these env vars in Render:
   - `APP_NAME=ChatBull`
   - `EMAIL_OTP_TTL_MINUTES=10`
   - `EMAIL_OTP_MIN_RESEND_SECONDS=60`
   - `SMTP_HOST=smtp-relay.brevo.com` (Brevo’s SMTP host)
   - `SMTP_PORT=587`
   - `SMTP_USER=...` (Brevo SMTP login)
   - `SMTP_PASS=...` (Brevo SMTP key)
   - `SMTP_FROM=your_verified_sender@yourdomain.com`

### Deliverability “Market Ready” Checklist
- Use a domain-based sender (not a free gmail/yahoo address).
- Verify your sender/domain in Brevo.
- Keep OTP emails short and consistent (no links required).
- Monitor bounces and spam complaints.

## Health Checks
- `/api/health` should return OK.
- `/health/extended` should show database + firebase health (firebase requires service account).

