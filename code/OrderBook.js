const fetch = require('node-fetch');
const util = require('./util');

const cbBookUrl = 'https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3'

class OrderBook {
    constructor() {
        console.log('in order book constructor');
        
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
            // Response looks like: [ price, size, order_id ]
            /*
               { 
                   bids: [ // bids = amount of money a buyer is willing to pay
                       [ '62883.81', '4771', '2b6e645c-29c8-4333-81b0-042932296317' ],
                       [ '62883.8', '6020', '1c75604c-274d-4474-9560-1c844393d84e' ],
                       [ '62883.79', '6989', '467a8da8-15cd-4836-bece-1cbd9983d89a' ]
               ], 
               asks: [ // asks = amount of money a seller is willing to sell for
                       [ '62883.85', '4771', '8fc58e9d-d3ed-49da-b686-77cca3bb04cd' ],
                       [ '62883.86', '6020', '0f721713-e12b-43bb-a4b1-5e44a0135055' ],
                       [ '62883.87', '6989', 'e4116e21-74b8-4381-986b-d699425e8441' ]
               ] 
           }
            */

            json.bids.forEach((bid) => {
                const orderId = bid[2];

                const order = {
                    type: 'open',
                    side: 'buy',
                    order_id: orderId,
                    price: bid[0],
                    size: bid[1]
                };

                // if this bid is higher than the highest bid, push it to the best bids list
                if (this.bestBids.length === 0 || this.bestBids.length < 5 || order.price > this.bestBids[0].price) {
                    this.bestBids.push(order);
                }

                this.orders[orderId] = order;
            });

            this.bestBids = util.sortAndTake5Best(this.bestBids, false);
            console.log(`best bids: ${JSON.stringify(this.bestBids)}`);

            json.asks.forEach((bid) => {
                const orderId = bid[2];

                const order = {
                    type: 'open',
                    side: 'sell',
                    order_id: orderId,
                    price: bid[0],
                    size: bid[1]
                };

                // if this ask is less than the lowest ask, push it to the best asks list
                if (this.bestAsks.length === 0 || this.bestAsks.length < 5 || order.price < this.bestAsks[0].price) {
                    this.bestAsks.push(order);
                }

                this.orders[orderId] = order;
            });

            this.bestAsks = util.sortAndTake5Best(this.bestAsks, true);
            console.log(`best asks: ${JSON.stringify(this.bestAsks)}`);

            console.log(`Total Orders from CB Book: ${Object.keys(this.orders).length}`);
            console.log('Starting main message handler loop');
            this.processMessagesLoop();
        });
    }

    processMessagesLoop() {
        const messageCopy = this.messages;

        for (let i = 0; i < messageCopy.length; i++) {
            const m = messageCopy[i];
            const handler = this.messageHandlers[m.type];

            if (handler) {
                console.log(`Open Orders: ${Object.keys(this.orders).length}`);
                handler(m);
                console.log(`Open Orders: ${Object.keys(this.orders).length}`);

                this.processedMessages.push(m);
                this.messages.splice(i, 1);
            }
        }

        if (this.run) {
            setImmediate(this.processMessagesLoop.bind(this));
        }
    }

    messageHandlers = {
        open: (message) => {
            // {"type":"open","side":"buy","product_id":"BTC-USD","time":"2021-04-14T13:35:17.300223Z","sequence":309764206,"price":"64178.18","order_id":"8f25bab1-5176-46c5-b276-07403543d6de","remaining_size":"0.8764"}
            this.orders[message.order_id] = message;

            util.logMessage(message, 'Added Order');
        },
        done: (message) => {
            //{"type":"done","side":"sell","product_id":"BTC-USD","time":"2021-04-14T13:35:16.760150Z","sequence":309764200,"order_id":"6725d097-07c4-4ab9-bc5d-243ef8059f41","reason":"filled","price":"64192.1","remaining_size":"0"} 
            delete this.orders[message.order_id];
        },
        change: (message) => {
            // change - an existing order needs to be changed
            
            console.log(`In Change Handler`)
        },
        match: (message) => {
            //{"type":"match","side":"buy","product_id":"BTC-USD","time":"2021-04-14T13:35:16.760150Z","sequence":309764199,"trade_id":27775238,"maker_order_id":"f433fcd7-4fcc-41f0-adf3-fe65b1afbb5b","taker_order_id":"6725d097-07c4-4ab9-bc5d-243ef8059f41","size":"0.0256","price":"64235.13"}

             // match - a trade or partial trade occurred 
                // - remove it from the book, or update the size remaining if it's partial
                // this is a Tick (Market Event) - when this happens, we want to print the current best bid/ask in the book
        }
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            util.logMessage(message, 'queuing message type');
            this.messages.push(message);
            console.log(`total messages queued: ${Object.keys(this.messages).length}`);
        }
    }

    printTickInfo() {
        // get the "best" bids and ask fors the current tick and print them like

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
