const WebSocket = require('ws');
const EventEmitter = require('events');
const config = require('../config');

// Polymarket WebSocket API URL
const POLYMARKET_WEBSOCKET_API_URL = config.polymarket.websocketApiUrl || 'wss://polymarket.com/ws';

class PolymarketWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = null;
    this.marketsToSubscribe = new Set(); // Store market IDs to subscribe to
  }

  /**
   * Connects to the Polymarket WebSocket API.
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Polymarket WebSocket already connected or connecting.');
      return;
    }

    console.log('Connecting to Polymarket WebSocket...');
    this.ws = new WebSocket(POLYMARKET_WEBSOCKET_API_URL);

    this.ws.onopen = () => {
      console.log('Polymarket WebSocket connected.');
      this.isConnected = true;
      this.emit('connected');
      this.resubscribeToMarkets(); // Resubscribe to markets on reconnect
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      console.warn(`Polymarket WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
      this._startReconnectInterval();
    };

    this.ws.onerror = (error) => {
      console.error('Polymarket WebSocket error:', error.message);
      this.ws.close(); // Close to trigger onclose and reconnect
    };
  }

  /**
   * Disconnects from the WebSocket.
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      console.log('Polymarket WebSocket explicitly disconnected.');
    }
  }

  /**
   * Starts a reconnect interval.
   */
  _startReconnectInterval() {
    if (!this.reconnectInterval) {
      console.log('Attempting to reconnect to Polymarket WebSocket every 5 seconds...');
      this.reconnectInterval = setInterval(() => {
        this.connect();
      }, 5000);
    }
  }

  /**
   * Subscribes to a specific Polymarket market for updates.
   * @param {string} marketId - The ID of the market to subscribe to.
   */
  subscribeToMarket(marketId) {
    this.marketsToSubscribe.add(marketId);
    if (this.isConnected) {
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        channel: 'market', // Assuming 'market' channel for market updates
        id: marketId,
      });
      this.ws.send(subscribeMessage);
      console.log(`Subscribed to Polymarket market: ${marketId}`);
    } else {
      console.log(`WebSocket not connected, will subscribe to ${marketId} on reconnect.`);
    }
  }
  
  /**
   * Resubscribes to all previously requested markets.
   */
  resubscribeToMarkets() {
    if (this.isConnected && this.marketsToSubscribe.size > 0) {
      console.log('Resubscribing to markets...');
      this.marketsToSubscribe.forEach(marketId => {
        this.subscribeToMarket(marketId);
      });
    }
  }

  /**
   * Unsubscribes from a specific Polymarket market.
   * @param {string} marketId - The ID of the market to unsubscribe from.
   */
  unsubscribeFromMarket(marketId) {
    this.marketsToSubscribe.delete(marketId);
    if (this.isConnected) {
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        channel: 'market',
        id: marketId,
      });
      this.ws.send(unsubscribeMessage);
      console.log(`Unsubscribed from Polymarket market: ${marketId}`);
    }
  }

  /**
   * Handles incoming WebSocket messages.
   * @param {Object} message - The parsed WebSocket message.
   */
  _handleWebSocketMessage(message) {
    // This is a placeholder. The actual message structure needs to be derived from Polymarket's WS documentation.
    // Assuming messages like: { type: 'marketUpdate', marketId: '...', outcomeId: '...', probability: '...' }
    if (message.type === 'marketUpdate' && message.marketId && message.outcomeId && message.probability !== undefined) {
      this.emit('probabilityUpdate', message.marketId, message.outcomeId, message.probability);
    } else if (message.type === 'marketStatusUpdate' && message.marketId && message.status) {
      this.emit('marketStatusUpdate', message.marketId, message.status, message.startTime, message.endTime);
    }
    // Add other message types as per Polymarket WS documentation
    // console.log('Received Polymarket WS message:', message);
  }
}

module.exports = PolymarketWebSocketService;
