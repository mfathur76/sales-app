#!/bin/bash

# Firewall Setup Script for Sales App
# Usage: ./firewall-setup.sh

echo "🔧 Setting up firewall for Sales App..."

# Check available UFW applications
echo "📋 Available UFW applications:"
sudo ufw app list

# Enable UFW
echo "✅ Enabling UFW..."
sudo ufw --force enable

# Allow SSH (port 22)
echo "🔓 Allowing SSH (port 22)..."
sudo ufw allow ssh
sudo ufw allow 22

# Allow HTTP (port 80)
echo "🌐 Allowing HTTP (port 80)..."
sudo ufw allow 80

# Allow HTTPS (port 443)
echo "🔒 Allowing HTTPS (port 443)..."
sudo ufw allow 443

# Allow backend API port (3001) - optional, since we use nginx proxy
echo "🔌 Allowing backend API (port 3001)..."
sudo ufw allow 3001

# Show firewall status
echo "📊 Firewall status:"
sudo ufw status verbose

echo "✅ Firewall setup completed!"
echo ""
echo "📋 Allowed ports:"
echo "  • SSH: 22"
echo "  • HTTP: 80"
echo "  • HTTPS: 443"
echo "  • Backend API: 3001"
echo ""
echo "🔍 To check status: sudo ufw status"
echo "🔍 To disable: sudo ufw disable" 