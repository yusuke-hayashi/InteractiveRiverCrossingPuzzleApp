#!/bin/bash
set -e

echo "Building React app..."
cd river-crossing-puzzle
npm install
npm run build
cd ..

echo "Deploying to Cloudflare..."
npx wrangler deploy --assets=./river-crossing-puzzle/build