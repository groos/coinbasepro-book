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

module.exports = {
    opens: opens,
    changes: changes,
    dones: dones
}