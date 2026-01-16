#!/bin/bash

# ==============================================================================
# SECRET SANITIZATION SCRIPT
# ==============================================================================
# WARNING: This script rewrites git history. It is destructive.
# Ensure you have a backup of your repository before running this.
#
# USAGE:
# 1. Install git-filter-repo: pip install git-filter-repo
# 2. Run this script from the repository root.
# ==============================================================================

echo "WARNING: This script will remove secrets from your git history."
echo "You should have a backup before proceeding."
echo "Press Ctrl+C to cancel or wait 5 seconds to continue..."
sleep 5

# Files to scrub from history
FILES_TO_REMOVE=(
  "backend/.env"
  "mobile/.env"
  "backend/firebase-service-account.json"
  "mobile/google-services.json"
  "mobile/GoogleService-Info.plist"
  "backend/src/config/firebase-service-account.json"
)

# Construct the arguments for git-filter-repo
ARGS=""
for file in "${FILES_TO_REMOVE[@]}"; do
  ARGS="$ARGS --path $file"
done

# Run git-filter-repo to remove these paths from history (invert-paths)
echo "Running git-filter-repo..."
git filter-repo --invert-paths $ARGS --force

echo "Secrets removed from history."
echo "You must now force push to your remote repository:"
echo "git push origin --force --all"
echo "git push origin --force --tags"

echo "IMPORTANT: Rotate your exposed secrets (MongoDB password, Firebase keys) IMMEDIATELY."
