#!/bin/bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=d5f62e4a0e38dc49
export DB_NAME=polysportsclaw
export POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com/events

/www/server/nodejs/v24.12.0/bin/node /www/wwwroot/moltbook/polysportsclaw-api/scripts/sync-polymarket.js >> /www/wwwroot/moltbook/polysportsclaw-api/logs/sync.log 2>&1
