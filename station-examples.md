# Radio station examples

Here you can find some examples for configurations for various radio stations.

All URLs and selectors valid as of 2017-05-05.

## BBC Radio

Works for *radio1*, *1xtra*, *radio2*, *6music* and *radioscotland* (adjust the URL if you want one of these stations).

    "radioTrackserviceUrl": "http://www.bbc.co.uk/radio1/playlist",
    "radioEntrySelector": "div.pll-playlist-item-details",
    "radioTitleSelector": "div.pll-playlist-item-title",
    "radioArtistSelector": "div.pll-playlist-item-artist > a",
    "searchLinear": false,
    "fm4Api": false,

## ORF FM4

    "radioTrackserviceUrl": "https://audioapi.orf.at/fm4/api/json/current/broadcasts",
    "radioEntrySelector": "",
    "radioTitleSelector": "",
    "radioArtistSelector": "",
    "searchLinear": true,
    "fm4Api": true,

## ORF Ö1

    "radioTrackserviceUrl": "https://audioapi.orf.at/oe1/api/json/current/broadcasts",
    "radioEntrySelector": "",
    "radioTitleSelector": "",
    "radioArtistSelector": "",
    "searchLinear": true,
    "fm4Api": true,

## RadioX

    "radioTrackserviceUrl": "http://www.radiox.co.uk/playlist/",
    "radioEntrySelector": "div.playlist_entry_info",
    "radioTitleSelector": ".track",
    "radioArtistSelector": ".artist",
    "searchLinear": false,
    "fm4Api": false,

## Radio Nova

    "radioTrackserviceUrl": "http://www.novaplanet.com/radionova/cetaitquoicetitre/",
    "radioEntrySelector": "div.cestquoicetitre_results>div.resultat>div.info-col",
    "radioTitleSelector": "h3.titre",
    "radioArtistSelector": "h2.artiste",
    "searchLinear": false,
    "fm4Api": false,

## NDR2

    "radioTrackserviceUrl": "http://www.ndr.de/ndr2/programm/titelliste1202.html",
    "radioEntrySelector": "div#playlist>ul>li.program>div.details>h3",
    "radioTitleSelector": "span.title",
    "radioArtistSelector": "span.artist",
    "searchLinear": false,
    "fm4Api": false,

## FluxFM

    "radioTrackserviceUrl": "http://www.fluxfm.de/fluxfm-playlist/",
    "radioEntrySelector": "table#songs>tr>td.title>div",
    "radioTitleSelector": "span.song",
    "radioArtistSelector": "span.artist",
    "searchLinear": false,
    "fm4Api": false,
    
## SWR1

    "radioTrackserviceUrl": "http://www.swr.de/swr1/bw/musikrecherche/",
    "radioEntrySelector": ".musicItemText",
    "radioTitleSelector": "h3",
    "radioArtistSelector": "p",
    "searchLinear": false,
    "fm4Api": false,

## Radio Swiss Jazz

    "radioTrackserviceUrl": "http://www.radioswissjazz.ch/de/musikprogramm",
    "radioEntrySelector": ".playlist>.item-row",
    "radioTitleSelector": ".titletag",
    "radioArtistSelector": ".artist",
    "searchLinear": false,
    "fm4Api": false,
