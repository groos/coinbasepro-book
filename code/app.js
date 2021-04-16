const { OrderBook } = require('./OrderBook');
const WebSocket = require('ws');
const util = require('./util');

const cbWebsocketUrl = 'wss://ws-feed-public.sandbox.pro.coinbase.com';

const run = async function(testDuration) {
    const book = new OrderBook(testDuration);
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
        process.exit();
    });

    // if it's a test run, close the socket after 10 secconds
    if (testDuration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(book.bookCrossed);
                wsClient.close();
            }, testDuration)
        })
    }
};

module.exports = {
    start: () => {
        run();
    },
    startTest: (testDuration, done) => {
        return new Promise(async function(resolve, reject) {
            const passed = await run(testDuration);

            if (passed) {
                done();
            } else {
                done(new Error('it failed!!'));
            }
        }.bind(this));
    }
}