// polysportsclaw-api/src/routes/websocket.js

const express = require('express');
const { getPolymarketWS } = require('../services/PolymarketWebSocket');
const { fetchEventBySlug, constructEventSlug, NBA_TEAM_CODES } = require('../services/PolymarketService');

const router = express.Router();

/**
 * 从 Polymarket 市场数据中提取 CLOB Token IDs
 */
function extractClobTokenIds(market) {
    const tokenIds = [];

    if (market.clobTokenIds) {
        // 如果直接有 clobTokenIds
        try {
            const ids = typeof market.clobTokenIds === 'string'
                ? JSON.parse(market.clobTokenIds)
                : market.clobTokenIds;
            tokenIds.push(...ids);
        } catch (e) {
            console.error('[WebSocket] Failed to parse clobTokenIds:', e);
        }
    }

    return tokenIds;
}

/**
 * @route GET /api/v1/ws/status
 * @desc 获取 WebSocket 连接状态
 */
router.get('/status', (req, res) => {
    const ws = getPolymarketWS();
    res.json({
        success: true,
        status: ws.getStatus()
    });
});

/**
 * @route POST /api/v1/ws/connect
 * @desc 初始化 WebSocket 连接
 */
router.post('/connect', async (req, res) => {
    try {
        const ws = getPolymarketWS();

        if (ws.isConnected) {
            return res.json({
                success: true,
                message: 'Already connected',
                status: ws.getStatus()
            });
        }

        await ws.connect();

        res.json({
            success: true,
            message: 'Connected to Polymarket WebSocket',
            status: ws.getStatus()
        });
    } catch (error) {
        console.error('[WebSocket] Connection failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/v1/ws/subscribe
 * @desc 订阅市场价格更新
 * @body homeTeam, awayTeam, date - 用于构造 slug 并获取 token IDs
 */
router.post('/subscribe', async (req, res) => {
    try {
        const { homeTeam, awayTeam, date, tokenIds } = req.body;
        const ws = getPolymarketWS();

        if (!ws.isConnected) {
            await ws.connect();
        }

        let idsToSubscribe = tokenIds || [];

        // 如果提供了球队信息，获取对应的 token IDs
        if (homeTeam && awayTeam && date && idsToSubscribe.length === 0) {
            // 尝试多个日期
            const datesToTry = [
                date,
                new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            ];

            for (const tryDate of datesToTry) {
                const slug = constructEventSlug(awayTeam, homeTeam, tryDate);
                if (!slug) continue;

                const event = await fetchEventBySlug(slug);
                if (event && event.markets) {
                    for (const market of event.markets) {
                        const ids = extractClobTokenIds(market);
                        idsToSubscribe.push(...ids);
                    }
                    if (idsToSubscribe.length > 0) break;
                }
            }
        }

        if (idsToSubscribe.length === 0) {
            return res.json({
                success: false,
                message: 'No token IDs found to subscribe',
                status: ws.getStatus()
            });
        }

        ws.subscribeToAssets(idsToSubscribe);

        res.json({
            success: true,
            message: `Subscribed to ${idsToSubscribe.length} assets`,
            tokenIds: idsToSubscribe,
            status: ws.getStatus()
        });
    } catch (error) {
        console.error('[WebSocket] Subscription failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/ws/prices
 * @desc 获取缓存的实时价格
 * @query assetId - 可选，获取特定资产的价格
 */
router.get('/prices', (req, res) => {
    const { assetId } = req.query;
    const ws = getPolymarketWS();

    if (assetId) {
        const price = ws.getCachedPrice(assetId);
        res.json({
            success: true,
            price: price
        });
    } else {
        res.json({
            success: true,
            prices: ws.getAllCachedPrices()
        });
    }
});

/**
 * @route POST /api/v1/ws/disconnect
 * @desc 断开 WebSocket 连接
 */
router.post('/disconnect', (req, res) => {
    const ws = getPolymarketWS();
    ws.disconnect();

    res.json({
        success: true,
        message: 'Disconnected from Polymarket WebSocket'
    });
});

module.exports = router;
