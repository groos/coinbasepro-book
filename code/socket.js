const WebSocket = require('ws');

const timeout = 30000;
const cbWebsocketUrl = 'wss://ws-feed.pro.coinbase.com';

const createWebSocket = (book) => {
    const wsClient = new WebSocket(cbWebsocketUrl);

    wsClient.pingTimeout = setTimeout(() => {
        console.log(`Book ran for ${timeout} seconds. Terminating based on timeout configuration.`);
        wsClient.terminate();
    }, timeout);

    wsClient.on('open', () => {
        console.log('Subscribing to CB "full" channel');
        wsClient.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        }));
    });

    let gotFirstMessage = false;
    wsClient.on('message', (msg) => {
        const parsedMessage = JSON.parse(msg);
        book.queueMessage(parsedMessage);

        if (!gotFirstMessage && parsedMessage.type !== 'subscriptions') {
            book.initialize();
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
            console.log('Unsubscribed from channel');
            wsClient.terminate();
            console.log('Socket connection closed');
            
            

            //rl.close(); // todo - handle closing this vs when we are resyncing the book
        });
    });

    return wsClient;
}

module.exports = {
    createWebSocket: createWebSocket
};