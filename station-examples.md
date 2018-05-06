# Radio station examples

Here you can find some examples for configurations for various radio stations.

All URLs and selectors valid as of 2017-05-05.

## BBC Radio

Works for *radio1*, *1xtra*, *radio2*, *6music* and *radioscotland* (adjust the URL if you want one of these stations).

    "radioTrackserviceUrl": "http://www.bbc.co.uk/radio1/playlist",
    "radioEntrySelector": "div.pll-playlist-item-details",
    "radioTitleSelector": "div.pll-playlist-item-title",
    "radioArtistSelector": "div.pll-playlist-item-artist > a"

## ORF FM4

    "radioTrackserviceUrl": "https://audioapi.orf.at/fm4/api/json/current/broadcasts",
    "fm4Api": true

## ORF Ö1

    "radioTrackserviceUrl": "https://audioapi.orf.at/oe1/api/json/current/broadcasts",
    "fm4Api": true

## RadioX

    "radioTrackserviceUrl": "http://www.radiox.co.uk/playlist/",
    "radioEntrySelector": ".song__text-content",
    "radioTitleSelector": ".track",
    "radioArtistSelector": ".artist"

## Radio Nova

    "radioTrackserviceUrl": "http://nova.fr/radionova/radio-nova",
    "radioEntrySelector": ".square-item>a>.title",
    "radioTitleSelector": ".description",
    "radioArtistSelector": ".name"

## NDR2

    "radioTrackserviceUrl": "http://www.ndr.de/ndr2/programm/titelliste1202.html",
    "radioEntrySelector": "div#playlist>ul>li.program>div.details>h3",
    "radioTitleSelector": "span.title",
    "radioArtistSelector": "span.artist"

## FluxFM

    "radioTrackserviceUrl": "http://www.fluxfm.de/fluxfm-playlist/",
    "radioEntrySelector": "#songs td.title",
    "radioTitleSelector": ".song",
    "radioArtistSelector": ".artist"
    
## SWR1

    "radioTrackserviceUrl": "http://www.swr.de/swr1/bw/musikrecherche/",
    "radioEntrySelector": ".musicItemText",
    "radioTitleSelector": "h3",
    "radioArtistSelector": "p"

## Radio Swiss Jazz

    "radioTrackserviceUrl": "http://www.radioswissjazz.ch/de/musikprogramm",
    "radioEntrySelector": ".playlist>.item-row",
    "radioTitleSelector": ".titletag",
    "radioArtistSelector": ".artist"

## Radio ROX (Norway)

    "radioTrackserviceUrl": "http://marci327.marci.io/",
    "radioEntrySelector": "div.clearfix",
    "radioTitleSelector": ".title",
    "radioArtistSelector": ".artist"

## detektor.fm

    "radioTrackserviceUrl": "https://detektor.fm/playlisten/songs-musikstream",
    "radioEntrySelector": "#loadPlaylist > .c5",
    "radioTitleSelector": ".medium-2",
    "radioArtistSelector": ".normal:last-child"

## KCRW

    "radioTrackserviceUrl": "https://www.kcrw.com/playlists",
    "radioEntrySelector": ".song",
    "radioTitleSelector": ".name",
    "radioArtistSelector": ".artist"

## Power 106

    "radioTrackserviceUrl": "http://www.power106.com/playlist/",
    "radioEntrySelector": ".entry-content tr:nth-child(n+2)",
    "radioTitleSelector": ".entry-content tr:nth-child(n+2) td:nth-child(3)",
    "radioArtistSelector": ".entry-content tr:nth-child(n+2) td:nth-child(2)"
