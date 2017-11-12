/**
 * Created by chris on 06.01.16.
 */
"use strict";
var http = require('http');
var https = require('https');
var Promise = require('bluebird');
var fs = require('fs');
var cheerio = require('cheerio');
var URL = require('url');
var logger = require('./logger');
var Horseman = require('node-horseman');
var horseman = new Horseman({ignoreSSLErrors: true});
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

String.prototype.trimEx = function() {return this.trim().replace(/^\s?-\s/, '').toUpperCase()}; // we compare our strings later in uppercase

/**
 * getTracks
 * @param {string} [playlistName]
 * @param {string} [trackserviceUrl]
 * @returns {Promise}
 */
function getTracks(playlistName, trackserviceUrl){
    let playlistConfig = config.playlists[playlistName];
    let url = trackserviceUrl || playlistConfig.radioTrackserviceUrl;
    if(playlistConfig.orfApi){
        return getOrfBroadcasts(url)
            .then(broadcasts => {
                console.log('getting tracks from API for '+broadcasts.length+' broadcasts');
                return broadcasts.map(broadcast => getOrfBroadcastTracks(broadcast));
            })
            .then(AllBroadcastsWithTracks => Promise.all(AllBroadcastsWithTracks))
            .then(broadcasts => {
                let tracks = [];
                broadcasts.forEach(broadcast => {
                    broadcast.forEach(track => tracks.push(track));
                });
                return tracks;
            });
    }

    return new Promise((resolve, reject) => {
        console.log('getting tracks from radio trackservice');
        horseman
            .open(url)
            .waitForSelector(playlistConfig.radioEntrySelector)
            .html()
            .then(searchInHtml)
            .then((tracks) => resolve(tracks))
            .catch(e => {
                logger.log('error requesting trackservice using horseman.', playlistName);
                if(e){
                    logger.log(e, playlistName)
                }
                try {
                    let httpx = (URL.parse(url).protocol === 'http:') ? http : https;
                    let trackserviceReq = httpx.request(url, function(res) {
                        let html = '';

                        if(res.statusCode === 302){
                            console.log('following redirect to ' + res.headers.location);
                            resolve(getTracks(playlistName, res.headers.location));
                            return;
                        }
                        if(res.statusCode !== 200){
                            let error = 'Trackservice Error: Status '+res.statusCode;
                            logger.log(error, playlistName);
                            reject(error);
                            process.exit(1);
                            return;
                        }

                        res.setEncoding('utf8');
                        res.on('data', function (chunk) {
                            html += chunk;
                        });
                        res.on('end', function() {
                            searchInHtml(html).then(resolve);
                        });
                    });

                    trackserviceReq.on('error', function(e) {
                        logger.log('problem with trackservice request: ' + e.message, playlistName);
                        reject();
                    });

                    trackserviceReq.end();
                }
                catch(error) {
                    logger.log('error requesting trackservice using http.', playlistName);
                    reject();
                }

            })
            .close();
    });

    function searchInHtml(html){
        return new Promise((resolve, reject) => {
            let $ = cheerio.load(html),
                searchInArtist = playlistConfig.removeFromArtistString || '',
                searchInTitle = playlistConfig.removeFromTitleString || '',
                tracks = [];

            $(playlistConfig.radioEntrySelector).each(function(i, elem){
                let $entry = $(this),
                    $title, // cheerio-object
                    $artist, // cheerio-object
                    title, // string
                    artist; // string

                if (playlistConfig.searchLinear) {
                    // Stations like the old page of ORF FM4 have strange markup and need linear search
                    $title = $entry.nextAll(playlistConfig.radioTitleSelector).first();
                    $artist = $entry.nextAll(playlistConfig.radioArtistSelector).first();
                } else {
                    // Most other station playlists feature nested markup
                    $title = $entry.find(playlistConfig.radioTitleSelector);
                    $artist = $entry.find(playlistConfig.radioArtistSelector);
                }

                title = $title.text().replace(searchInTitle, '');
                artist = $artist.text().replace(searchInArtist, '');

                tracks.push({
                    title: title,
                    artist: artist
                });
            });

            if(tracks.length === 0){
                logger.log('no tracks found on radio trackservice.', playlistName);
                return reject();
            }

            resolve(tracks);
        });
    }
}

function getOrfBroadcasts(broadcastsUrl){
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
                    let days = JSON.parse(rawData);
                    let allBroadcasts = [];
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

function getOrfBroadcastTracks(broadcast){
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
                    let data = JSON.parse(rawData);
                    let tracks = data.items
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
                let isUnique = true;
                let artist = track.artist.trimEx();
                let title = track.title.trimEx();

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
