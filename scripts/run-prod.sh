#!/bin/bash
# Wrapper script that runs the Next.js standalone server and restarts it if it dies.
cd /home/z/my-project

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

while true; do
  echo "[$(date '+%H:%M:%S')] Starting Next.js standalone server..."
  node .next/standalone/server.js
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Next.js exited with code $EXIT_CODE. Restarting in 2s..."
  sleep 2
done
