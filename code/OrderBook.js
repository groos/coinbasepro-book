const fetch = require('node-fetch');
const util = require('./util');
const _ = require('lodash');

//const cbBookUrl = 'https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3'
const cbBookUrl = 'https://api.pro.coinbase.com/products/BTC-USD/book?level=3'

class OrderBook {
    constructor(closeSocket, testDuration) {
        this.abortConnection = closeSocket;
        this.testDuration = testDuration;
        this.bookCrossed = false;
        
        this.messages = [];
        this.orders = {};

        this.run = true;
    }

    initialize() {
        fetch(cbBookUrl)
            .then(res => res.json())
            .then((json) => {
                this.sequence = json.sequence;

                json.asks.forEach((ask) => {
                    const orderId = ask[2];

                    const order = {
                        type: 'open',
                        side: 'sell',
                        order_id: orderId,
                        price: ask[0],
                        remaining_size: ask[1]
                    };

                    this.orders[orderId] = order;
                });

                json.bids.forEach((bid) => {
                    const orderId = bid[2];

                    const order = {
                        type: 'open',
                        side: 'buy',
                        order_id: orderId,
                        price: bid[0],
                        remaining_size: bid[1]
                    };

                    this.orders[orderId] = order;
                });

                console.log(`Total Orders from CB Book: ${Object.keys(this.orders).length}`);
                console.log('Starting main message handler loop');

                this.processMessagesLoop();
            });

    }

    processMessagesLoop() {
        const messageCopy = Array.from(this.messages);
        messageCopy.forEach((m) => {
            if (m.sequence <= this.sequence) {
                console.log('discarding message' + ': ' + JSON.stringify(m));
                return;
            }

            const handler = this.messageHandlers[m.type];

            if (handler) {
                handler(m);
            }
        });  

        this.messages = [];

        // if (this.bookIsCrossed()) {
        //     this.bookIsCrossed(true);
        //     console.log(`BOOK IS CROSSED - EXITING`);
        //     console.log('Message backlog' + ': ' + JSON.stringify(this.messages.length));
        //     process.exit(1);
        // }

        if (this.run) {
            setImmediate(this.processMessagesLoop.bind(this));
        }
    }

    bookIsCrossed = (logInfo) => {
        const bids = Object.keys(this.orders).filter((k) => {
            return this.orders[k].side === 'buy';
        }).map((k) => this.orders[k]);

        const asks = Object.keys(this.orders).filter((k) => {
            return this.orders[k].side === 'sell';
        }).map((k) => this.orders[k]);

        const maxBid = _.maxBy(bids, (b) => Number(b.price));
        const minAsk = _.minBy(asks, (a) => Number(a.price));

        if (logInfo) {
            console.log('max bid' + ': ' + JSON.stringify(maxBid));
            console.log('min ask' + ': ' + JSON.stringify(minAsk));
        }

        return Number(maxBid.price) > Number(minAsk.price);
    }

    messageHandlers = {
        open: (message) => {
            this.orders[message.order_id] = message;
        },
        done: (message) => {
            if (this.orders[message.order_id]) {
                delete this.orders[message.order_id];
            }
        },
        change: (message) => {
            const order = this.orders[message.order_id];

            if (order) {
                order.size = message.new_size ? message.new_size : order.size;
                order.size = message.new_funds ? message.new_funds : order.size;

                this.orders[message.order_id] = order;
            }
        },
        match: (message) => {
            let makerOrder = this.orders[message.maker_order_id];
            if (makerOrder) {
                const bookOrderSize = makerOrder.remaining_size ? makerOrder.remaining_size : makerOrder.size;                
                const remainingSize = Number(bookOrderSize) - Number(message.size);

                makerOrder.remaining_size = `${remainingSize}`;
                this.orders[makerOrder.order_id];
            }

            this.printTickInfo();
        }
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            this.messages.push(message);
        }
    }

    printTickInfo() {
        const ordersArray = Object.keys(this.orders).map(k => this.orders[k]);

        // In a real implementation, we would manage this list continuously rather than have to resort it on every tick
        const bestBids = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'buy'), false);
        const bestAsks = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'sell'), true);

        console.log('');
        bestAsks.reverse().forEach((ask) => {
            const size = ask.remaining_size ? ask.remaining_size : ask.size;
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(ask.price, 2)}`);
        });

        console.log(`---------------------`);

        bestBids.forEach((bid) => {
            const size = bid.remaining_size ? bid.remaining_size : bid.size;
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(bid.price, 2)}`);
        });
        console.log('');

        if (this.bookIsCrossed()) {
            this.bookIsCrossed(true);
            console.log(`BOOK IS CROSSED - EXITING`);
            console.log('Message backlog' + ': ' + JSON.stringify(this.messages.length));
            this.abortConnection();
        }

        /*
            1.50000 @ 60858.43
            0.50000 @ 60858.27
            0.28740 @ 60857.64
            0.48960 @ 60852.87
            0.40010 @ 60851.26
            ---------------------
            0.07000 @ 60839.02
            0.45060 @ 60832.34
            0.29780 @ 60830.87
            1.50000 @ 60820.31
            0.50000 @ 60818.47
        */
    }
}

module.exports = {
    OrderBook
}
