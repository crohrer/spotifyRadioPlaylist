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
        hostname: 'api.spotify.com',
        path: '/api/token?'+data,
        method: 'POST',
        headers: {
            'Authorization': authString
        }
    }, function(res){
        res.on('data', function(chunk){
            console.log(new Buffer(chunk).toString());
        });
        console.log(res.statusCode, JSON.stringify(res.headers));
    });

    tokenReq.end();
}

function writeSecret(secret){
    fs.writeFile('userSecret', secret, function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
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
