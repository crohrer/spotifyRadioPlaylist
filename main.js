/**
 * Created by chris on 02.01.16.
 */

var http = require('http');
var https = require('https');
var cheerio = require('cheerio');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// get tracks from radio trackservice
var trackserviceReq = http.request({
    hostname: 'fm4.orf.at',
    path: '/trackservicepopup/main'
}, function(res) {
    var html = '';
    if(res.statusCode !== 200){
        console.log('Trackservice Error: Status '+res.statusCode);
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
            var string = $title.text() +' - '+ $title.next('i').text();
            tracks.push(string);
        });
        searchSpotify(tracks);
    })
});

trackserviceReq.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});

trackserviceReq.end();

function searchSpotify(searchStrings){
    var resultsCounter = 0;
    var results = [];
    searchStrings.forEach(function(searchString){
        var spotifySearchReq = https.request({
            hostname: "api.spotify.com",
            path: "/v1/search?type=track&q=" + encodeURIComponent(searchString),
            protocol: 'https:'
        }, function(res){
            var jsonResponse = '';
            res.on('data', function(chunk){
                jsonResponse += chunk;
            });
            res.on('end', function(){
                var result = JSON.parse(jsonResponse);
                if (result.tracks.items.length) {
                    results.push(result.tracks.items[0].uri);
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
    console.log(results)
}
