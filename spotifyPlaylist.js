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

function getAllTracks(playlistName){
    console.log('getting tracks from playlist '+playlistName);
    return getTracks(playlistName, 0);
}

/**
 * getTracks
 * @param {String} playlistName like in config
 * @param {int} offset - 0 for first page
 * @returns {Promise}
 */
function getTracks(playlistName, offset){
    return new Promise((resolve, reject) => {
        let playlistId = config.playlists[playlistName].playlistId;
        let LIMIT = 100;
        let accessToken = spotifyOAuth.getAccessToken(),
            playlistRequest;

        if(accessToken === false || accessToken === ''){
            return reject('no access token found');
        }

        playlistRequest = https.request({
            hostname: 'api.spotify.com',
            path: '/v1/users/'+config.userId+'/playlists/'+playlistId+'/tracks?fields=next,items.track.uri&limit='+LIMIT+'&offset='+offset,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer '+ accessToken,
                'Accept': 'application/json'
            }
        }, function(res){
            let data = '';

            if(res.statusCode !== 200) {
                spotifyHelper.checkForRateLimit(res, 'requesting playlist tracks', () => spotifyPlaylist.getTracks(playlistName, offset))
                    .then(() => {
                        if(res.statusCode === 401){
                            spotifyOAuth.refresh();
                        } else {
                            var error = "Error getting tracks from playlist. Status "+res.statusCode;
                            logger.log(error, playlistName);
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
                    resolve(spotifyPlaylist.getTracks(playlistName, offset + LIMIT));
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
 * @param {String} playlistName
 * @param {Array} results
 */
function addTracks(playlistName, results){
    let playlistConfig = config.playlists[playlistName];
    let accessToken = spotifyOAuth.getAccessToken(),
        LIMIT = 40; // limit how many tracks will be added in one request

    if(accessToken === false){
        return;
    }
    if(results.length === 0){
        logger.log('no new tracks to add', playlistName);
        process.exit();
        return;
    }

    var requests = results
        // we can only add max 40 tracks at once. So we split all results in chunks of 40 tracks
        .map((item, i) => (i % LIMIT === 0) ? results.slice(i, i + LIMIT) : null)
        .filter(item => item && item.length)
        .map((items, i) => makeAddRequest(items, i * 100));

    return Promise.all(requests);

    function makeAddRequest(items, timeout){
        return new Promise(resolve => {
            setTimeout(() => {
                var addRequest = https.request({
                    hostname: 'api.spotify.com',
                    path: '/v1/users/'+config.userId+'/playlists/'+playlistConfig.playlistId+'/tracks?position=0&uris='+items.join(), // join all 40 track ids for the query string
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer '+ accessToken,
                        'Accept': 'application/json'
                    }
                }, function(res){
                    if(res.statusCode === 201){
                        logger.log('Success! Added '+ items.length + ' tracks.', playlistName);
                        resolve();
                        return;
                    } else {
                        spotifyHelper.checkForRateLimit(res, 'adding to playlist', () => resolve(spotifyPlaylist.addTracks(playlistName, results)))
                            .then(() => {
                                if(res.statusCode === 401){
                                    spotifyOAuth.refresh();
                                } else {
                                    logger.log("Error adding to playlist. Status "+res.statusCode, playlistName);
                                    process.exit(1);
                                }
                            });
                    }
                });
                addRequest.end();
            }, timeout);
        });
    }
}

module.exports = spotifyPlaylist;
