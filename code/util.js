const utils = {
    logMessage: (message, optionalText) => {
        optionalText = optionalText ? optionalText : '';
        //console.log(`${optionalText} ${message.type}: ${JSON.stringify(message)}`);
    },
    shouldQueueMessage: (m) => {
        return m.type === 'open' || m.type === 'done' || m.type === 'change' || m.type === 'match'
    },
    sortAndTake5Best: (orders, isAsending) => {
        const sorted = orders.sort((a, b) => {
            if (isAsending) return Number(a.price) - Number(b.price);
            return Number(b.price) - Number(a.price);
        });

        sorted.splice(5);
        return sorted;
    },
    formatNumber: (n, decimalPlaces) => {
        return Number(n).toFixed(decimalPlaces);
    }
};

module.exports = utils;