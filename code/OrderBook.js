const fetch = require('node-fetch');
const util = require('./util');
const _ = require('lodash');

//const cbBookUrl = 'https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3'
const cbBookUrl = 'https://api.pro.coinbase.com/products/BTC-USD/book?level=3'

class OrderBook {
    constructor(testDuration) {
        this.testDuration = testDuration;
        this.bookCrossed = false;
        
        this.messages = [];
        this.processedMessages = [];
        this.orders = {};

        this.bestBids = [];
        this.bestAsks = [];

        this.run = true;
    }

    initialize() {
        fetch(cbBookUrl)
            .then(res => res.json())
            .then((json) => {
                this.sequence = json.sequence;
                console.log('sequence is' + ': ' + JSON.stringify(this.sequence));

                json.asks.forEach((ask) => {
                    const orderId = ask[2];

                    const order = {
                        type: 'open',
                        side: 'sell',
                        order_id: orderId,
                        price: ask[0],
                        remaining_size: ask[1],
                        nick: 'this is from nick'
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
                        remaining_size: bid[1],
                        nick: 'this is from nick'
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
        let removeMsgIndexes = [];

        messageCopy.forEach((m, mx) => {
            //console.log(`----Processing message with seq: ${m.sequence} . this.sequence is ${this.sequence}`)
            if (m.sequence <= this.sequence) {
                console.log('discarding message' + ': ' + JSON.stringify(m));
                this.messages.splice(mx, 1);
                return;
            }

            const handler = this.messageHandlers[m.type];

            if (handler) {
                //this.printTickInfo();
                handler(m);

                this.processedMessages.push(m);
                removeMsgIndexes.push(mx);

                // console.log(`removing message at index: ${mx}`);
                // console.log(`messages length: ${this.messages.length}`);
                // this.messages.splice(mx, 1);
                // console.log(`new messages length: ${this.messages.length}`);
            }
        });  

        this.messages = [];

        if (this.bookIsCrossed()) {
            this.bookIsCrossed(true);
            console.log(`BOOK IS CROSSED - EXITING`);
            console.log('Message backlog' + ': ' + JSON.stringify(this.messages.length));
            process.exit(1);
        }

        if (this.run) {
            //console.log('Setting process for next tick');
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

        if (bids && bids.length && asks && asks.length ) {
            const maxBid = _.maxBy(bids, (b) => Number(b.price));
            const minAsk = _.minBy(asks, (a) => Number(a.price));
    
            if (logInfo) {
                console.log('max bid' + ': ' + JSON.stringify(maxBid));
                console.log('min ask' + ': ' + JSON.stringify(minAsk));
            }
    
            return Number(maxBid.price) > Number(minAsk.price);
        } else {
            return false;
        }
    }

    messageHandlers = {
        open: (message) => {
            // {"type":"open","side":"buy","product_id":"BTC-USD","time":"2021-04-14T13:35:17.300223Z","sequence":309764206,"price":"64178.18","order_id":"8f25bab1-5176-46c5-b276-07403543d6de","remaining_size":"0.8764"}
            this.orders[message.order_id] = message;
            //console.log(`opening order: ${JSON.stringify(message)}`);

            // if (this.bookIsCrossed()) {
            //     this.bookCrossed(true);
            //     console.log(`BOOK IS CROSSED - EXITING`);
            //     process.exit(1);
            // }
        },
        done: (message) => {
            //{"type":"done","side":"sell","product_id":"BTC-USD","time":"2021-04-14T13:35:16.760150Z","sequence":309764200,"order_id":"6725d097-07c4-4ab9-bc5d-243ef8059f41","reason":"filled","price":"64192.1","remaining_size":"0"} 

            if (this.orders[message.order_id]) {
                //console.log(`deleting order: ${JSON.stringify(message)}`);
                delete this.orders[message.order_id];
            }
            
            // if (this.bookIsCrossed()) {
            //     this.bookCrossed(true);
            //     console.log(`BOOK IS CROSSED - EXITING`);
            //     process.exit(1);
            // }
        },
        change: (message) => {
            // change - an existing order needs to be changed

            /*
                When a market order using dc self-trade prevention encounters an open limit order, 
                the behavior depends on which fields for the market order message were specified. 
                If funds and size are specified for a buy order, 
                then size for the market order will be decremented internally within the matching engine and funds will remain unchanged. 
                The intent is to offset your target size without limiting your buying power.
                 If size is not specified, then funds will be decremented. 
                 For a market sell, the size will be decremented when encountering existing limit orders.
            */

            const order = this.orders[message.order_id];

            if (order) {
                console.log(`Changing order for ${message.order_id}`);

                order.size = message.new_size ? message.new_size : order.size;
                order.size = message.new_funds ? message.new_funds : order.size;

                this.orders[message.order_id] = order;
            }
            
            console.log(`In Change Handler`)
        },
        match: (message) => {
            //{"type":"match","side":"buy","product_id":"BTC-USD","time":"2021-04-14T13:35:16.760150Z","sequence":309764199,"trade_id":27775238,"maker_order_id":"f433fcd7-4fcc-41f0-adf3-fe65b1afbb5b","taker_order_id":"6725d097-07c4-4ab9-bc5d-243ef8059f41","size":"0.0256","price":"64235.13"}

             // match - a trade or partial trade occurred 
                // - remove it from the book, or update the size remaining if it's partial
                // this is a Tick (Market Event) - when this happens, we want to print the current best bid/ask in the book

            // maker_order_id is an order i have on the book

            let makerOrder = this.orders[message.maker_order_id];
            if (makerOrder) {
                const bookOrderSize = makerOrder.remaining_size ? makerOrder.remaining_size : makerOrder.size;
                
                const remainingSize = Number(bookOrderSize) - Number(message.size);

                if (remainingSize == 0) {
                    //console.log('deleting' + ': ' + JSON.stringify(this.orders[makerOrder.order_id]));
                    // I dont think i need to handle this delete, because it will come in as a 'done' message 
                    //delete this.orders[makerOrder.order_id];
                    return;
                }

                makerOrder.remaining_size = `${remainingSize}`;
                this.orders[makerOrder.order_id];
            }

            console.log('Match message' + ': ' + JSON.stringify(message));
            this.printTickInfo();
        }
    }

    queueMessage(message) {
        //console.log(`sequence: ${this.sequence} messageSeq: ${message.sequence}`);

        if (this.sequence && message.sequence <= this.sequence) {
            console.log('should discard message' + ': ' + JSON.stringify(message));
        }

        if (util.shouldQueueMessage(message)) {
            this.messages.push(message);
        } else {
            //console.log('ignoring message' + ': ' + JSON.stringify(message));
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
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(ask.price, 2)} || orderid: ${ask.order_id} , type: ${ask.side}`);
        });

        console.log(`---------------------`);

        bestBids.forEach((bid) => {
            const size = bid.remaining_size ? bid.remaining_size : bid.size;
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(bid.price, 2)}  || orderid: ${bid.order_id} , type: ${bid.side}`);
        });
        console.log('');

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
