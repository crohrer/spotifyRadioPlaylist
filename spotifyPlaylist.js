/**
 * Created by chris on 06.01.16.
 */

var https = require('https');
var fs = require('fs');
var radioCrawler = require('./radioCrawler');
var spotifyHelper = require('./spotifyHelper');
var spotifyOAuth = require('./spotifyOAuth');
var logger = require('./logger');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var spotifyPlaylist = {
    getLists: getLists,
    lists: [], // holds all list objects
    relatedLists: [], // holds list objects for the same radio station (including currentList)
    addTracks: addTracks,
    getTracks: getTracks,
    tracks: [] // tracks that are on the current playlist(s)
};
var PLAYLIST_TRACK_LIMIT = 100;

/**
 * getTracks
 * @param {int} offset - 0 for first page
 */
function getTracks(offset){
    var LIMIT = 100;
    console.log('getting next '+LIMIT+' tracks from playlist...');
    var accessToken = spotifyOAuth.getAccessToken(),
        playlistRequest;

    if(accessToken === false || accessToken === ''){
        return;
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
            if (spotifyHelper.handleRateLimit(res, function(){
                    spotifyPlaylist.getTracks(offset);
                })){ return; }

            if(res.statusCode === 401){
                spotifyOAuth.refresh();
            } else {
                logger.log("Error getting tracks from playlist. Status "+res.statusCode);
                process.exit(1);
            }

            return;
        }

        res.on('data', function(chunk){
            data += chunk;
        });
        res.on('end', function(){
            data = JSON.parse(data);
            data.items.forEach(function(item){
                spotifyPlaylist.tracks.push(item.track.uri);
            });

            if(data.next === null){
                radioCrawler.getTracks(config.radioTrackserviceUrl);
            } else {
                spotifyPlaylist.getTracks(offset + LIMIT);
            }
        });
    });

    playlistRequest.end();
}



/**
 * addTracks
 * @param results
 * @param [lastCall] use this if this is the last call to this function, so the program can be stopped afterwards.
 */
function addTracks(results, lastCall){
    var accessToken = spotifyOAuth.getAccessToken(),
        uris,
        addRequest;

    if(accessToken === false){
        return;
    }
    if(results.length === 0){
        logger.log('no new tracks to add');
        process.exit();
        return;
    }

    uris = results.join();

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
            if(lastCall){
                process.exit();
            }
            return;
        } else {
            if (spotifyHelper.handleRateLimit(res, 'adding to playlist', function(){
                    spotifyPlaylist.addTracks(results, lastCall);
                })){ return; }

            if(res.statusCode === 401){
                spotifyOAuth.refresh();
            } else {
                logger.log("Error adding to playlist. Status "+res.statusCode);
                process.exit(1);
                return;
            }
        }

    });

    addRequest.end();
}

/**
 * get all my playlists
 * @param {int} [offset=0]
 */
function getLists(offset){
    offset = offset || 0;
    var LIMIT = 50; // can be between 1 - 50, default 20
    console.log('getting next '+LIMIT+' playlists...');
    var accessToken = spotifyOAuth.getAccessToken();
    var playlistRequest;

    if(accessToken === false || accessToken === ''){
        return;
    }

    playlistRequest = https.request({
        hostname: 'api.spotify.com',
        path: '/v1/me/playlists?limit='+LIMIT+'&offset='+offset,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+ accessToken,
            'Accept': 'application/json'
        }
    }, function(res){
        var data = '';

        if(res.statusCode !== 200) {
            if (spotifyHelper.handleRateLimit(res, function(){
                    spotifyPlaylist.getLists(offset);
                })){ return; }

            if(res.statusCode === 401){
                spotifyOAuth.refresh();
            } else {
                logger.log("Error getting playlists. Status "+res.statusCode);
                process.exit(1);
            }

            return;
        }

        res.on('data', function(chunk){
            data += chunk;
        });
        res.on('end', function(){
            data = JSON.parse(data);
            data.items.forEach(function(item){
                spotifyPlaylist.lists.push(item);
            });

            if(data.next === null){
                getCurrentPlaylist();
                getRelatedLists();
                determineCorrectPlaylist();
                checkCurrentListSize();
            } else {
                spotifyPlaylist.getLists(offset + LIMIT);
            }
        });
    });

    playlistRequest.end();
}

/**
 *
 * @param {string} [id=config.playlistId] playlistId
 */
function getCurrentPlaylist(id){
    id = id || config.playlistId;

    spotifyPlaylist.lists.forEach(function(playlist){
        if(playlist.id === id){
            spotifyPlaylist.currentPlaylist = playlist;
        }
    });
    if(!spotifyPlaylist.currentPlaylist){
        logger.log("Error: playlist with this id does not exist: "+id);
        process.exit(1);
    }
}

function getRelatedLists(){
    spotifyPlaylist.relatedLists.push(spotifyPlaylist.currentPlaylist);
    spotifyPlaylist.lists.forEach(function(list){
        if(cleanName(list.name) === cleanName(spotifyPlaylist.currentPlaylist.name)){
            spotifyPlaylist.relatedLists.push(list);
        }
    });
}

/**
 * Removes suffix from playlist name
 * @param {string} name
 * @returns {string}
 */
function cleanName(name){
    return name.replace(/\s\(archived\s?\d*\)/, '');
}


function determineCorrectPlaylist(){
    var savedPlaylistId,
        savedListIsRelated = false;

    try {
        savedPlaylistId = fs.readFileSync('playlistId', 'utf8');
        spotifyPlaylist.relatedLists.forEach(function(list){
            if(list.id === savedPlaylistId){
                savedListIsRelated = true;
            }
        });
        if(!savedListIsRelated){
            throw 'Saved playlistId is not related to playlistId from config';
        }
    } catch (e){
        logger.log(e.message);

    }

    console.log(spotifyPlaylist.currentPlaylist);
}

function checkCurrentListSize(){
    if(spotifyPlaylist.currentPlaylist.tracks.total >= PLAYLIST_TRACK_LIMIT){

    }
}

function updateList(id, name){

}

function createList(name){

}

getLists();

module.exports = spotifyPlaylist;
