#!/bin/bash
# Setup script for initializing this as a new git repository

echo "🚀 Setting up WebTorrent P2P Infrastructure repository..."

# Initialize git repo
git init
git add .
git commit -m "Initial commit: Google Cloud P2P infrastructure"

echo "✅ Repository initialized!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Add remote: git remote add origin <your-repo-url>"
echo "3. Push: git push -u origin main"
echo ""
echo "Or use GitHub CLI:"
echo "  gh repo create webtorrent-p2p-infrastructure --public --source=. --remote=origin --push"
