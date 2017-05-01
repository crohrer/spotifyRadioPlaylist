/**
 * Created by chris on 06.01.16.
 */
"use strict";
var http = require('http');
var https = require('https');
var Promise = require('bluebird');
var fs = require('fs');
var cheerio = require('cheerio');
var logger = require('./logger');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

String.prototype.trimEx = function() {return this.trim().replace(/^\s?-\s/, '').toUpperCase()}; // we compare our strings later in uppercase
String.prototype.isEmpty = function() {return (!this || !this.length)};

/**
 * getTracks
 * @param {string} [trackserviceUrl]
 * @returns {Promise}
 */
function getTracks(trackserviceUrl){
    var url = trackserviceUrl || config.radioTrackserviceUrl;
    if(config.fm4Api){
        return getFm4Broadcasts(url)
            .then(broadcasts => broadcasts.map(broadcast => getFm4BroadcastTracks(broadcast)))
            .then(AllBroadcastsWithTracks => Promise.all(AllBroadcastsWithTracks))
            .then(broadcasts => {
                var tracks = [];
                broadcasts.forEach(broadcast => {
                    broadcast.forEach(track => tracks.push(track));
                });
                return tracks;
            });
    }

    return new Promise((resolve, reject) => {
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

                    title = $title.text();
                    artist = $artist.text();

                    tracks.push({
                        title: title,
                        artist: artist
                    });
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

function getFm4Broadcasts(broadcastsUrl){
    return new Promise((resolve, reject) => {
        https.get(broadcastsUrl, (res) => {
            if(res.statusCode !== 200){
                console.log(res.statusCode);
                reject();
            }

            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    var days = JSON.parse(rawData);
                    var allBroadcasts = [];
                    days.map(day => day.broadcasts).map(broadcasts => {
                        broadcasts.map(broadcast => allBroadcasts.push(broadcast))
                    });
                    resolve(allBroadcasts);
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', function(err) {
            console.error(err);
        });
    });
}

function getFm4BroadcastTracks(broadcast){
    return new Promise((resolve, reject) => {
        https.get(broadcast.href, (res) => {
            if(res.statusCode !== 200){
                console.log(res.statusCode);
                reject();
            }

            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    var data = JSON.parse(rawData);
                    var tracks = data.items
                        .map(broadcastItem => {
                            return {
                                title: broadcastItem.title,
                                artist: broadcastItem.interpreter
                            }
                        });
                    resolve(tracks);
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', function(err) {
            console.error(err);
        });
    });
}

/**
 * Deduplicates Tracks and removes empty entries
 * @param {Array} tracks
 * @return {Array}
 */
function cleanTracks(tracks){
    return new Promise((resolve) => {
        var cleanedTracks = [];

        tracks
            .filter(track => track.artist && track.title)
            .forEach((track) => {
                var isUnique = true;
                var artist = track.artist.trimEx();
                var title = track.title.trimEx();

                // check for duplicates
                cleanedTracks.forEach(function(cleanTrack){
                    if(cleanTrack.artist + '-' + cleanTrack.title === artist + '-' + title){
                        isUnique = false;
                    }
                });

                if(isUnique){
                    cleanedTracks.push({
                        artist: artist,
                        title: title
                    });
                }
            });

        resolve(cleanedTracks);
    });
}

module.exports = {
    getTracks: getTracks,
    cleanTracks: cleanTracks
};
