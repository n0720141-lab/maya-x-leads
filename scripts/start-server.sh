#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js --port 3000
  sleep 2
done
