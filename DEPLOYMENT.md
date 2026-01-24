# Tale-Keeper Deployment Guide

## Architecture Overview

```
┌─────────────────────────┐
│  Azure Static Web App   │ ← Frontend (talekeeper.org)
│    (React/Vite Build)   │
└────────────┬────────────┘
             │ HTTPS
             ↓
┌─────────────────────────┐
│  Cloudflare Tunnel      │ ← api.talekeeper.org
└────────────┬────────────┘
             │ Encrypted Tunnel
             ↓
┌─────────────────────────┐
│  PocketBase (GCP)       │ ← Always Free e2-micro VM
│  Compute Engine VM      │
└─────────────────────────┘
```

## Prerequisites

- GitHub account
- Azure account (free tier works)
- GCP account (free tier works)
- Cloudflare account with `talekeeper.org` domain

## Part 1: PocketBase Backend (Cloud-Based ✅)

The backend is now designed to run fully in the cloud on GCP’s Always Free tier. Follow the migration guide to move the existing local PocketBase data and tunnel to GCP:

- **GCP migration guide:** [GCP_MIGRATION.md](GCP_MIGRATION.md)

## Part 2: Local Backend Setup (Legacy / Optional)

### PocketBase
- Running on `localhost:8090`
- OAuth2 configured with Google
- Database migrations applied

### Cloudflare Tunnel
- Tunnel ID: `081ada0c-35a5-4658-a833-7f39a91c7bf2`
- Public URL: `https://api.talekeeper.org`
- Config: `pocketbase/cloudflared/config.yml`

**Start services:**
```bash
start-talekeeper.bat
```

## Part 3: Azure Static Web Apps Deployment

### Step 1: Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → Search for **"Static Web App"**
3. Click **"Create"**

**Configuration:**
- **Subscription:** Choose your subscription
- **Resource Group:** Create new: `talekeeper-rg`
- **Name:** `talekeeper-app`
- **Plan type:** Free
- **Region:** Choose closest to you
- **Deployment details:**
  - Source: **GitHub**
  - Organization: `kostchei`
  - Repository: `AdventurersLedger_Codex`
  - Branch: `main`

**Build Details:**
- **Build Presets:** Custom
- **App location:** `/frontend`
- **Api location:** *(leave empty)*
- **Output location:** `dist`

4. Click **"Review + create"** → **"Create"**

### Step 2: Get Deployment Token

After creation:
1. Go to your Static Web App resource
2. Click **"Manage deployment token"**
3. Copy the token

### Step 3: Add Token to GitHub Secrets

1. Go to your GitHub repo: `https://github.com/kostchei/AdventurersLedger_Codex`
2. Settings → Secrets and variables → Actions
3. Click **"New repository secret"**
4. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
5. Value: Paste the deployment token
6. Click **"Add secret"**

### Step 4: Configure Custom Domain

In Azure Portal (your Static Web App):
1. Go to **"Custom domains"**
2. Click **"+ Add"**
3. Enter: `talekeeper.org`
4. Choose: **"CNAME"**
5. Azure will provide a validation domain

In Cloudflare:
1. Go to DNS settings for `talekeeper.org`
2. Add CNAME record:
   - **Name:** `@` or `talekeeper.org`
   - **Target:** `<your-app-name>.azurestaticapps.net`
   - **Proxy status:** Proxied (orange cloud)

3. Add CNAME for www (optional):
   - **Name:** `www`
   - **Target:** `<your-app-name>.azurestaticapps.net`
   - **Proxy status:** Proxied

### Step 5: Deploy

The GitHub Actions workflow will automatically deploy when you push to main:

```bash
git add .
git commit -m "Add Azure Static Web Apps deployment"
git push origin main
```

Watch the deployment:
- GitHub: Actions tab
- Azure: Deployment center in your Static Web App

## Part 4: Verify Deployment

1. **Frontend:** https://talekeeper.org
2. **API:** https://api.talekeeper.org/api/health
3. **Admin UI:** https://api.talekeeper.org/_/

### Test OAuth Login

1. Go to https://talekeeper.org/login
2. Click "Sign in with Google"
3. Should authenticate successfully

## Troubleshooting

### Issue: Build fails in Azure
- Check GitHub Actions logs
- Verify `frontend/` directory structure
- Ensure `package.json` is in `frontend/` folder

### Issue: API connection fails
- Verify Cloudflare Tunnel is running on the GCP VM: `sudo systemctl status cloudflared`
- Verify PocketBase is running on the GCP VM: `sudo systemctl status pocketbase`
- Test API directly: `curl https://api.talekeeper.org/api/health`
- Check `VITE_PB_URL` in workflow file

### Issue: OAuth redirect fails
- Update Google OAuth credentials:
  - Authorized redirect URIs: `https://api.talekeeper.org/api/oauth2-redirect`
  - Authorized JavaScript origins: `https://talekeeper.org`

## Maintenance

### Start Services (Daily)
```bash
start-talekeeper.bat
```

### Stop Services
```bash
stop-talekeeper.bat
```

### Deploy Updates
```bash
git add .
git commit -m "Update description"
git push origin main
```
Deployment happens automatically via GitHub Actions.

### Update PocketBase
1. Stop services
2. Download new PocketBase binary
3. Replace `pocketbase/bin/pocketbase.exe`
4. Restart services

## Cost Breakdown

- **Azure Static Web Apps:** Free tier (100 GB bandwidth/month)
- **Cloudflare Tunnel:** Free
- **PocketBase (GCP Always Free e2-micro):** Free
- **Domain (talekeeper.org):** ~$10-15/year

**Total monthly cost:** $0 (excluding domain renewal)




Quick Setup (5 minutes):
1. Create New Static Web App
Azure Portal → Create Resource → Static Web App

Quick settings:

Name: talekeeper (or your preferred name)
Region: Choose closest to you
GitHub repo: kostchei/AdventurersLedger_Codex
Branch: main
Build presets: Custom
App location: /frontend
Output location: dist
2. Add Deployment Token to GitHub
After creation:

Copy the deployment token from Azure
GitHub repo → Settings → Secrets → New secret
Name: AZURE_STATIC_WEB_APPS_API_TOKEN
Paste token → Save
3. Trigger Deployment
The workflow is already in the repo, so just trigger it:

Bash Trigger deployment workflow
IN
git commit --allow-empty -m "Trigger Azure Static Web App deployment" && git push origin main

OUT
[main 8516463] Trigger Azure Static Web App deployment
To https://github.com/kostchei/AdventurersLedger_Codex.git
   61b0d62..8516463  main -> main
4. Configure Custom Domain (After deployment succeeds)
In your new Static Web App:

Add custom domain: talekeeper.org
Update Cloudflare DNS CNAME to point to your Azure app
That's it! The workflow will handle:

✅ Building the frontend
✅ Setting VITE_PB_URL=https://api.talekeeper.org
✅ Deploying to Azure
✅ Auto-deploying on future pushes
Once you add the token and the workflow runs, your app will be live at <your-app-name>.azurestaticapps.net (and then talekeeper.org after custom domain setup).
