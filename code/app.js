const { OrderBook } = require('./OrderBook');
const WebSocket = require('ws');
const util = require('./util');

//const cbWebsocketUrl = 'wss://ws-feed-public.sandbox.pro.coinbase.com';
const cbWebsocketUrl = 'wss://ws-feed.pro.coinbase.com';

const run = async function(testDuration) {
    let streamStarted = false;

    const book = new OrderBook(testDuration);
    const wsClient = new WebSocket(cbWebsocketUrl)

    wsClient.on('open', () => {
        console.log('Subscribing to CB "full" channel');
        wsClient.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['full']
        }));
    });

    wsClient.on('message', (msg) => {
        

        const parsedMessage = JSON.parse(msg);

        if (!streamStarted && parsedMessage.type !== 'subscriptions') {
            console.log('first message' + ': ' + JSON.stringify(parsedMessage));
            book.initialize();
            streamStarted = true;
        }

        //util.logMessage(parsedMessage, 'Received Message');
        book.queueMessage(parsedMessage);
    });

    wsClient.on('close', () => {
        console.log('Socket connection closed');
        process.exit();
    });

    // if it's a test run, close the socket after X secconds
    if (testDuration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const bookIsValid = !book.bookIsCrossed();
                resolve(bookIsValid);
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
        return new Promise(async (resolve, reject) => {
            const passed = await run(testDuration);

            if (passed) {
                done();
            } else {
                done(new Error('High Bid was greater than or equal to Low Ask'));
            }
        });
    }
}