const { OrderBook } = require('./OrderBook');
const {createWebSocket} = require('./socket');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const run = async function (testDuration) {
    let resync = false;

    const handleAbort = (reboot) => {
        if (reboot) {
            resyncBook();
            return;
        }

        if (!testDuration) {
            wsClient.close();
        }
    };

    const resyncBook = async () => {
        resync = true;
        wsClient.close();

        // create a new web socket with the book
    };

    const book = new OrderBook(testDuration);
    book.socket = createWebSocket(book);

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