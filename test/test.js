const { doesNotMatch } = require('assert');
const assert = require('assert');
const app = require('../code/app');
const { OrderBook } = require('../code/OrderBook');

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

describe('Add/Remove Book Orders', function() {
    describe('#Add Order Count', function () {
        it('order count increases when we add an order', function () {
            const book = new OrderBook();

            opens.forEach((m) => {
                book.queueMessage(m);
            });

            assert.strictEqual(book.messages.length, opens.length);
        });
    });
});

describe('Order Changes', function() {
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
});

describe('Inside Levels', function() {
    it('lowest ask is never <= to highest bid', function(done) {
        const testDuration = 10000;
        this.timeout(testDuration + 2000); // mocha times out tests after 2000ms by default
        app.startTest(testDuration, done);
    });
});

console.log('Running Tests');