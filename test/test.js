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
        remaining_size: "0.75"
    }
];

const dones = [
    {
        type: 'done',
        side: 'sell',
        product_id: 'BTC-USD',
        sequence: 309764200,
        order_id: '6725d097-07c4-4ab9-bc5d-243ef8059f41',
        reason: 'filled',
        price: '64192.1',
        remaining_size: '0'
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
});

describe('Order Matches', () => {
    const book = new OrderBook();
});

describe('Inside Levels', () => {
    const book = new OrderBook();
})


console.log('Running Tests');