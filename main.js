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

function getRadioTracks(){
    console.log('getting tracks from radio trackservice');
    var trackserviceReq = http.request({
        hostname: 'fm4.orf.at',
        path: '/trackservicepopup/main'
    }, function(res) {
        var html = '';
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
            $('b').each(function(i, elem){
                var $title = $(this);
                var $artist = $title.next('i');
                var string = $title.text() +' - '+ $artist.text();
                tracks.push(string);
            });
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
                getRadioTracks();
            } else {
                getPlaylistTracks(offset + LIMIT);
            }
        });
    });
    addRequest.end();
}

function searchSpotify(searchStrings){
    var resultsCounter = 0;
    var results = [];
    searchStrings.forEach(function(searchString){
        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
            path: "/v1/search?type=track&q=" + encodeURIComponent(searchString)
        }, function(res){
            var jsonResponse = '';
            res.on('data', function(chunk){
                jsonResponse += chunk;
            });
            res.on('end', function(){
                var result = JSON.parse(jsonResponse);
                if (result.tracks.items.length) {
                    var uri = result.tracks.items[0].uri;
                    if(playlistTracks.indexOf(uri) === -1){ // avoid duplicates
                        results.push(encodeURIComponent(uri));
                    }
                }
                resultsCounter++;
                if(resultsCounter === searchStrings.length){
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
