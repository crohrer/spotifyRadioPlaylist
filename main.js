/**
 * Created by chris on 02.01.16.
 */

var http = require('http');
var https = require('https');
var cheerio = require('cheerio');
var oAuth = require('./oAuth');
var logger = require('./logger');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var playlistTracks = [];

getAllPlaylistTracks();

/**
 * getRadioTracks
 * @param {string} trackserviceUrl
 */
function getRadioTracks(trackserviceUrl){
    console.log('getting tracks from radio trackservice');
    var trackserviceReq = http.request(trackserviceUrl, function(res) {
        var html = '';
        if(res.statusCode === 302){
            console.log('following redirect to ' + res.headers.location);
            getRadioTracks(res.headers.location);
            return;
        }
        if(res.statusCode !== 200){
            logger.log('Trackservice Error: Status '+res.statusCode);
            process.exit(1);
            return;
        }
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            html += chunk;
        });
        res.on('end', function() {
            var $ = cheerio.load(html);
            var tracks = [];
            $(config.radioEntrySelector).each(function(i, elem){
                var $entry = $(this),
                    $title, // cheerio-object
                    $artist, // cheerio-object
                    title, // string
                    artist; // string

                if (!config.searchLinear) {
                    // Most other station playlists feature nested markup
                    $title = $entry.find(config.radioTitleSelector);
                    $artist = $entry.find(config.radioArtistSelector);
                } else {
                    // Stations like ORF FM4 have strange markup and need linear search
                    $title = $entry.nextAll(config.radioTitleSelector).first();
                    $artist = $entry.nextAll(config.radioArtistSelector).first();
                }

                String.prototype.trimEx = function() { return this.trim().replace(/^\s?-\s/, '').toUpperCase(); } // we compare our strings later in uppercase
                title = $title.text().trimEx();
                artist = $artist.text().trimEx();

                String.prototype.isEmpty = function() { return (!this || !this.length); }
                if (title.isEmpty() || artist.isEmpty()){
                    return;
                }

                tracks.push({
                    title: title,
                    artist: artist
                });
            });
            if(tracks.length === 0){
                logger.log('no tracks found on radio trackservice.');
            }
            searchSpotify(tracks);
        });
    });

    trackserviceReq.on('error', function(e) {
        logger.log('problem with trackservice request: ' + e.message);
        process.exit(1);
    });

    trackserviceReq.end();
}

function getAllPlaylistTracks(){
    getPlaylistTracks(0);
}

/**
 * getPlaylistTracks
 * @param {int} offset - 0 for first page
 */
function getPlaylistTracks(offset){
    var LIMIT = 100;
    console.log('getting next '+LIMIT+' tracks from playlist...');
    var accessToken = oAuth.getAccessToken();
    if(accessToken === false){
        return;
    }
    if(accessToken === ''){
        console.log('empty accessToken');
        return;
    }
    var playlistRequest = https.request({
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
            if (handleRateLimit(res, function(){
                    getPlaylistTracks(offset);
                })){ return; }
            if(res.statusCode === 401){
                oAuth.refresh();
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
                playlistTracks.push(item.track.uri);
            });
            if(data.next === null){
                getRadioTracks(config.radioTrackserviceUrl);
            } else {
                getPlaylistTracks(offset + LIMIT);
            }
        });
    });
    playlistRequest.end();
}

/**
 * searchSpotify
 * @param {Array} tracks
 */
function searchSpotify(tracks){
    var PLAYLIST_ADD_LIMIT = 40; // limit how many tracks will be added in one request
    var responseCounter = 0;
    var results = [];
    tracks.forEach(function(track, i){
        setTimeout(function(){
            sendSearchRequest(track);
        }, i * 100); // timeout so we don't run into limits that fast
    });

    /**
     * sendSearchRequest
     * @param {object} track
     * @param {string} track.artist in UPPERCASE
     * @param {string} track.title in UPPERCASE
     */
    function sendSearchRequest(track){
        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
            path: "/v1/search?type=track&q=" + encodeURIComponent(track.artist+' - '+track.title)
        }, function(res){
            if (handleRateLimit(res, 'searching track', function(){
                    sendSearchRequest(track);
                })) { return; }
            var jsonResponse = '';
            res.on('data', function(chunk){
                jsonResponse += chunk;
            });
            res.on('end', function(){
                var result = JSON.parse(jsonResponse);
                if(result.tracks && result.tracks.items){
                    result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                        var titleMatches = item.name.toUpperCase() == track.title;
                        var artistMatches = item.artists.some(function(artist){
                            return (track.artist.indexOf(artist.name.toUpperCase()) > -1);
                        });
                        if(!artistMatches || !titleMatches){
                            return false;
                        }
                        if(playlistTracks.indexOf(item.uri) === -1){ // avoid duplicates
                            results.push(encodeURIComponent(item.uri));
                        }
                        return true;
                    });
                }
                responseCounter++;
                var isLastSearchRequest = (responseCounter === tracks.length)
                if(isLastSearchRequest || results.length === PLAYLIST_ADD_LIMIT){
                    addToPlaylist(results, isLastSearchRequest);
                    results = [];
                }
            });
        });
        spotifySearchReq.end();
    }
}

/**
 * addToPlaylist
 * @param results
 * @param [lastCall] use this if this is the last call to this function, so the program can be stopped afterwards.
 */
function addToPlaylist(results, lastCall){
    var accessToken = oAuth.getAccessToken();
    if(accessToken === false){
        return;
    }
    if(results.length === 0){
        logger.log('no new tracks to add');
        process.exit();
        return;
    }
    var uris = results.join();
    var addRequest = https.request({
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
            if (handleRateLimit(res, 'adding to playlist', function(){
                    addToPlaylist(results, lastCall);
                })){ return; }
            if(res.statusCode === 401){
                oAuth.refresh();
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
 * handleRateLimit
 * @param {object} res ResponseObject
 * @param {string} description Text that describes when RateLimit was exceeded - mainly for logging
 * @param {function} callback this will be called after waiting. Use this to retry what you did when Limit was exceeded
 * @returns {boolean} true when limit was exceeded, otherwise false
 */
function handleRateLimit(res, description, callback){
    if(res.statusCode === 429) {
        logger.log('limit exceeded for '+description+'. Trying again after '+res.headers['retry-after']+'.5s.');
        setTimeout(callback, res.headers['retry-after'] * 1000 + 500);
        return true;
    } else {
        return false;
    }
}

module.exports = {
    getTracks: getAllPlaylistTracks
};
