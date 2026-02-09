#!/bin/bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=d5f62e4a0e38dc49
export DB_NAME=polysportsclaw

/www/server/nodejs/v24.12.0/bin/node /www/wwwroot/moltbook/polysportsclaw-api/scripts/sync-nba-games.js >> /www/wwwroot/moltbook/polysportsclaw-api/logs/sync-nba.log 2>&1
