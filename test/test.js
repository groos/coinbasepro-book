const assert = require('assert');
const app = require('../code/app');
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
    it('Lowest ask is never <= to highest bid', function(done) {
        const testDuration = 5000;
        this.timeout(testDuration + 2000); // mocha times out tests after 2000ms by default
        app.startTimedTest(testDuration, done);
    });

    it('Error if lowest ask is <= highest bid', function() {
        const book = new OrderBook(true);

        opens.forEach((m) => {
            book.queueMessage(m);
        });

        book.queueMessage({
            type: 'open',
            side: 'buy',
            product_id: 'BTC-USD',
            price: '999999.00',
            order_id: 'babcdefgzz',
            size: "0.75"
        });

        book.processMessagesLoop();
        assert.strictEqual(book.bookCrossed, true);
    });

    it('Error if lowest ask is <= highest bid', function() {
        const book = new OrderBook(true);

        opens.forEach((m) => {
            book.queueMessage(m);
        });

        book.queueMessage({
            type: 'open',
            side: 'buy',
            product_id: 'BTC-USD',
            price: '000.00',
            order_id: 'babcdefgzz',
            size: "0.75"
        });

        book.processMessagesLoop();
        assert.strictEqual(book.bookCrossed, true);
    });
});

console.log('Running Tests');