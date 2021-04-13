const { OrderBook } = require('./code/OrderBook');
const WebSocket = require('ws');

const cbWebsocket = 'wss://ws-feed-public.sandbox.pro.coinbase.com';

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

    book.getCBSnapshot();

    // connect to wss://ws-feed-public.sandbox.pro.coinbase.com via websocket
    // subscribe to BTC-USD market data
    const wsClient = new WebSocket(cbWebsocket)

    wsClient.on('message', (msg) => {
        const parsedMessage = JSON.parse(msg);

        console.log(`message type: ${parsedMessage.type}`);
        console.log(parsedMessage);

        book.queueMessage(parsedMessage);
    });

    // wsClient.on('open', () => {
    //     const subscribeRequest = {
    //         type: 'subscribe',
    //         product_ids: ['BTC-USD'],
    //         channels: ['full']
    //     };

    //     console.log('sending subscribe request');
    //     wsClient.send(JSON.stringify(subscribeRequest));
    // });

    wsClient.on('close', () => {
        console.log('connection closed');
    });
};


run();