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
    let results = [];
    console.log('Searching spotify for '+tracks.length+' tracks');

    /**
     * @return {Promise.<Array>}
     */
    function searchNextTrack(){
        if(tracks.length === 0){
            if(process.stdout.isTTY){
                process.stdout.write('\n');
            }
            return Promise.resolve(results);
        }

        let track = tracks.shift();
        return sendSearchRequest(track, playlistName)
            .then(result => {
                if(typeof result === 'string'){
                    results.push(result);
                }
            })
            .then(() => searchNextTrack());
    }

    return searchNextTrack();
}

/**
 * sendSearchRequest
 * @param {object} track
 * @param {string} track.artist in UPPERCASE
 * @param {string} track.title in UPPERCASE
 * @param {string} playlistName
 * @returns {Promise}
 */
function sendSearchRequest(track, playlistName){
    let tryCounter = 0; // count requests for one track to prevent infinite loop (in case of error the request might be tried again)
    return makeRequest();

    /**
     * @return {Promise}
     */
    function makeRequest(){
        return new Promise((resolve, reject) => {
            if(tryCounter > 3){
                logger.log('Error: SearchRequest for "'+ track.artist + ' - ' + track.title + '" was tried more than 3 times.', playlistName);
                return resolve();
            }
            tryCounter += 1;
            let accessToken = spotifyOAuth.getAccessToken();

            if(accessToken === false || accessToken === ''){
                return reject('no access token found');
            }

            let spotifySearchReq = https.request({
                hostname: "api.spotify.com",
                path: "/v1/search?type=track&q=artist:"+encodeURIComponent(track.artist+' ')+'track:'+encodeURIComponent(track.title),
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer '+ accessToken,
                    'Accept': 'application/json'
                }
            }, function(res){
                spotifyHelper.checkForRateLimit(res, 'searching track', () => sendSearchRequest(track, playlistName))
                    .then((rateLimitPromise) => {
                        if(rateLimitPromise){
                            return rateLimitPromise;
                        }
                        let jsonResponse = '';
                        res.on('data', function(chunk){
                            jsonResponse += chunk;
                        });
                        res.on('end', function(){
                            let spotifyPlaylist = require('./spotifyPlaylist'),
                                result = JSON.parse(jsonResponse);

                            if(result.error){
                                switch (result.error.status) {
                                    case 429:
                                        // rateLimit is exceeded - this is already handled above by spotifyHelper
                                        return resolve();
                                        break;
                                    case 401:
                                        // accessToken might be expired
                                        return spotifyOAuth.refresh()
                                            .then(() => makeRequest())
                                            .then(() => resolve());
                                        break;
                                    default:
                                        let message = result.error.message || 'Unknown error while searching';
                                        if(process.stdout.isTTY){
                                            process.stdout.write('\n');
                                        }
                                        logger.log('Error searching for "'+ track.artist + ' - ' + track.title + '": ' + message, playlistName);
                                        return resolve();
                                }
                            }

                            if(!result.tracks || !result.tracks.items) {
                                return resolve();
                            }

                            if(process.stdout.isTTY){
                                process.stdout.write('.'); // writes one dot per search Request for visualization
                            }

                            result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                                let titleMatches = cleanString(item.name.toUpperCase()) === cleanString(track.title),
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
        });
    }
}

function cleanString(string){
    return string.replace(/[\-\(\)\.]/g, '').replace('  ', ' ');
}

module.exports = {
    searchTracks: searchTracks
};
