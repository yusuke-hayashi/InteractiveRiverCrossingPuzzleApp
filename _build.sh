#!/bin/bash
cd river-crossing-puzzle
npm install
npm run build
cd ..
npx wrangler deploy --assets=./river-crossing-puzzle/build