/**
 * Created by chris on 02.01.16.
 */
"use strict";
var logger = require('./logger');
var spotifyPlaylist = require('./spotifyPlaylist');
var radioCrawler = require('./radioCrawler');
var spotifySearch = require('./spotifySearch');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// starting the procedure
start();

function start(){
    let playlistName = process.argv[2];
    if(!playlistName || !config.playlists[playlistName]){
        logger.log('Error: playlist not found');
        process.exit();
    }
    spotifyPlaylist.getAllTracks(playlistName)
        .then(() => radioCrawler.getTracks(playlistName))
        .then(radioTracks => radioCrawler.cleanTracks(radioTracks))
        .then(cleanedTracks => spotifySearch.searchTracks(cleanedTracks))
        .then(newTracks => spotifyPlaylist.addTracks(playlistName, newTracks))
        .then(process.exit)
        .catch(() => {
            logger.log('exited due to error.', playlistName);
            process.exit();
        });
}

module.exports = {
    start: start
};
