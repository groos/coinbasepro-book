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
        
        this.preloadedMessages = [];
        this.messages = [];
        this.orders = {};

        this.bestBid = {};
        this.bestAsk = {};

        this.run = true;
    }

    updateBestOrders(order) {
        if (order.side === 'buy' && Number(order.price) > Number(this.bestBid.price)) {
            this.bestBid = order;
        }

        if (order.side === 'sell' && Number(order.price) < Number(this.bestAsk.price)) {
            this.bestAsk = order;
        }
    }

    initialize() {
        fetch(cbBookUrl)
            .then(res => res.json())
            .then((json) => {
                this.sequence = json.sequence;
                console.log(`Starting sequence is: ${this.sequence}`);

                const orderFromSnapshot = (snap, type, orderId) => {
                    return {
                        type: 'open',
                        side: type,
                        order_id: orderId,
                        price: snap[0],
                        remaining_size: snap[1]
                    };
                }

                this.bestAsk = orderFromSnapshot(json.asks[0], 'sell', json.bids[0][2]);
                this.bestBid = orderFromSnapshot(json.bids[0], 'buy', json.bids[0][2]);

                console.log('best ask' + ': ' + JSON.stringify(this.bestAsk));
                console.log('best bid' + ': ' + JSON.stringify(this.bestBid));

                json.asks.forEach((ask) => {
                    const orderId = ask[2];
                    const order = orderFromSnapshot(ask, 'sell', orderId);

                    this.updateBestOrders(order);

                    this.orders[orderId] = order;
                });

                json.bids.forEach((bid) => {
                    const orderId = bid[2];
                    const order = orderFromSnapshot(bid, 'buy', orderId);

                    this.updateBestOrders(order);

                    this.orders[orderId] = order;
                });

                console.log(`Total Orders from CB Book: ${Object.keys(this.orders).length}`);
                console.log(`Queued messages waiting: ${this.messages.length}`);
                console.log('Starting main message handler loop');

                const firstMessage = this.messages[this.messages.length-1];
                console.log(`start sequence: ${this.sequence}, first msg sequence: ${firstMessage.sequence}`);

                this.processMessagesLoop();
            });
    }

    processMessagesLoop() {
        while (this.messages.length > 0) {
            const m = this.messages.pop();

            if (m.sequence <= this.sequence) {
                console.log('Discarding message' + ': ' + JSON.stringify(m));
                continue;
            }

            const handler = this.messageHandlers[m.type];

            if (handler) {
                handler(m);
            }
        }

        if (this.run) {
            setImmediate(this.processMessagesLoop.bind(this));
        }
    }

    bookIsCrossed = (logInfo) => {
        const maxBid = this.getMaxBid();
        const minAsk = this.getMinAsk();

        if (logInfo && Number(maxBid.price) > Number(minAsk.price)) {
            console.log('max bid' + ': ' + JSON.stringify(maxBid));
            console.log('min ask' + ': ' + JSON.stringify(minAsk));
        }

        return Number(maxBid.price) > Number(minAsk.price);
    }

    messageHandlers = {
        open: (message) => {
            this.orders[message.order_id] = message;
            this.updateBestOrders(message);
        },
        done: (message) => {
            if (this.orders[message.order_id]) {
                delete this.orders[message.order_id];
            }

            if (this.bestBid.order_id === message.order_id) {
                this.bestBid = this.getMaxBid();
            }

            if (this.bestAsk.order_id === message.order_id) {
                this.bestAsk = this.getMinAsk();
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
                this.orders[makerOrder.order_id] = makerOrder;
            }

            this.printTickInfo();
        }
    }

    getMaxBid() {
        const bids = Object.keys(this.orders).filter((k) => {
            return this.orders[k].side === 'buy';
        }).map((k) => this.orders[k]);

        return _.maxBy(bids, (b) => Number(b.price));
    }

    getMinAsk() {
        const asks = Object.keys(this.orders).filter((k) => {
            return this.orders[k].side === 'sell';
        }).map((k) => this.orders[k]);

        return  _.minBy(asks, (a) => Number(a.price));
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            this.messages.unshift(message);
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
        console.log(`best ask: ${JSON.stringify(this.bestAsk)}`);
        console.log(`---------------------`);

        bestBids.forEach((bid) => {
            const size = bid.remaining_size ? bid.remaining_size : bid.size;
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(bid.price, 2)}`);
        });
        console.log('best bid' + ': ' + JSON.stringify(this.bestBid));
        console.log('');

        if (this.bookIsCrossed()) {
            this.bookIsCrossed(true);
            console.log(`BOOK IS CROSSED - EXITING`);
            this.abortConnection();
        }

        /* print format
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
