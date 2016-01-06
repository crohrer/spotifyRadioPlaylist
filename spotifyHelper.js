/**
 * Created by chris on 06.01.16.
 */

var logger = require('./logger');

/**
 * handleRateLimit
 * @param {object} res ResponseObject
 * @param {string} description Text that describes when RateLimit was exceeded - mainly for logging
 * @param {function} callback this will be called after waiting. Use this to retry what you did when Limit was exceeded
 * @returns {boolean} true when limit was exceeded, otherwise false
 */
function handleRateLimit(res, description, callback){
    if(res.statusCode === 429) {
        logger.log('limit exceeded for '+description+'. Trying again after '+res.headers['retry-after']+'.5s.');
        setTimeout(callback, res.headers['retry-after'] * 1000 + 500);
        return true;
    } else {
        return false;
    }
}

module.exports = {
    handleRateLimit: handleRateLimit
};
