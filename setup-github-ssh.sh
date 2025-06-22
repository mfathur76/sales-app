#!/bin/bash

# Setup SSH Key untuk GitHub di DigitalOcean Server
# Usage: ./setup-github-ssh.sh

set -e

echo "🔑 Setting up SSH key for GitHub access..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if SSH key already exists
if [ -f ~/.ssh/id_rsa ]; then
    print_warning "SSH key already exists at ~/.ssh/id_rsa"
    read -p "Do you want to overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing SSH key..."
    else
        rm -f ~/.ssh/id_rsa ~/.ssh/id_rsa.pub
    fi
fi

# Generate SSH key if not exists
if [ ! -f ~/.ssh/id_rsa ]; then
    print_status "Generating new SSH key..."
    ssh-keygen -t rsa -b 4096 -C "mfathur@gmail.com" -f ~/.ssh/id_rsa -N ""
fi

# Set correct permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Display public key
echo ""
print_status "Your SSH public key for GitHub:"
echo "=========================================="
cat ~/.ssh/id_rsa.pub
echo "=========================================="
echo ""

print_warning "IMPORTANT: Copy the public key above and add it to GitHub!"
echo ""
echo "📋 Steps to add to GitHub:"
echo "1. Go to: https://github.com/settings/keys"
echo "2. Click 'New SSH key'"
echo "3. Title: 'DigitalOcean Server'"
echo "4. Key type: 'Authentication Key'"
echo "5. Key: Paste the public key above"
echo "6. Click 'Add SSH key'"
echo ""

# Setup git config
print_status "Setting up git configuration..."
git config --global user.name "mfathur"
git config --global user.email "mfathur@gmail.com"

# Test GitHub connection
print_status "Testing GitHub connection..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    print_status "✅ GitHub SSH connection successful!"
else
    print_warning "❌ GitHub SSH connection failed. Please add the public key to GitHub first."
    echo ""
    echo "After adding the key to GitHub, run:"
    echo "ssh -T git@github.com"
fi

echo ""
print_status "Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add the public key to GitHub (see steps above)"
echo "2. Test connection: ssh -T git@github.com"
echo "3. Clone repository: git clone git@github.com:mfathur/sales-app.git"
echo "4. Or change existing remote: git remote set-url origin git@github.com:mfathur/sales-app.git" 