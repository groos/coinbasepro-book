const assert = require('assert');
const app = require('../code/app');
const { opens, changes, dones } = require('./testData');
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
        const testDuration = 10000;
        this.timeout(testDuration + 2000); // mocha times out tests after 2000ms by default
        app.startTest(testDuration, done);
    });
});

console.log('Running Tests');