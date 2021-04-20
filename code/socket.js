const WebSocket = require('ws');

const timeout = 50000;
const cbWebsocketUrl = 'wss://ws-feed.pro.coinbase.com';

const createWebSocket = (book) => {
    const wsClient = new WebSocket(cbWebsocketUrl);

    wsClient.pingTimeout = setTimeout(() => {
        console.log(`Book ran for ${timeout} seconds. Terminating based on timeout configuration.`);
        wsClient.terminate();
    }, timeout);

    wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        }));
    });

    // start queueing messages before syncing with snapshot
    let gotFirstMessage = false;
    wsClient.on('message', (msg) => {
        const parsedMessage = JSON.parse(msg);
        book.queueMessage(parsedMessage);

        if (!gotFirstMessage && parsedMessage.type !== 'subscriptions') {
            book.syncWithBookSnapshot();
            gotFirstMessage = true;
        }
    });

    wsClient.on('close', () => {
        clearTimeout(wsClient.pingTimeout);

        wsClient.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        }), () => {
            wsClient.terminate();
        });
    });

    return wsClient;
}

module.exports = {
    createWebSocket: createWebSocket
};