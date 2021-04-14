const { OrderBook } = require('./code/OrderBook');
const WebSocket = require('ws');
const util = require('./code/util');

const cbWebsocketUrl = 'wss://ws-feed-public.sandbox.pro.coinbase.com';

// {"type":"subscriptions","channels":[{"name":"level2","product_ids":["BTC-USD"]},{"name":"heartbeat","product_ids":["BTC-USD"]},{"name":"ticker","product_ids":["BTC-USD"]}]}
// {"type":"snapshot","product_id":"BTC-USD","asks":[["63297.76","2.94530258"],["63297.77","0.00650000"].....

/*
    Send a subscribe message for the product(s) of interest and the full channel.
    Queue any messages received over the websocket stream.
    Make a REST request for the order book snapshot from the REST feed.
    Playback queued messages, discarding sequence numbers before or equal to the snapshot sequence number.
    Apply playback messages to the snapshot as needed (see below).
    After playback is complete, apply real-time stream messages as they arrive.
*/


const run = () => {
    const book = new OrderBook();
    const wsClient = new WebSocket(cbWebsocketUrl)

    wsClient.on('message', (msg) => {
        const parsedMessage = JSON.parse(msg);

        util.logMessage(parsedMessage, 'Received Message');
        book.queueMessage(parsedMessage);
    });

    wsClient.on('open', () => {
        book.initialize();

        console.log('Subscribing to CB "full" channel');
        wsClient.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        }));
    });

    wsClient.on('close', () => {
        console.log('Socket connection closed');
    });
};


run();