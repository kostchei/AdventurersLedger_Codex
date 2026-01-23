# Tale-Keeper GCP Migration Guide

This guide describes how to migrate your local PocketBase infrastructure to Google Cloud Platform (GCP) for free (using the Free Tier).

## Overview

The migration involves:
1.  Provisioning a free **e2-micro** instance on GCP.
2.  Setting up **Docker** and **Docker Compose** on the instance.
3.  Transferring your local PocketBase data (`pb_data`, `pb_migrations`) and Cloudflare credentials.
4.  Running PocketBase and Cloudflare Tunnel in Docker containers.

## Prerequisites

-   **Google Cloud Platform Account**: You need a billing account enabled (for verification), but we will use Free Tier resources.
-   **gcloud CLI**: Installed and authenticated (`gcloud auth login`).
-   **Terraform**: Installed (optional, but recommended for infrastructure setup).
-   **SCP**: For transferring files (usually available via `gcloud compute scp` or standard `scp`).

## Step 1: Set up GCP Infrastructure

We will use Terraform to create the VM.

1.  Navigate to the `gcp_migration/terraform` directory:
    ```bash
    cd gcp_migration/terraform
    ```

2.  Initialize Terraform:
    ```bash
    terraform init
    ```

3.  Create a `terraform.tfvars` file (or pass variables via command line) with your Project ID:
    ```hcl
    project_id = "your-gcp-project-id"
    ```

4.  Review and Apply the configuration:
    ```bash
    terraform apply
    ```
    Type `yes` when prompted.

5.  Note the **External IP** address outputted at the end.

### Alternative (Manual Setup)
If you prefer not to use Terraform:
1.  Create a VM instance in GCP Console:
    -   **Region**: `us-central1` (or `us-west1`, `us-east1` for Free Tier).
    -   **Machine type**: `e2-micro`.
    -   **Boot disk**: Standard persistent disk, 30GB.
    -   **Firewall**: Allow HTTP, HTTPS.
2.  Use the Startup Script provided in `main.tf` to install Docker.

## Step 2: Prepare Local Files

1.  Navigate to the `gcp_migration/docker` directory.
2.  **Copy your local data**:
    Copy your existing `pb_data` and `pb_migrations` folders from your project root to this directory.
    ```bash
    cp -r ../../pocketbase/pb_data .
    cp -r ../../pocketbase/pb_migrations .
    # If you have public files
    cp -r ../../pocketbase/pb_public .
    ```

3.  **Configure Cloudflare Tunnel**:
    -   Copy your `credentials.json` (tunnel credentials) to `gcp_migration/docker/cloudflared/`.
    -   Rename `config.yml.template` to `config.yml` in `gcp_migration/docker/cloudflared/`.
    -   Edit `config.yml`:
        -   Replace `<TUNNEL_ID>` with your actual Tunnel ID (e.g., `081ada0c-35a5-4658-a833-7f39a91c7bf2`).
        -   Ensure `ingress` points to `http://pocketbase:8090`.

## Step 3: Deploy to VM

1.  **Transfer files to the VM**:
    You can use `gcloud compute scp` to copy the `docker` directory to the VM.
    ```bash
    # Replace INSTANCE_NAME and ZONE with your values (e.g., pocketbase-vm, us-central1-a)
    gcloud compute scp --recurse gcp_migration/docker user@pocketbase-vm:~/deployment --zone=us-central1-a
    ```

2.  **SSH into the VM**:
    ```bash
    gcloud compute ssh user@pocketbase-vm --zone=us-central1-a
    ```

3.  **Start Services**:
    On the VM:
    ```bash
    cd ~/deployment/docker
    sudo docker compose up -d --build
    ```

## Step 4: Verify Deployment

1.  Check if containers are running:
    ```bash
    sudo docker compose ps
    ```
2.  Check Cloudflare Tunnel logs:
    ```bash
    sudo docker compose logs cloudflared
    ```
    It should say "Registered tunnel connection".
3.  Access your API:
    Visit `https://api.talekeeper.org/api/health` or your Admin UI.

## Troubleshooting

-   **PocketBase Version**: The Dockerfile uses version `0.22.21`. If your local data is from a newer version (e.g., `0.36.x`), update the `ARG PB_VERSION` in `Dockerfile`.
-   **Permissions**: Ensure the `pb_data` directory has correct permissions for the Docker user. You might need to run `chmod -R 777 pb_data` inside the container or on the host if issues arise (not recommended for prod, but fine for single-user).
-   **Cloudflare**: If tunnel fails, check `config.yml` matches your Tunnel ID and credentials file is present.
