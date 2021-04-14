const utils = {
    logMessage: (message, optionalText) => {
        optionalText = optionalText ? optionalText : '';
        console.log(`${optionalText} ${message.type}: ${JSON.stringify(message)}`);
    },
    shouldQueueMessage: (m) => {
        return m.type === 'open' || m.type === 'done' || m.type === 'change' || m.type === 'match'
    }
};

module.exports = utils;