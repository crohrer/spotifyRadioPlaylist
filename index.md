# spotifyRadioPlaylist

Putting the latest tracks from a radio station with online trackservice (like [this one](http://www.novaplanet.com/radionova/cetaitquoicetitre/)) onto a spotify playlist by crawling the radio website.

More on the background of this project in my [blog post](http://blog.chrisrohrer.de/radio-to-spotify-playlist/).

## Demo

Currently running hourly via cronjob on [this playlist](https://play.spotify.com/user/radiolistenerbot/playlist/2G76EIk09AuL58sHI9my9V)
<iframe src="https://embed.spotify.com/?uri=spotify%3Auser%3Aradiolistenerbot%3Aplaylist%3A2G76EIk09AuL58sHI9my9V" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>

Actually you find a growing list of playlists from multiple radio stations being crawled by the spotify account RadiolistenerBot 
<iframe src="https://open.spotify.com/follow/1/?uri=spotify:user:radiolistenerbot&size=detail&theme=light" width="300" height="56" scrolling="no" frameborder="0" style="border:none; overflow:hidden;" allowtransparency="true"></iframe>
All those playlists are public. My bot happily accepts new followers on his profile and on his playlists!

## Usage

Before running it on the server you need to authenticate via oAuth (as the user who owns the specified playlist) locally.

1. Clone this repo into a local directory
2. Copy `config.example.json` to `config.json` and insert your own credentials & playlistIds for your desired radio stations.
You can obtain a clientId & clientSecret by [registering a new application](https://developer.spotify.com/my-applications/#!/applications).  
There are some pre-defined and tested radio stations, they can be found in `station-examples.md`. You can define your own schemes, all you need is the URL of the playlist page of the station and three jQuery selectors: one for the playlist entry element, one for the title and one for the artist. Some radio stations (like the old FM4 page) have special markup that requires linear instead of nested search; this behaviour can be set with the `searchLinear` flag.
3. Run `npm install`
4. Run `npm start <stationIdentifier>` (stationIdentifier is the name of the playlist config inside your config file.) 
5. Open the displayed URL in your browser & grant permission for your app to change your playlists. This will open a page on localhost which you can close. Now you find two new files: `accessToken` and `refreshToken`. They contain the secret information to authenticate the user with spotify, so handle with care!

This should have added the first tracks to your playlist already. Every time you run `npm start <stationIdentifier>` again, the script will check if there are new tracks that have not been added to the playlist yet.

You may want to run this on a server via cronjob every X minutes or so (depending on how many results your trackservice delivers in one page).

1. Clone this repo on your server into a _non-public_ directory
2. Copy your local `accessToken` and `refreshToken` onto the server
3. Copy your local `config.json` onto the server and change the last entry to `"localEnvironment": false`
4. Run `npm install`
5. Configure your cronjob to run `node main.js <stationIdentifier>` every X minutes (don't forget to change to the correct directory first! - this can be done with a bash script)

## Updates

To update run `git pull` in your installation and you will get the latest changes. 

Please note: Upgrading a Patch release (like from 2.2.0 to 2.2.1) will work with your existing config-file, upgrading a Major or Minor release might make it neccessary to upgrade your configuration. Please read the release notes and refer to the `config.example.json` file.

## Contributing

If you successfully use this script for a radio station that is not listed yet in `station-examples.md`, please open a pull request to add that config to the examples or open a new issue and I will add it. It might help others. (Don't forget to remove your clientId & clientSecret!)

If you try this script on a new radio station and something doesn't work, open an issue with a description of the problem & your radio station config (Don't forget to remove your clientId & clientSecret!). Maybe we can get it to work.

Feel free to fork the project. If you want to implement a new feature, open a new issue so we can figure out how this fits into the existing structure. I'm looking forward to pull requests :)
