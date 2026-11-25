#!/usr/bin/env bash
# One-time setup on a fresh Google Cloud e2-small or e2-micro running Debian 12 or 13: 2 GB of swap, Docker with
# the compose plugin, and a login to ghcr.io so the private image can be pulled.
# Run as a sudo-capable user:  bash deploy/gce/setup-vm.sh <github-user> <token-with-read:packages>
set -euo pipefail

GH_USER="${1:?github user name}"
GH_TOKEN="${2:?a GitHub token that can read packages}"

if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  # Prefer RAM; swap only takes what does not fit.
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/90-swappiness.conf
  sudo sysctl --system >/dev/null
fi

if ! command -v docker >/dev/null; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

# Log in as this user (through the new docker group) so the login sits in ~/.docker, where later
# docker compose pulls look for it.
echo "$GH_TOKEN" | sg docker -c "docker login ghcr.io -u '$GH_USER' --password-stdin"
echo "Done. Log out and back in once so docker works without sudo."
