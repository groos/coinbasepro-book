const { OrderBook } = require('./OrderBook');
const readline = require('readline');
const WebSocket = require('ws');
const util = require('./util');
const { first } = require('lodash');
const { parse } = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

//const cbWebsocketUrl = 'wss://ws-feed-public.sandbox.pro.coinbase.com';
const cbWebsocketUrl = 'wss://ws-feed.pro.coinbase.com';

const run = async function(testDuration) {
    const wsClient = new WebSocket(cbWebsocketUrl);
    const book = new OrderBook( () => { wsClient.close() }, testDuration);

    let gotFirstMessage = false;

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
        book.queueMessage(parsedMessage);

        if (!gotFirstMessage && parsedMessage.type !== 'subscriptions') {
            setTimeout(() => {
                console.log('first message' + ': ' + JSON.stringify(parsedMessage));
                book.initialize();
            }, 2000);

            gotFirstMessage = true;
        }
    });

    wsClient.on('close', () => {
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
    })

    // for mocha test, close the socket after X secconds
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