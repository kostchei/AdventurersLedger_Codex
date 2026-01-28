# Tale-Keeper: Mastery & Setup Guide

Welcome to your upgraded **Persistent World State Manager**. This document captures the final "glue" steps to connect your local backend to the world.

## 1. Google OAuth Configuration (Player Onboarding)
The app is ready for Google Login, but you must provide the keys from your own Google Cloud projects:

1.  **Get Keys**: Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  **Create Client ID**: Create an "OAuth 2.0 Client ID" for a Web Application.
3.  **Set Redirect URLs**: Add this to the "Authorized redirect URIs" in Google Console:
    - `https://api.talekeeper.org/api/oauth2-redirect` (Public domain)

4.  **Update PocketBase**:
    - Open your Admin Dashboard (`https://api.talekeeper.org/_/`).
    - Go to **Settings > Auth providers > Google**.
    - Insert your **Client ID** and **Client Secret**.

## 2. Public Access (Cloudflare Tunnel)
To let your players access the map while you're offline or away:

1.  The `cloudflared.exe` is already in your `bin` folder.
2.  **Cloudflare Dashboard Setup**:
    - Create a new Tunnel (e.g., "TaleKeeper-Local").
    - In **Public Hostname**, map `api.talekeeper.org` to `http://localhost:8090`.
3.  **Local Config**:
    - Downlaod your tunnel credentials (`.json` file).
    - Rename it to `credentials.json` and place it in `pocketbase/cloudflared/`.
    - Edit `pocketbase/cloudflared/config.yml` and replace `<TUNNEL_ID>` with your UUID.

## 3. World Management (DM Only)
You now have two powerful ways to manage the world:

- **The Website**: Use the sidebar in the Campaign Page to track HP, XP, and Gold in real-time.
- **The Dashboard**: Use the PocketBase Admin UI (`https://api.talekeeper.org/_/`) for batch updates:
    - **`world_state`**: Update monster kill counts or discovered NPCs.
    - **`fog_of_war`**: Manually reveal or hide hexes by adding/removing "q,r,z" coordinates.
    - **`users_stats`**: Directly edit player gold or conditions.

## 4. Daily Workflow
1.  Double-click **Start TaleKeeper** on your Desktop.
2.  Run your session!
3.  Double-click **Stop TaleKeeper** when the adventure concludes to save resources.

---

*This architecture ensures your campaign data remains on your hardware while your players benefit from a fast, global frontend.*
