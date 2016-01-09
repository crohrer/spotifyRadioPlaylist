/**
 * Created by chris on 02.01.16.
 */

var logger = require('./logger');
var spotifyPlaylist = require('./spotifyPlaylist');

// starting the procedure
start();

function start(){
    spotifyPlaylist.getLists(0);
}

module.exports = {
    start: start
};
