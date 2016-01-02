/**
 * Created by chris on 02.01.16.
 */

var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url') ;
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var server = http.createServer(handleRequest);
var PORT = 8585;
var REDIRECT_URI = 'http://localhost:'+PORT;

function handleRequest(request, response){
    data = '';
    request.on('data', function (chunk) {
        data += chunk;
    });
    request.on('end', function () {
        var queryObject = url.parse(request.url, true).query;

        if(queryObject.code){ // this is the authorization code
            getToken(queryObject.code);
            server.close();
        }
        response.end(JSON.stringify(queryObject));
    });
}

function getToken(code){
    var idAndSecret = config.clientId+':'+config.clientSecret;
    var authString = 'Basic ' + new Buffer(idAndSecret).toString('base64');
    var tokenReq = https.request({
        hostname: 'api.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Authorization': authString
        }
    }, function(res){
        console.log(res.statusCode, JSON.stringify(res.headers));
    });

    tokenReq.end(JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI
    }));
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
            console.log('Please log in first: https://accounts.spotify.com/authorize?client_id='+config.clientId+'&response_type=code&redirect_uri='+REDIRECT_URI);
        });
    }
}
