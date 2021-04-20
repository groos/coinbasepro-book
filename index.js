const { OrderBook } = require('./code/OrderBook');
const readline = require('readline');

const run = async function () {
    const book = new OrderBook();
    book.connectWebSocket();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('SIGINT', () => {
        if (book.socket) {
            book.socket.close();
        }
        
        process.exit(0)
    });
};

run();