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
        order_id: 'abcde',
        size: "0.75"
    }
];

const changes = [
    {
        type: 'open',
        side: 'buy',
        product_id: 'BTC-USD',
        price: '1000.00',
        order_id: 'abcde',
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

    // TODO - add bids and asks, and confirm the lowest ask is never less than or equal the highest bid

    it('lowest ask is never <= to highest bid', () => {

    });
})


console.log('Running Tests');