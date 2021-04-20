const { OrderBook } = require('./OrderBook');
const readline = require('readline');
const WebSocket = require('ws');

const timeout = 30000;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const cbWebsocketUrl = 'wss://ws-feed.pro.coinbase.com';

const run = async function (testDuration) {
    const wsClient = new WebSocket(cbWebsocketUrl);

    wsClient.pingTimeout = setTimeout(() => {
        console.log(`Book ran for ${timeout} seconds. Terminating based on timeout configuration.`);
        wsClient.terminate();
    }, timeout);

    const handleAbort = () => {
        if (!testDuration) {
            wsClient.close();
        }
    };

    const book = new OrderBook(handleAbort, testDuration);

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
            // preload buffer of messages before initializing to make sure we dont miss one
            setTimeout(() => { book.initialize(); }, 2000);
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
            rl.close();
        });
    });

    rl.on('SIGINT', () => {
        wsClient.close();
    });

    rl.on('close', () => {
        console.log('Exiting process');
        process.exit(0);
    });

    // for mocha timed test, close the socket after X seconds
    if (testDuration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const bookIsValid = !book.bookCrossed;
                resolve(bookIsValid);
                wsClient.close();
            }, testDuration);
        });
    }
};

module.exports = {
    start: () => {
        run();
    },
    startTimedTest: (testDuration, done) => {
        return new Promise(async (resolve, reject) => {
            const passed = await run(testDuration);
            const results = passed ? done : () => done(new Error('High Bid was greater than or equal to Low Ask'));

            results();
        });
    }
}