/**
 * Created by chris on 06.01.16.
 */

var https = require('https');
var logger = require('./logger');
var spotifyHelper = require('./spotifyHelper');
var spotifyOAuth = require('./spotifyOAuth');
var Promise = require('bluebird');

/**
 * searchTracks
 * @param {Array} tracks
 * @param {String} playlistName
 * @returns {Promise}
 */
function searchTracks(tracks, playlistName){
    var searchRequests = [];

    console.log('Searching spotify for '+tracks.length+' tracks');
    tracks.forEach(function(track, i){
        searchRequests.push(sendSearchRequest(track, i * 150, playlistName)); // timeout so we don't run into limits that fast
    });
    return Promise.all(searchRequests)
        .then(results => {
            if(process.stdout.isTTY){
                process.stdout.write('\n');
            }
            return results.filter(result => typeof result === 'string');
        });
}

/**
 * sendSearchRequest
 * @param {object} track
 * @param {string} track.artist in UPPERCASE
 * @param {string} track.title in UPPERCASE,
 * @param {int} [timeOut] waits for this time (ms) so we don't run into limits that fast
 * @param {string} playlistName
 * @returns {Promise}
 */
function sendSearchRequest(track, timeOut, playlistName){
    var time = timeOut || 0;
    return new Promise((resolve, reject) => {
        setTimeout(() => makeRequest(resolve, reject), time);
    });

    /**
     * @param {function} resolve Callback to resolve promise
     * @param {function} reject
     */
    function makeRequest(resolve, reject){
        let accessToken = spotifyOAuth.getAccessToken();

        if(accessToken === false || accessToken === ''){
            return reject('no access token found');
        }

        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
            path: "/v1/search?type=track&q=artist:"+encodeURIComponent(track.artist+' ')+'track:'+encodeURIComponent(track.title),
            method: 'GET',
            headers: {
                'Authorization': 'Bearer '+ accessToken,
                'Accept': 'application/json'
            }
        }, function(res){
            spotifyHelper.checkForRateLimit(res, 'searching track', () => sendSearchRequest(track, 0, playlistName))
                .then((rateLimitPromise) => {
                    if(rateLimitPromise){
                        return rateLimitPromise;
                    }
                    var jsonResponse = '';
                    res.on('data', function(chunk){
                        jsonResponse += chunk;
                    });
                    res.on('end', function(){
                        var spotifyPlaylist = require('./spotifyPlaylist'),
                            result = JSON.parse(jsonResponse);

                        if(result.error && result.error.status === 429){
                            return resolve(); // rateLimit is exceeded - this is already handled above by spotifyHelper
                        }

                        if(result.error){
                            let message = result.error.message || 'Unknown error while searching';
                            if(process.stdout.isTTY){
                                process.stdout.write('\n');
                            }
                            logger.log('Error searching for "'+ track.artist + ' - ' + track.title + '": ' + message, playlistName);
                            return resolve();
                        }

                        if(!result.tracks || !result.tracks.items) {
                            return resolve();
                        }

                        if(process.stdout.isTTY){
                            process.stdout.write('.');
                        }

                        result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                            var titleMatches = cleanString(item.name.toUpperCase()) === cleanString(track.title),
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
                            return true;
                        });

                        resolve();
                    });
                });
        });

        spotifySearchReq.end();
    }
}

function cleanString(string){
    return string.replace(/[\-\(\)\.]/g, '').replace('  ', ' ');
}

module.exports = {
    searchTracks: searchTracks
};
