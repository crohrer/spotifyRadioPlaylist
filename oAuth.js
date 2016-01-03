/**
 * Created by chris on 02.01.16.
 */

var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url') ;
var querystring = require('querystring');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var server = http.createServer(handleRequest);
var PORT = 8585;
var REDIRECT_URI = 'http://localhost:'+PORT;
var SCOPES = 'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';

function handleRequest(request, response){
    data = '';
    request.on('data', function (chunk) {
        data += chunk;
    });
    request.on('end', function () {
        var queryObject = url.parse(request.url, true).query;
        response.end(JSON.stringify(queryObject));

        if(queryObject.code){ // this is the authorization code
            getToken(queryObject.code);
            server.close();
        }
    });
}

/**
 * one of the params is required!
 * @param code authCode or undefined
 * @param refresh refreshToken or undefined
 */
function getToken(code, refresh){
    var jsonData;
    if(refresh){
        jsonData = {
            grant_type: "refresh_token",
            refresh_token: refresh
        };
    } else {
        jsonData = {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI
        };
    }
    var idAndSecret = config.clientId+':'+config.clientSecret;
    var authString = 'Basic ' + new Buffer(idAndSecret).toString('base64');
    var data = querystring.stringify(jsonData);
    var tokenReq = https.request({
        hostname: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Authorization': authString,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data)
        }
    }, function(res){
        var body = '';
        res.on('data', function(chunk){
            body += new Buffer(chunk).toString();
        });
        res.on('end', function(){
            var responseJson = JSON.parse(body);
            writeAccessToken(responseJson.access_token);
            writeRefreshToken(responseJson.refresh_token);
            require('./main').getTracks();
        });
    });

    tokenReq.end(data);
}

function writeAccessToken(token){
    writeFile('accessToken', token);
}

function writeRefreshToken(token){
    writeFile('refreshToken', token);
}

function writeFile(name, content){
    if(content){
        fs.writeFileSync(name, content);
        console.log(name + ' saved!');
    }
}

module.exports = {
    authenticate: function(){
        if(!config.localEnvironment){
            logger.log('oAuth must be carried out locally. Please copy accessToken and refreshToken onto your server afterwards.');
            return;
        }
        server.listen(PORT, function(){
            var query = querystring.stringify({
                client_id: config.clientId,
                response_type: 'code',
                scope: SCOPES,
                redirect_uri: REDIRECT_URI
            });
            console.log('Please log in first: https://accounts.spotify.com/authorize?'+query);
        });
    },
    refresh: function(){
        try {
            console.log('refreshing token...');
            var refreshToken = fs.readFileSync('refreshToken', 'utf8');
            getToken(undefined, refreshToken);
        } catch (e){
            console.log('no refreshToken found');
            oAuth.authenticate();
        }
    },
    getAccessToken: function(){
        try {
            var accessToken = fs.readFileSync('accessToken', 'utf8');
            return accessToken;
        } catch (e){
            console.log('no accessToken found');
            oAuth.refresh();
        }
        return false;
    }
};
