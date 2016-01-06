# Radio station examples

Here you can find some examples for configurations for various radio stations.

All URLs and selectors valid as of 2016-01-03.

## BBC Radio

Works for *radio1*, *1xtra*, *radio2*, *6music* and *radioscotland* (adjust the URL if you want one of these stations).

    "radioTrackserviceUrl": "http://www.bbc.co.uk/radio1/playlist",
    "radioEntrySelector": "div.pll-playlist-item-details",
    "radioTitleSelector": "div.pll-playlist-item-title",
    "radioArtistSelector": "div.pll-playlist-item-artist > a",
    "searchLinear": false,

## ORF FM4

This radio station needs the linear search.

    "radioTrackserviceUrl": "http://fm4.orf.at/trackservicepopup/main",
    "radioEntrySelector": "td[width=300]>font>br",
    "radioTitleSelector": "b",
    "radioArtistSelector": "i",
    "searchLinear": true,

## Radio Nova

    "radioTrackserviceUrl": "http://www.novaplanet.com/radionova/cetaitquoicetitre/",
    "radioEntrySelector": "div.cestquoicetitre_results>div.resultat>div.info-col",
    "radioTitleSelector": "h3.titre",
    "radioArtistSelector": "h2.artiste",
    "searchLinear": false,

## NDR2

    "radioTrackserviceUrl": "http://www.ndr.de/ndr2/programm/titelliste1202.html",
    "radioEntrySelector": "div#playlist>ul>li.program>div.details>h3",
    "radioTitleSelector": "span.title",
    "radioArtistSelector": "span.artist",
    "searchLinear": false,

## FluxFM

    "radioTrackserviceUrl": "http://www.fluxfm.de/fluxfm-playlist/",
    "radioEntrySelector": "table#songs>tr>td.title>div",
    "radioTitleSelector": "span.song",
    "radioArtistSelector": "span.artist",
    "searchLinear": false,

## Die Neue 107.7

    "radioTrackserviceUrl": "http://dieneue1077.de/playlisten.html",
    "radioEntrySelector": "#block-playlisten-playlisten>.content>table tr",
    "radioTitleSelector": "td:nth-child(4)",
    "radioArtistSelector": "td:nth-child(3)",
    "searchLinear": false,
    
## SWR1

    "radioTrackserviceUrl": "http://www.swr.de/swr1/bw/musikrecherche/",
    "radioEntrySelector": ".musicItemText",
    "radioTitleSelector": "h3",
    "radioArtistSelector": "p",
    "searchLinear": false,

## Radio Swiss Jazz

    "radioTrackserviceUrl": "http://www.radioswissjazz.ch/de/musikprogramm",
    "radioEntrySelector": ".playlist>.item-row",
    "radioTitleSelector": ".titletag",
    "radioArtistSelector": ".artist",
    "searchLinear": false,
