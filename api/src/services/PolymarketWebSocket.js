// polysportsclaw-api/src/services/PolymarketWebSocket.js

const WebSocket = require('ws');
const EventEmitter = require('events');

const POLYMARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

/**
 * Polymarket WebSocket 服务
 * 订阅市场实时价格变化
 */
class PolymarketWebSocket extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.isConnected = false;
        this.subscribedAssets = new Set();
        this.priceCache = new Map();  // assetId -> { price, timestamp }
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;  // 5 秒
        this.pingInterval = null;
    }

    /**
     * 连接到 Polymarket WebSocket
     */
    async connect() {
        if (this.isConnected) {
            console.log('[PolymarketWS] Already connected');
            return;
        }

        return new Promise((resolve, reject) => {
            console.log('[PolymarketWS] Connecting to', POLYMARKET_WS_URL);

            try {
                this.ws = new WebSocket(POLYMARKET_WS_URL);

                this.ws.on('open', () => {
                    console.log('[PolymarketWS] Connected successfully');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;

                    // 重新订阅之前的资产
                    if (this.subscribedAssets.size > 0) {
                        this.subscribeToAssets(Array.from(this.subscribedAssets));
                    }

                    // 启动心跳
                    this.startPing();

                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (err) {
                        console.error('[PolymarketWS] Failed to parse message:', err);
                    }
                });

                this.ws.on('close', (code, reason) => {
                    console.log(`[PolymarketWS] Connection closed: ${code} - ${reason}`);
                    this.isConnected = false;
                    this.stopPing();
                    this.emit('disconnected');

                    // 自动重连
                    this.scheduleReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('[PolymarketWS] WebSocket error:', error.message);
                    this.emit('error', error);
                });

                // 连接超时
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

            } catch (error) {
                console.error('[PolymarketWS] Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(message) {
        const { event_type, asset_id, price } = message;

        if (event_type === 'price_change' || event_type === 'last_trade_price') {
            const priceNum = parseFloat(price);

            // 更新缓存
            this.priceCache.set(asset_id, {
                price: priceNum,
                timestamp: Date.now(),
                eventType: event_type
            });

            // 发出价格更新事件
            this.emit('price_update', {
                assetId: asset_id,
                price: priceNum,
                eventType: event_type,
                timestamp: Date.now()
            });

            console.log(`[PolymarketWS] Price update: ${asset_id} = ${price}`);
        }
    }

    /**
     * 订阅资产价格变化
     * @param {string[]} assetIds - CLOB token IDs 数组
     */
    subscribeToAssets(assetIds) {
        if (!this.isConnected || !this.ws) {
            console.warn('[PolymarketWS] Not connected, queuing subscription');
            assetIds.forEach(id => this.subscribedAssets.add(id));
            return;
        }

        const message = {
            type: 'subscribe',
            channel: 'market',
            assets_ids: assetIds
        };

        this.ws.send(JSON.stringify(message));
        assetIds.forEach(id => this.subscribedAssets.add(id));

        console.log(`[PolymarketWS] Subscribed to ${assetIds.length} assets`);
    }

    /**
     * 取消订阅
     */
    unsubscribeFromAssets(assetIds) {
        if (!this.isConnected || !this.ws) return;

        const message = {
            type: 'unsubscribe',
            channel: 'market',
            assets_ids: assetIds
        };

        this.ws.send(JSON.stringify(message));
        assetIds.forEach(id => this.subscribedAssets.delete(id));

        console.log(`[PolymarketWS] Unsubscribed from ${assetIds.length} assets`);
    }

    /**
     * 获取缓存的价格
     */
    getCachedPrice(assetId) {
        return this.priceCache.get(assetId) || null;
    }

    /**
     * 获取所有缓存的价格
     */
    getAllCachedPrices() {
        return Object.fromEntries(this.priceCache);
    }

    /**
     * 启动心跳
     */
    startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.ws) {
                this.ws.ping();
            }
        }, 30000);  // 30 秒
    }

    /**
     * 停止心跳
     */
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * 计划重连
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[PolymarketWS] Max reconnection attempts reached');
            this.emit('max_reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

        console.log(`[PolymarketWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(err => {
                console.error('[PolymarketWS] Reconnection failed:', err.message);
            });
        }, delay);
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscribedAssets.clear();
        console.log('[PolymarketWS] Disconnected');
    }

    /**
     * 获取连接状态
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            subscribedCount: this.subscribedAssets.size,
            cachedPricesCount: this.priceCache.size,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// 全局单例
let instance = null;

function getPolymarketWS() {
    if (!instance) {
        instance = new PolymarketWebSocket();
    }
    return instance;
}

module.exports = {
    PolymarketWebSocket,
    getPolymarketWS
};
