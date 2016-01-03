var fs = require('fs');
var util = require('util');
var log_stdout = process.stdout;

module.exports = {
    log: function(message){
        log_stdout.write(util.format(message) + '\n');
        message = new Date().toString() + ': ' + message;
        fs.appendFileSync('./application.log', util.format(message) + '\n');
    }
};
