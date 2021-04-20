const assert = require('assert');
const { opens, changes } = require('./testData');
const { OrderBook } = require('../code/OrderBook');

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

    it('First order size should have changed to 0.5', () => {
        assert.strictEqual(firstOrder.size, '0.50');
    });
});

describe('Inside Levels', function() {
    it('Book does not become crossed if high crossing bid is added', function() {
        const book = new OrderBook(true);

        opens.forEach((m) => {
            book.queueMessage(m);
        });

        const highPriceId = 'babcdefgzz';
        book.queueMessage({
            type: 'open',
            side: 'buy',
            product_id: 'BTC-USD',
            price: '999999.00',
            order_id: highPriceId,
            size: "0.75"
        });

        book.processMessagesLoop();
        assert.strictEqual(book.bestOrders.filter(o => o.order_id === highPriceId).length === 0, true);
    });

    it('Book does not become crossed if low crossing ask is added', function() {
        const book = new OrderBook(true);

        opens.forEach((m) => {
            book.queueMessage(m);
        });

        const lowPriceId = 'babcdefgzz';
        book.queueMessage({
            type: 'open',
            side: 'buy',
            product_id: 'BTC-USD',
            price: '000.00',
            order_id: lowPriceId,
            size: "0.75"
        });

        book.processMessagesLoop();
        assert.strictEqual(book.bestOrders.filter(o => o.order_id === lowPriceId).length === 0, true);
    });
});

console.log('Running Tests');