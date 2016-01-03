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
            $(config.radioTitleSelector).each(function(i, elem){
                var $title = $(this);
                var $artist;
                if(config.fm4){ // special handling for weird html structure on fm4 trackservice
                    $artist = $title.next(config.radioArtistSelector);
                } else {
                    $artist = $title.siblings(config.radioArtistSelector);
                }
                tracks.push({
                    title: $title.text(),
                    artist: $artist.text()
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
    var addRequest = https.request({
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
    addRequest.end();
}

function searchSpotify(tracks){
    var resultsCounter = 0;
    var results = [];
    tracks.forEach(function(track){
        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
        path: "/v1/search?type=track&q=" + encodeURIComponent(track.artist+' - '+track.title)
        }, function(res){
            var jsonResponse = '';
            res.on('data', function(chunk){
                jsonResponse += chunk;
            });
            res.on('end', function(){
                var result = JSON.parse(jsonResponse);
                result.tracks.items.some(function(item){ // iterate all items and break on success (return true)
                    var titleMatches = item.name == track.title;
                    var artistMatches = item.artists.some(function(artist){
                        return (track.artist.indexOf(artist.name) > -1);
                    });
                    if(!artistMatches || !titleMatches){
                        return false;
                    }
                    if(playlistTracks.indexOf(item.uri) === -1){ // avoid duplicates
                        results.push(encodeURIComponent(item.uri));
                    }
                    return true;
                });
                resultsCounter++;
                if(resultsCounter === tracks.length){
                    addToPlaylist(results);
                }
            });
        });
        spotifySearchReq.end();
    });
}

function addToPlaylist(results){
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
            process.exit();
            return;
        } else {
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

module.exports = {
    getTracks: getAllPlaylistTracks
};
