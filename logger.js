var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream('./application.log', {flags : 'a'});
var log_stdout = process.stdout;

module.exports = {
    log: function(message){
        log_stdout.write(util.format(message) + '\n');
        message = new Date().toString() + ': ' + message;
        log_file.write(util.format(message) + '\n');
    }
};
