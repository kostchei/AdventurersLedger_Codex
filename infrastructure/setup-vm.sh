#!/bin/bash
# Simple GCP VM setup for TaleKeeper
# Run this after: gcloud auth login && gcloud config set project YOUR_PROJECT

set -e

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
VM_NAME="talekeeper-server"

echo "Creating VM in project: $PROJECT_ID"

# Create the VM
gcloud compute instances create $VM_NAME \
  --zone=$ZONE \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y unzip wget

    # Install PocketBase
    cd /opt
    wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.25.9/pocketbase_0.25.9_linux_amd64.zip
    unzip -o pocketbase_0.25.9_linux_amd64.zip
    chmod +x pocketbase

    # Create service
    cat > /etc/systemd/system/pocketbase.service << EOF
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt
ExecStart=/opt/pocketbase serve --http=0.0.0.0:8090
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pocketbase
    systemctl start pocketbase

    # Install cloudflared
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
'

echo ""
echo "VM created! Next steps:"
echo ""
echo "1. SSH into VM:"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE"
echo ""
echo "2. Setup Cloudflare Tunnel:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create talekeeper"
echo ""
echo "3. Configure tunnel (edit ~/.cloudflared/config.yml)"
echo ""
echo "4. Start tunnel service:"
echo "   sudo cloudflared service install"
echo ""
echo "5. Add DNS in Cloudflare:"
echo "   CNAME api -> <tunnel-id>.cfargotunnel.com"
