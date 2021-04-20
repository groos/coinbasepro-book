const fetch = require('node-fetch');
const util = require('./util');
const _ = require('lodash');
const { createWebSocket } = require('./socket');

const cbBookUrl = 'https://api.pro.coinbase.com/products/BTC-USD/book?level=3'

class OrderBook {
    constructor(isTest) {
        this.isTest = isTest;
        this.resetData();
    }

    connectWebSocket() {
        this.socket = createWebSocket(this);
    }

    resetSocket() {
        this.resetData()
        this.socket.close();
        this.connectWebSocket(this);
    }

    resetData() {
        this.bookNeedsSnapshotSync = false;
        
        this.messages = [];
        this.orders = {};

        this.bestOrders = [];
        this.bestBid = {};
        this.bestAsk = {};
    }

    syncWithBookSnapshot() {
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

                this.processMessagesLoop();
            });
    }

    processMessagesLoop() {
        this.messages.sort((a, b) => {
            return b.sequence - a.sequence;
        });
        
        while (this.messages.length > 0 && !this.bookNeedsSnapshotSync) {
            const m = this.messages.pop();
            if (m.sequence <= this.sequence) continue;

            if (this.messageHandlers[m.type]) {
                this.messageHandlers[m.type](m);
                this.checkBookOutOfSync();
            }
        }

        if (!this.isTest && this.bookNeedsSnapshotSync) {
            this.resetSocket();
            return;
        }

        setImmediate(this.processMessagesLoop.bind(this));
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            this.messages.unshift(message);
        }
    }

    printTickInfo() {
        const bestBids = util.sortAndTake5Best(this.bestOrders.filter(o => o.side === 'buy'), false);
        const bestAsks = util.sortAndTake5Best(this.bestOrders.filter(o => o.side === 'sell'), true);

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

            if (!this.checkBookOutOfSync()) {
                const ordersArray = Object.keys(this.orders).map(k => this.orders[k]);
                const bestBids = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'buy'), false);
                const bestAsks = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'sell'), true);

                // build output data for this tick
                this.bestOrders = bestBids.concat(bestAsks);

                if (!this.isTest) {
                    this.printTickInfo();
                }
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

    checkBookOutOfSync() {
        this.bookNeedsSnapshotSync = Number(this.bestAsk.price) <= Number(this.bestBid.price);
        return this.bookNeedsSnapshotSync;
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
