const { OrderBook } = require('./code/OrderBook');
const WebSocket = require('ws');

const cbWebsocket = 'wss://ws-feed.pro.coinbase.com';

// {"type":"subscriptions","channels":[{"name":"level2","product_ids":["BTC-USD"]},{"name":"heartbeat","product_ids":["BTC-USD"]},{"name":"ticker","product_ids":["BTC-USD"]}]}
// {"type":"snapshot","product_id":"BTC-USD","asks":[["63297.76","2.94530258"],["63297.77","0.00650000"].....

const run = () => {

    //const book = new OrderBook();

    // connect to wss://ws-feed.pro.coinbase.com via websocket
    // subscribe to BTC-USD market data
    const wsClient = new WebSocket(cbWebsocket)

    wsClient.on('message', (msg) => {

        const parsed = JSON.parse(msg);
        console.log(`message type: ${parsed.type}`);

        if (parsed.type === 'subscriptions') {
            console.log('got a subscription');
        }

        if (parsed.type === 'l2update') {
            console.log('got an l2update');
            //
        }

        if (parsed.type === 'ticker') {
            // get the proper ask/bid levels for this tick and print them

            // reset book
            console.log('got a tick');
        }

        console.log(msg);
    });

    wsClient.on('close', () => {
        console.log('connection closed');
    })

    wsClient.on('open', () => {
        const subscribeRequest = {
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        };

        console.log('sending subscribe request');
        wsClient.send(JSON.stringify(subscribeRequest));
    });
};


run();