#!/bin/bash
# filepath: /home/hflin/NHKollector/install/install-service.sh

set -e

echo "Installing NHKollector Service..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "Please don't run as root"
  exit 1
fi

# Install dependencies
npm install

# Create service user and directories
sudo useradd -r -s /bin/false nhkollector || true
sudo mkdir -p /var/log/nhkollector
sudo chown nhkollector:nhkollector /var/log/nhkollector

# Copy service file
sudo cp install/nhkollector.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable nhkollector
sudo systemctl start nhkollector

echo "Service installed! Access the web interface at http://localhost:8080"
echo "Check status with: sudo systemctl status nhkollector"