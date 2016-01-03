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

function getToken(code){
    var idAndSecret = config.clientId+':'+config.clientSecret;
    var authString = 'Basic ' + new Buffer(idAndSecret).toString('base64');
    var data = querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI
    });
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
        })
        console.log(res.statusCode, JSON.stringify(res.headers));
    });

    tokenReq.end(data);
}

function writeAccessToken(token){
    fs.writeFile('accessToken', token, function (err) {
        if (err) throw err;
        console.log('accessToken saved!');
    });
}

function writeRefreshToken(token){
    fs.writeFile('refreshToken', token, function (err) {
        if (err) throw err;
        console.log('refreshToken saved!');
    });
}

module.exports = {
    authenticate: function(){
        server.listen(PORT, function(){
            var query = querystring.stringify({
                client_id: config.clientId,
                response_type: 'code',
                scope: SCOPES,
                redirect_uri: REDIRECT_URI
            });
            console.log('Please log in first: https://accounts.spotify.com/authorize?'+query);
        });
    }
};
