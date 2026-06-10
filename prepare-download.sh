#!/bin/bash
# Prepare workspace for download by removing large unnecessary files
# After download, run: bun install && bunx prisma generate && bunx prisma db push

set -e
echo "🧹 Preparing workspace for download..."

# Remove node_modules (can be restored with bun install)
if [ -d "node_modules" ]; then
  echo "  Removing node_modules (1.2GB) - restore with: bun install"
  rm -rf node_modules
fi

# Remove .next build cache (can be restored with next build or next dev)
if [ -d ".next" ]; then
  echo "  Removing .next build cache - restore with: next dev"
  rm -rf .next
fi

# Remove download QA screenshots
if [ -d "download" ]; then
  echo "  Cleaning download/ screenshots"
  rm -rf download/*.png
fi

# Remove skills (not needed for the project)
if [ -d "skills" ]; then
  echo "  Removing skills/"
  rm -rf skills
fi

# Remove .zscripts (not needed for the project)
if [ -d ".zscripts" ]; then
  echo "  Removing .zscripts/"
  rm -rf .zscripts
fi

# Remove agent-ctx
if [ -d "agent-ctx" ]; then
  echo "  Removing agent-ctx/"
  rm -rf agent-ctx
fi

echo ""
echo "✅ Workspace prepared for download!"
echo "📦 After download, restore with:"
echo "   bun install"
echo "   bunx prisma generate"
echo "   bunx prisma db push"
echo "   bun run dev"
echo ""
du -sh .
