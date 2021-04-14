const assert = require('assert');
const { OrderBook } = require('../code/OrderBook');

describe('Array', () => {
    describe('#indexOf()', () => {
        it('should return -1 when the value is not present', () => {
            assert.equal([1, 2, 3].indexOf(4), -1);
        });
    });
});

const opens = [
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '1000.00',
        order_id: 'babcdef',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '500.00',
        order_id: 'babcdefg',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '999.00',
        order_id: 'babcdefgh',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '2000.00',
        order_id: 'babcdefghi',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'sell',
        product_id: 'BTC-USD',
        price: '3000.00',
        order_id: 'sabcd',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'sell',
        product_id: 'BTC-USD',
        price: '2000.00',
        order_id: 'sabcde',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'sell',
        product_id: 'BTC-USD',
        price: '1000.00',
        order_id: 'sabcdef',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'sell',
        product_id: 'BTC-USD',
        price: '500.00',
        order_id: 'sabcdefg',
        size: "0.75"
    },
    {
        type: 'open',
        side: 'sell',
        product_id: 'BTC-USD',
        price: '2000.00',
        order_id: 'sabcdefgh',
        size: "0.75"
    }
];

const changes = [
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '1000.00',
        order_id: 'babcdef',
        new_size: '0.50'
    }
]

const dones = [
    {
        type: 'done',
        side: 'sell',
        product_id: 'BTC-USD',
        sequence: 309764200,
        order_id: '6725d097-07c4-4ab9-bc5d-243ef8059f41',
        reason: 'filled',
        price: '64192.1',
        size: '0'
    }
];

describe('Add/Remove Book Orders', () => {
    describe('#Add Order Count', () => {
        it('order count increases when we add an order', () => {
            const book = new OrderBook();

            opens.forEach((m) => {
                book.queueMessage(m);
            });

            assert.strictEqual(book.messages.length, opens.length);
        })
    });
});

describe('Order Changes', () => {
    const book = new OrderBook();

    opens.forEach((m) => {
        book.messageHandlers.open(m);
    });

    const firstOrderId = Object.keys(book.orders)[0];
    const firstOrder = book.orders[firstOrderId];

    changes.forEach((c) => {
        book.messageHandlers.change(c);
    });

    it('first order size should have changed to 0.5', () => {
        assert.strictEqual(firstOrder.size, '0.50');
    });

    it('bid order should be updated also', () => {
        const o = book.bestBids.filter((b) => b.order_id === firstOrderId);
        assert.strictEqual(o[0].size, '0.50');
    })
});

describe('Order Matches', () => {
    const book = new OrderBook();
});

describe('Inside Levels', () => {
    const book = new OrderBook();

    // TODO
    /*
        - fire this up legit
        - let it run for 10 seconds 
        - do the ask/bid comparison
    */

    opens.forEach((m) => {
        book.messageHandlers.open(m);
    });

    // TODO - add bids and asks, and confirm the lowest ask is never less than or equal the highest bid
    book.printTickInfo();

    let lowAsk = Number.MAX_SAFE_INTEGER;
    book.bestAsks.forEach((a) => {
        if (a.price < lowAsk) lowAsk = a.price;
    });

    let highBid = 0;
    book.bestBids.forEach((b) => {
        if (b.price > highBid) highBid = b.price;
    });

    it('lowest ask is never <= to highest bid', () => {
        console.log(`low ask: ${lowAsk}, high bid: ${highBid}`);
        if (lowAsk <= highBid) {
            assert.fail('ask was higher than bid');
        }
    });
})


console.log('Running Tests');