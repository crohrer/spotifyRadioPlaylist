/**
 * Created by chris on 06.01.16.
 */
"use strict";
var Promise = require('bluebird');
var https = require('https');
var fs = require('fs');
var spotifyHelper = require('./spotifyHelper');
var spotifyOAuth = require('./spotifyOAuth');
var logger = require('./logger');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var spotifyPlaylist = {
    addTracks: addTracks,
    getTracks: getTracks,
    getAllTracks: getAllTracks,
    tracks: []
};

function getAllTracks(){
    return getTracks(0);
}

/**
 * getTracks
 * @param {int} offset - 0 for first page
 * @returns {Promise}
 */
function getTracks(offset){
    return new Promise((resolve, reject) => {
        var LIMIT = 100;
        console.log('getting next '+LIMIT+' tracks from playlist...');
        var accessToken = spotifyOAuth.getAccessToken(),
            playlistRequest;

        if(accessToken === false || accessToken === ''){
            return reject('no access token found');
        }

        playlistRequest = https.request({
            hostname: 'api.spotify.com',
            path: '/v1/users/'+config.userId+'/playlists/'+config.playlistId+'/tracks?fields=next,items.track.uri&limit='+LIMIT+'&offset='+offset,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer '+ accessToken,
                'Accept': 'application/json'
            }
        }, function(res){
            var data = '';

            if(res.statusCode !== 200) {
                spotifyHelper.checkForRateLimit(res, 'requesting playlist tracks', () => spotifyPlaylist.getTracks(offset))
                    .then(() => {
                        if(res.statusCode === 401){
                            spotifyOAuth.refresh();
                        } else {
                            var error = "Error getting tracks from playlist. Status "+res.statusCode;
                            logger.log(error);
                            reject(error);
                            process.exit(1);
                        }
                    });
                return;
            }

            res.on('data', function(chunk){
                data += chunk;
            });
            res.on('end', function(){
                var jsonData = JSON.parse(data);
                jsonData.items.forEach(function(item){
                    spotifyPlaylist.tracks.push(item.track.uri);
                });

                if(jsonData.next === null){
                    resolve();
                } else if(typeof jsonData.next === 'string'){
                    resolve(spotifyPlaylist.getTracks(offset + LIMIT));
                } else {
                    reject('error getting data from playlist request');
                }
            });
        });

        playlistRequest.end();
    });
}



/**
 * addTracks
 * @param results
 * @param [lastCall] use this if this is the last call to this function, so the program can be stopped afterwards.
 */
function addTracks(results){
    var accessToken = spotifyOAuth.getAccessToken(),
        addRequest,
        LIMIT = 40; // limit how many tracks will be added in one request

    if(accessToken === false){
        return;
    }
    if(results.length === 0){
        logger.log('no new tracks to add');
        process.exit();
        return;
    }

    var requests = results
        // we can only add max 40 tracks at once. So we split all results in chunks of 40 tracks
        .map((item, i) => (i % LIMIT === 0) ? results.slice(i, i + LIMIT) : null)
        .filter(item => item)
        // join all 40 track ids for the query string
        .map(group => group.join())
        .map(uris => makeAddRequest(uris));

    return Promise.all(requests);

    function makeAddRequest(uris){
        return new Promise(resolve => {
            addRequest = https.request({
                hostname: 'api.spotify.com',
                path: '/v1/users/'+config.userId+'/playlists/'+config.playlistId+'/tracks?position=0&uris='+uris,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer '+ accessToken,
                    'Accept': 'application/json'
                }
            }, function(res){
                if(res.statusCode === 201){
                    logger.log('Success! Added '+ results.length + ' tracks.');
                    resolve();
                    return;
                } else {
                    spotifyHelper.checkForRateLimit(res, 'adding to playlist', () => resolve(spotifyPlaylist.addTracks(results)))
                        .then(() => {
                            if(res.statusCode === 401){
                                spotifyOAuth.refresh();
                            } else {
                                logger.log("Error adding to playlist. Status "+res.statusCode);
                                process.exit(1);
                            }
                        });
                }
            });

            addRequest.end();
        });
    }
}

module.exports = spotifyPlaylist;
