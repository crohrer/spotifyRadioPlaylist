/**
 * Created by chris on 06.01.16.
 */

var http = require('http');
var Promise = require('bluebird');
var fs = require('fs');
var cheerio = require('cheerio');
var logger = require('./logger');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

/**
 * getTracks
 * @param {string} [trackserviceUrl]
 * @returns {Promise}
 */
function getTracks(trackserviceUrl){
    return new Promise((resolve, reject) => {
        var url = trackserviceUrl || config.radioTrackserviceUrl;
        console.log('getting tracks from radio trackservice');
        var trackserviceReq = http.request(url, function(res) {
            var html = '';

            if(res.statusCode === 302){
                console.log('following redirect to ' + res.headers.location);
                resolve(getTracks(res.headers.location));
                return;
            }
            if(res.statusCode !== 200){
                var error = 'Trackservice Error: Status '+res.statusCode;
                logger.log(error);
                reject(error);
                process.exit(1);
                return;
            }

            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                html += chunk;
            });
            res.on('end', function() {
                var $ = cheerio.load(html),
                    tracks = [];

                $(config.radioEntrySelector).each(function(i, elem){
                    var $entry = $(this),
                        isUnique = true,
                        $title, // cheerio-object
                        $artist, // cheerio-object
                        title, // string
                        artist; // string

                    if (config.searchLinear) {
                        // Stations like ORF FM4 have strange markup and need linear search
                        $title = $entry.nextAll(config.radioTitleSelector).first();
                        $artist = $entry.nextAll(config.radioArtistSelector).first();
                    } else {
                        // Most other station playlists feature nested markup
                        $title = $entry.find(config.radioTitleSelector);
                        $artist = $entry.find(config.radioArtistSelector);
                    }

                    String.prototype.trimEx = function() { return this.trim().replace(/^\s?-\s/, '').toUpperCase(); } // we compare our strings later in uppercase
                    title = $title.text().trimEx();
                    artist = $artist.text().trimEx();

                    String.prototype.isEmpty = function() { return (!this || !this.length); }
                    if (title.isEmpty() || artist.isEmpty()){
                        return;
                    }

                    // check for duplicates
                    tracks.forEach(function(track){
                        if(track.artist + '-' + track.title === artist + '-' + title){
                            isUnique = false;
                        }
                    });

                    if(isUnique){
                        tracks.push({
                            title: title,
                            artist: artist
                        });
                    }
                });

                if(tracks.length === 0){
                    logger.log('no tracks found on radio trackservice.');
                    return;
                    process.exit(1);
                }

                resolve(tracks);
            });
        });

        trackserviceReq.on('error', function(e) {
            logger.log('problem with trackservice request: ' + e.message);
            process.exit(1);
        });

        trackserviceReq.end();
    });
}

module.exports = {
    getTracks: getTracks
};
