const fetch = require('node-fetch');
const util = require('./util');

const cbBookUrl = 'https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3'

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

    shouldAddBestBid = (price) => {
        return this.bestBids.length === 0 || this.bestBids.length < 5 || price > this.bestBids[0].price
    }

    shouldAddBestAsk = (price) => {
        return this.bestAsks.length === 0 || this.bestAsks.length < 5 || price < this.bestAsks[0].price
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

        json.asks.forEach((bid) => {
            const orderId = bid[2];

            const order = {
                type: 'open',
                side: 'sell',
                order_id: orderId,
                price: bid[0],
                size: bid[1]
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
                    size: bid[1]
                };

                this.orders[orderId] = order;
            });

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
                //console.log(`Open Orders: ${Object.keys(this.orders).length}`);
                handler(m);
                //console.log(`Open Orders: ${Object.keys(this.orders).length}`);

                this.processedMessages.push(m);
                this.messages.splice(i, 1);
            }
        }

        if (this.testDuration) {
            // verify the book is not crossed
            // if it is, call this.reportTestResults(true)
            //this.bookCrossed = true;
        }
        

        if (this.run) {
            setImmediate(this.processMessagesLoop.bind(this));
        }
    }

    messageHandlers = {
        open: (message) => {
            // {"type":"open","side":"buy","product_id":"BTC-USD","time":"2021-04-14T13:35:17.300223Z","sequence":309764206,"price":"64178.18","order_id":"8f25bab1-5176-46c5-b276-07403543d6de","remaining_size":"0.8764"}
            this.orders[message.order_id] = message;

            //console.log('adding order' + ': ' + JSON.stringify(message));

            util.logMessage(message, 'Added Order');
        },
        done: (message) => {
            //{"type":"done","side":"sell","product_id":"BTC-USD","time":"2021-04-14T13:35:16.760150Z","sequence":309764200,"order_id":"6725d097-07c4-4ab9-bc5d-243ef8059f41","reason":"filled","price":"64192.1","remaining_size":"0"} 
            delete this.orders[message.order_id];
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

                //console.log(`found maker match: ${JSON.stringify(makerOrder)}`);
                //console.log(`match message: ${JSON.stringify(message)}`)
                // subtract message.size from makerOrder.remaining_size or makerOrder.size

                const bookOrderSize = makerOrder.remaining_size ? makerOrder.remaining_size : makerOrder.size;
                const remainingSize = Number(bookOrderSize) - Number(message.size);


                console.log(`Updating order subtracting size of ${message.size}: ${bookOrderSize} --> ${remainingSize}`);

                makerOrder.remaining_size = `${remainingSize}`;
                this.orders[makerOrder.order_id];
            } else {
                console.log('did not find maker match')
            }

            //console.log(`match: ${JSON.stringify(message)}`);
            this.printTickInfo();
        }
    }

    queueMessage(message) {
        if (util.shouldQueueMessage(message)) {
            //util.logMessage(message, 'queuing message type');
            this.messages.push(message);
            //console.log(`total messages queued: ${Object.keys(this.messages).length}`);
        }
    }

    printTickInfo() {
        const ordersArray = Object.keys(this.orders).map(k => this.orders[k]);

        // In a real implementation, we would manage this list continuously rather than have to resort it on every tick
        this.bestBids = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'buy'), false);
        this.bestAsks = util.sortAndTake5Best(ordersArray.filter(o => o.side === 'sell'), true);

        console.log('');
        this.bestAsks.reverse().forEach((ask) => {
            const size = ask.remaining_size ? ask.remaining_size : ask.size;
            //console.log('ask' + ': ' + JSON.stringify(ask));
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(ask.price, 2)}`);
        });

        console.log(`---------------------`);

        this.bestBids.forEach((bid) => {
            const size = bid.remaining_size ? bid.remaining_size : bid.size;
            //console.log('bid' + ': ' + JSON.stringify(bid));
            console.log(`${util.formatNumber(size, 5)} @ ${util.formatNumber(bid.price, 2)}`);
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
