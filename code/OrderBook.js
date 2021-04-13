const fetch = require('node-fetch');

class OrderBook {
    constructor() {
        console.log('in order book constructor');
        this.bookInitialized = false;
        this.messages = {};
    }
    
    getCBSnapshot() {
         // use REST api to get current book snapshot
         // GET /products/BTC-USD/book


         fetch('https://api-public.sandbox.pro.coinbase.com/products/BTC-USD/book?level=3')
         .then(res => res.json())
         .then((json) => {
             // Response looks like:
             /*
                { 
                    bids: [
                        [ '62883.81', '4771', '2b6e645c-29c8-4333-81b0-042932296317' ],
                        [ '62883.8', '6020', '1c75604c-274d-4474-9560-1c844393d84e' ],
                        [ '62883.79', '6989', '467a8da8-15cd-4836-bece-1cbd9983d89a' ]
                ], 
                asks: [
                        [ '62883.85', '4771', '8fc58e9d-d3ed-49da-b686-77cca3bb04cd' ],
                        [ '62883.86', '6020', '0f721713-e12b-43bb-a4b1-5e44a0135055' ],
                        [ '62883.87', '6989', 'e4116e21-74b8-4381-986b-d699425e8441' ]
                ] 
            }
             */
             console.log(json);
         });

         // this will need to be async
        //return new Promise();
    }

    processMessages() {

    }

    queueMessage(message) {
        if (!this.bookInitialized) {
            // use REST api to get current book snapshot
            getCBSnapshot();
            //processMessages();
        };

        // open - add it to this book

        // done - remove it from this book

        // match - a trade or partial trade occurred 
            // - remove it from the book, or update the size remaining if it's partial
            // this is a Tick (Market Event) - when this happens, we want to print the current best bid/ask in the book

        // change - an existing order needs to be changed

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