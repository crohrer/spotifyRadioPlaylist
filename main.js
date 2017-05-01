/**
 * Created by chris on 02.01.16.
 */
"use strict";
var logger = require('./logger');
var spotifyPlaylist = require('./spotifyPlaylist');
var radioCrawler = require('./radioCrawler');
var spotifySearch = require('./spotifySearch');

// starting the procedure
start();

function start(){
    spotifyPlaylist.getAllTracks()
        .then(radioCrawler.getTracks)
        .then(radioTracks => radioCrawler.cleanTracks(radioTracks))
        .then(cleanedTracks => spotifySearch.searchTracks(cleanedTracks))
        .then(newTracks => spotifyPlaylist.addTracks(newTracks))
        .then(process.exit);
}

module.exports = {
    start: start
};
