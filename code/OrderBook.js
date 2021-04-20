const fetch = require('node-fetch');
const util = require('./util');
const _ = require('lodash');

//const cbBookUrl = 'https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3'
const cbBookUrl = 'https://api.pro.coinbase.com/products/BTC-USD/book?level=3'

class OrderBook {
    constructor(closeSocket, isTest) {
        this.abortConnection = closeSocket;
        this.isTest = isTest;
        this.bookCrossed = false;
        
        this.messages = [];
        this.orders = {};

        this.bestBid = {};
        this.bestAsk = {};
    }

    initialize() {
        fetch(cbBookUrl)
            .then(res => res.json())
            .then((json) => {
                this.sequence = json.sequence;

                const orderFromSnapshot = (snap, type, orderId) => {
                    return {
                        type: 'open',
                        side: type,
                        order_id: orderId,
                        price: snap[0],
                        remaining_size: snap[1]
                    };
                }

                // init some default best ask/bids
                this.bestAsk = orderFromSnapshot(json.asks[0], 'sell', json.bids[0][2]);
                this.bestBid = orderFromSnapshot(json.bids[0], 'buy', json.bids[0][2]);

                json.asks.forEach((ask) => {
                    const orderId = ask[2];
                    const order = orderFromSnapshot(ask, 'sell', orderId);

                    this.checkIfOrderIsBest(order);

                    this.orders[orderId] = order;
                });

                json.bids.forEach((bid) => {
                    const orderId = bid[2];
                    const order = orderFromSnapshot(bid, 'buy', orderId);

                    this.checkIfOrderIsBest(order);

                    this.orders[orderId] = order;
                });

                console.log(`Total Orders from Book Snapshot: ${Object.keys(this.orders).length}`);
                console.log(`Queued messages waiting: ${this.messages.length}`);
                console.log('Starting main message handler loop');

                this.processMessagesLoop();
            });
    }

    processMessagesLoop() {
        while (this.messages.length > 0) {
            const m = this.messages.pop();

            if (m.sequence <= this.sequence) continue;

            if (this.messageHandlers[m.type]) {
                this.messageHandlers[m.type](m);
                this.checkBookIsCrossed();
            }
        }

        // use node process loop to poll our messages queue
        setImmediate(this.processMessagesLoop.bind(this));
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            this.messages.unshift(message);
        }
    }

    printTickInfo() {
        const ordersArray = Object.keys(this.orders).map(k => this.orders[k]);

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
    }

    messageHandlers = {
        open: (message) => {
            this.orders[message.order_id] = message;
            this.checkIfOrderIsBest(message);
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

                this.checkIfOrderIsBest(order);
            }
        },
        match: (message) => {
            let makerOrder = this.orders[message.maker_order_id];
            if (makerOrder) {
                const bookOrderSize = makerOrder.remaining_size ? makerOrder.remaining_size : makerOrder.size;                
                const remainingSize = Number(bookOrderSize) - Number(message.size);

                makerOrder.remaining_size = `${remainingSize}`;
                this.orders[makerOrder.order_id] = makerOrder;

                this.checkIfOrderIsBest(makerOrder);
            }

            if (!this.isTest) {
                this.printTickInfo();
            }
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

    checkBookIsCrossed() {
        const crossed = Number(this.bestAsk.price) <= Number(this.bestBid.price);

        if (crossed) {
            this.bookCrossed = true;
            this.abortConnection();
        }
    }

    checkIfOrderIsBest(order) {
        if (order.side === 'buy' && typeof this.bestBid.price === 'undefined') {
            this.bestBid = order;
            return;
        }

        if (order.side === 'sell' && typeof this.bestAsk.price === 'undefined') {
            this.bestAsk = order;
            return;
        }

        if (order.side === 'buy' && Number(order.price) > Number(this.bestBid.price)) {
            this.bestBid = order;
            return;
        }

        if (order.side === 'sell' && Number(order.price) < Number(this.bestAsk.price)) {
            this.bestAsk = order;
            return;
        }
    }
}

module.exports = {
    OrderBook
}
