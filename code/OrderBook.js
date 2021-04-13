const fetch = require('node-fetch');

class OrderBook {
    constructor() {
        console.log('in order book constructor');
        this.bookInitialized = false;
        this.orders = {};
    }
    
    getCBSnapshot() {
         // use REST api to get current book snapshot
         // GET /products/BTC-USD/book


         fetch('https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3')
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
                console.log('adding bid');
                const orderId = bid[2];
                this.orders[orderId] = {
                    type: 'open',
                    side: 'buy',
                    order_id: orderId,
                    price: bid[0],
                    size: bid[1]
                };
            });

            json.asks.forEach((bid) => {
                const orderId = bid[2];
                this.orders[orderId] = {
                    type: 'open',
                    side: 'sell',
                    order_id: orderId,
                    price: bid[0],
                    size: bid[1]
                };
            });

            console.log(`bids: ${json.bids.length}`);
            console.log(`asks: ${json.asks.length}`);
            console.log(`total orders: ${Object.keys(this.orders).length}`);
         });

         // this will need to be async
        //return new Promise();
    }

    messageHandlers = {
        open: (message) => {
            this.orders[message.order_id] = message;
            console.log('adding message');
        },
        done: (message) => {
            delete this.orders[message.order_id];
            console.log('deleting message');
        },
        change: (message) => {
            // change - an existing order needs to be changed
        },
        match: (message) => {
             // match - a trade or partial trade occurred 
                // - remove it from the book, or update the size remaining if it's partial
                // this is a Tick (Market Event) - when this happens, we want to print the current best bid/ask in the book
        }
    }

    processMessages() {

    }

    queueMessage(message) {
        const handler = this.messageHandlers[message.type];
        if (handler) {
            handler(message);
        }

        console.log(Object.keys(this.orders).length);
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
