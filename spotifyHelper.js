/**
 * Created by chris on 06.01.16.
 */
"use strict";
var logger = require('./logger');
var Promise = require('bluebird');

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

/**
 * checks if api limit is reached and tries API call again as soon as possible
 * @param res
 * @param description
 * @param callback
 * @returns {Promise}
 */
function checkForRateLimit(res, description, callback){
    return new Promise(resolve => {
        if(res.statusCode === 429) {
            logger.log('limit exceeded for '+description+'. Trying again after '+res.headers['retry-after']+'.5s.');
            let timeout = new Promise(resolveTimeout => {
                setTimeout(() => resolveTimeout(), res.headers['retry-after'] * 1000 + 500);
            });

            resolve(timeout.then(callback))
        } else {
            resolve();
        }
    });
}

module.exports = {
    handleRateLimit: handleRateLimit,
    checkForRateLimit: checkForRateLimit
};
