const { OrderBook } = require('./OrderBook');
const {createWebSocket} = require('./socket');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const run = async function (testDuration) {
    const book = new OrderBook(testDuration);
    book.createWebSocket();

    rl.on('SIGINT', () => {
        book.socket.close();
        process.exit(0)
    });

    // for mocha timed test, close the socket after X seconds
    if (testDuration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const bookIsValid = !book.bookCrossed;
                resolve(bookIsValid);
                book.socket.close();
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