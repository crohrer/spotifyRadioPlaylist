/**
 * Created by chris on 06.01.16.
 */

var https = require('https');
var logger = require('./logger');
var spotifyHelper = require('./spotifyHelper');
var Promise = require('bluebird');

/**
 * searchTracks
 * @param {Array} tracks
 * @returns {Promise}
 */
function searchTracks(tracks){
    var searchRequests = [];

    tracks.forEach(function(track, i){
        searchRequests.push(sendSearchRequest(track, i * 100)); // timeout so we don't run into limits that fast
    });
    return Promise.all(searchRequests).then(results => results.filter(result => typeof result === 'string'));
}

/**
 * sendSearchRequest
 * @param {object} track
 * @param {string} track.artist in UPPERCASE
 * @param {string} track.title in UPPERCASE,
 * @param {int} [timeOut] waits for this time (ms) so we don't run into limits that fast
 * @returns {Promise}
 */
function sendSearchRequest(track, timeOut){
    var time = timeOut || 0;
    return new Promise((resolve) => {
        setTimeout(() => makeRequest(resolve), time);
    });

    /**
     * @param {function} resolve Callback to resolve promise
     */
    function makeRequest(resolve){
        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
            path: "/v1/search?type=track&q=" + encodeURIComponent(track.artist+' - '+track.title)
        }, function(res){
            spotifyHelper.checkForRateLimit(res, 'searching track', () => sendSearchRequest(track))
                .then(() => {
                    var jsonResponse = '';
                    res.on('data', function(chunk){
                        jsonResponse += chunk;
                    });
                    res.on('end', function(){
                        var spotifyPlaylist = require('./spotifyPlaylist'),
                            result = JSON.parse(jsonResponse);

                        if(!result.tracks || !result.tracks.items) {
                            return resolve();
                        }

                        result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                            var titleMatches = item.name.toUpperCase() == track.title,
                                isAlreadyInPlaylist = spotifyPlaylist.tracks.indexOf(item.uri) > -1,
                                artistMatches = item.artists.some(function(artist){
                                    return (track.artist.indexOf(artist.name.toUpperCase()) > -1);
                                });

                            if(!artistMatches || !titleMatches){
                                return false;
                            }

                            if(isAlreadyInPlaylist){ // avoid duplicates
                                resolve();
                                return true; // stops iterating results
                            }

                            resolve(encodeURIComponent(item.uri));
                        });

                        resolve();
                    });
                });
        });

        spotifySearchReq.end();
    }
}

module.exports = {
    searchTracks: searchTracks
};
