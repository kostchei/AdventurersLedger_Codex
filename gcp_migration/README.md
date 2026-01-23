# Tale-Keeper GCP Migration Guide (Bare Metal)

This guide describes how to migrate your local PocketBase infrastructure to a Google Cloud Platform (GCP) **e2-micro** instance (Free Tier) using a simple, script-based approach.

## Overview

The migration involves:
1.  Creating a VM on GCP.
2.  Uploading your local PocketBase data.
3.  Running a setup script to install PocketBase and Cloudflare.
4.  Connecting the Cloudflare Tunnel.

## Prerequisites

-   **Google Cloud Platform Account**: Free Tier eligible.
-   **Local Data**: Your `pocketbase/pb_data` directory.
-   **Cloudflare Tunnel Token**: From your Cloudflare Zero Trust dashboard.

## Step 1: Create GCP Instance

You can do this via the GCP Console or CLI.

### Option A: GCP Console (Click-Ops)
1.  Go to **Compute Engine > VM Instances**.
2.  Click **Create Instance**.
3.  **Name**: `pocketbase-server`
4.  **Region**: `us-central1`, `us-west1`, or `us-east1` (verify Free Tier regions).
5.  **Machine type**: `e2-micro` (2 vCPU, 1 GB memory).
6.  **Boot disk**: Change to **Standard persistent disk** with **30 GB** size (Free Tier limit).
    *   **Image**: Ubuntu 22.04 LTS (Jammy) or Debian 11/12.
7.  **Firewall**: Check "Allow HTTP traffic" and "Allow HTTPS traffic".
8.  Click **Create**.

### Option B: gcloud CLI
```bash
gcloud compute instances create pocketbase-server \
    --machine-type=e2-micro \
    --zone=us-central1-a \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-standard \
    --tags=http-server,https-server
```

## Step 2: Prepare & Transfer Files

1.  Navigate to the `gcp_migration` folder in your terminal.
2.  **Copy local data** to this folder (temporary):
    ```bash
    cp -r ../pocketbase/pb_data .
    cp -r ../pocketbase/pb_migrations .
    # If you use pb_public
    cp -r ../pocketbase/pb_public .
    ```
3.  **Transfer files to the VM**:
    Use `scp` or `gcloud compute scp`. Replace `YOUR_USER` and `YOUR_VM_IP` with your actual values.
    ```bash
    # Using standard SCP (if you have SSH keys set up)
    scp -r setup.sh pocketbase.service pb_data pb_migrations pb_public YOUR_USER@YOUR_VM_IP:~

    # OR using gcloud (easier)
    gcloud compute scp --recurse setup.sh pocketbase.service pb_data pb_migrations pb_public pocketbase-server:~
    ```

## Step 3: Run Setup Script

1.  SSH into your VM:
    ```bash
    gcloud compute ssh pocketbase-server
    ```
2.  Run the setup script:
    ```bash
    sudo bash setup.sh
    ```
    *This will install PocketBase, create the system user, and move your data to `/opt/pocketbase`.*

3.  Start PocketBase:
    ```bash
    sudo systemctl start pocketbase
    ```
4.  Check status:
    ```bash
    sudo systemctl status pocketbase
    ```
    *It should be Active (running).*

## Step 4: Configure Cloudflare Tunnel

To make your backend accessible globally without opening ports on the VM:

1.  **Get your Tunnel Token**:
    *   Go to Cloudflare Zero Trust Dashboard > Access > Tunnels.
    *   Select your tunnel (or create a new one).
    *   Click "Configure" > "Install connector".
    *   Copy the token part from the command (the long string after `--token`).

2.  **Install the Service**:
    On the VM, run:
    ```bash
    sudo cloudflared service install <PASTE_YOUR_TOKEN_HERE>
    ```

3.  **Verify**:
    The tunnel should show as "Healthy" in the Cloudflare Dashboard. Your `api.talekeeper.org` domain will now route to `localhost:8090` on the VM.

## Maintenance

-   **Logs**: `journalctl -u pocketbase -f`
-   **Restart**: `sudo systemctl restart pocketbase`
-   **Update**: Replace the binary in `/opt/pocketbase/pocketbase` and restart the service.
