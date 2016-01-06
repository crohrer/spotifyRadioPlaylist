/**
 * Created by chris on 06.01.16.
 */

var https = require('https');
var logger = require('./logger');
var spotifyHelper = require('./spotifyHelper');
var PLAYLIST_ADD_LIMIT = 40; // limit how many tracks will be added in one request

/**
 * searchTracks
 * @param {Array} tracks
 */
function searchTracks(tracks){
    var responseCounter = 0,
        results = [];

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
            if (spotifyHelper.handleRateLimit(res, 'searching track', function(){
                    sendSearchRequest(track);
                })) { return; }

            var jsonResponse = '';
            res.on('data', function(chunk){
                jsonResponse += chunk;
            });
            res.on('end', function(){
                var spotifyPlaylist = require('./spotifyPlaylist'),
                    result = JSON.parse(jsonResponse),
                    isLastSearchRequest;

                if(result.tracks && result.tracks.items){
                    result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                        var titleMatches = item.name.toUpperCase() == track.title,
                            artistMatches = item.artists.some(function(artist){
                                return (track.artist.indexOf(artist.name.toUpperCase()) > -1);
                            });

                        if(!artistMatches || !titleMatches){
                            return false;
                        }

                        if(spotifyPlaylist.tracks.indexOf(item.uri) === -1){ // avoid duplicates
                            results.push(encodeURIComponent(item.uri));
                        }
                        return true; // stops iterating results, when we believe this is the song we were looking for
                    });
                }

                responseCounter++;
                isLastSearchRequest = (responseCounter === tracks.length);

                if(isLastSearchRequest || results.length === PLAYLIST_ADD_LIMIT){
                    spotifyPlaylist.addTracks(results, isLastSearchRequest);
                    results = [];
                }
            });
        });

        spotifySearchReq.end();
    }
}

module.exports = {
    searchTracks: searchTracks
};
