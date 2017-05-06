"use strict";
var fs = require('fs');
var util = require('util');
var log_stdout = process.stdout;

module.exports = {
    /**
     * writes to log file
     * @param {String} message
     * @param {String} [prefix]
     */
    log: function(message, prefix){
        let prefixedMessage = (prefix) ? prefix+': '+message : message;
        log_stdout.write(util.format(prefixedMessage) + '\n');
        let datedMessage = new Date().toString() + ': ' + prefixedMessage;
        fs.appendFileSync('./application.log', util.format(datedMessage) + '\n');
    }
};
