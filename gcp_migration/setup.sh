#!/bin/bash
set -e

# Configuration
PB_VERSION="0.22.21"
INSTALL_DIR="/opt/pocketbase"

echo ">>> Starting Tale-Keeper Setup..."

# 1. Install Dependencies
echo ">>> Installing dependencies..."
apt-get update
apt-get install -y unzip wget curl

# 2. Setup PocketBase User
echo ">>> Creating pocketbase user..."
if ! id "pocketbase" &>/dev/null; then
    useradd -r -s /bin/false pocketbase
fi

# 3. Download and Install PocketBase
echo ">>> Installing PocketBase v${PB_VERSION}..."
mkdir -p ${INSTALL_DIR}
wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip
unzip -o /tmp/pb.zip -d ${INSTALL_DIR}
rm /tmp/pb.zip
chmod +x ${INSTALL_DIR}/pocketbase

# 4. Install Cloudflared
echo ">>> Installing Cloudflared..."
if ! command -v cloudflared &> /dev/null; then
    mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update && apt-get install -y cloudflared
fi

# 5. Configure Systemd
echo ">>> Configuring Systemd Service..."
cp pocketbase.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable pocketbase

# 6. Set Permissions
echo ">>> Setting permissions..."
# Ensure the migrated data (which should be uploaded before running this) is owned by the user
if [ -d "pb_data" ]; then
    echo "Found migrated pb_data, moving to ${INSTALL_DIR}..."
    cp -r pb_data ${INSTALL_DIR}/
fi
if [ -d "pb_migrations" ]; then
    echo "Found migrated pb_migrations, moving to ${INSTALL_DIR}..."
    cp -r pb_migrations ${INSTALL_DIR}/
fi
if [ -d "pb_public" ]; then
    echo "Found migrated pb_public, moving to ${INSTALL_DIR}..."
    cp -r pb_public ${INSTALL_DIR}/
fi

chown -R pocketbase:pocketbase ${INSTALL_DIR}

echo ">>> Setup Complete!"
echo "To start PocketBase: systemctl start pocketbase"
echo "To finish Cloudflare setup, run: cloudflared service install <YOUR_TOKEN>"
