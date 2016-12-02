var JSZip = require('./jszip');
var fs = require('fs');

require('http')
.createServer(function (request, response)
{
	response.setHeader('Access-Control-Allow-Origin', '*');
	if (request.method == 'POST' && request.url.match(/^\/\w+\/sharedstreams\/webstream$/i) !== null)
	{
		getReqBody(request, function(body) {
            if (body == '{"streamCtag":null}')
            {
            	var albumId = request.url.substr(1, request.url.indexOf('/sharedstreams')-1);
            	httpsPost({
					hostname: 'p28-sharedstreams.icloud.com',
					port: 443,
					path: '/' + albumId + '/sharedstreams/webstream',
					method: 'POST'
            	}, body, function (error, data) {
            		if (error !== null)
            		{
						response.writeHead(400, 'Bad request');
						response.end(error);
            		}
            		else
            		{
						response.setHeader('Content-Type', 'application/json');
						response.end(data);
            		}
            	});
            }
            else
            {
            	response.writeHead(400, 'Bad request');
            	response.end('Bad request');
            }
		});
	}
	else if (request.method == 'POST' && request.url.match(/^\/\w+\/sharedstreams\/webasseturls$/i) !== null)
	{
		getReqBody(request, function(body) {
			try {
				body = JSON.parse(body);
				var albumId = request.url.substr(1, request.url.indexOf('/sharedstreams')-1);
            	httpsPost({
					hostname: 'p28-sharedstreams.icloud.com',
					port: 443,
					path: '/' + albumId + '/sharedstreams/webasseturls',
					method: 'POST'
            	}, '{"photoGuids":' + JSON.stringify(body.photoGuids) + '}', function (error, data) {
            		if (error !== null)
            		{
						response.writeHead(400, 'Bad request');
						response.end(error);
            		}
            		else
            		{
            			fs.writeFileSync('tmp/' + albumId, data);
						response.setHeader('Content-Type', 'application/json');
						response.end(data);
            		}
            	});
			} catch (ex) {
				response.writeHead(400, 'Bad request');
				response.end('Bad request');
			}
		});
	}
	else if (request.method == 'POST' && request.url.match(/^\/\w+\/sharedstreams\/ziparchive$/i) !== null)
	{
		var albumId = request.url.substr(1, request.url.indexOf('/sharedstreams')-1);
		getReqBody(request, function(body) {
			try {
				body = decodeURIComponent(decodeURIComponent(body.substr(5)));
				body = JSON.parse(body);
				var albumName = (body.albumName).replace(/\W/g, '');
				var photos = body.photos;
				var zip = new JSZip();
				var i = 0;

				var getImages = function (error, filename, data) {
					if (error !== null)
					{
						response.writeHead(400, 'Bad request');
						response.end('Bad request');
					}
					zip.file(filename, data);
					if (i == photos.length-1)
					{
						response.setHeader('Content-Description', 'File Transfer');
						response.setHeader('Content-Type', 'application/octet-stream');
						response.setHeader('Content-Disposition', 'attachment; filename="' + albumName + '.zip"');
						response.setHeader('Content-Transfer-Encoding', 'binary');

						zip
						.generateNodeStream({type:'nodebuffer', streamFiles:true})
						.pipe(response);
					}
					else
					{
						i += 1;
						httpsGet(photos[i], getImages);
					}
				};
				httpsGet(photos[i], getImages);
			}
			catch (ex) {
				response.writeHead(400, 'Bad request');
				response.end('Bad request');
			}
		});
	}
	else
	{
		response.writeHead(400, 'Bad request');
		response.end('Page not found');
	}
})
.listen(28080, 'localhost');

function getReqBody(request, callback)
{
	var body = '';
	request.on('data', function (data) {
		body += data;
		if (body.length > 1e6)
		{
			request.connection.destroy();
		}
	});
	request.on('end', function () {
		callback(body);
	});
}

var https = require('https');
function httpsPost(options, data, callback)
{
	var req = https.request(options, function (res) {
		var body = '';
		res.on('data', function (data) {
			body += data;
		});
		res.on('end', function () {
			callback(null, body);
		})
	});
	req.write(data);
	req.end();
	req.on('error', function (error) {
		callback(error, null);
	});
}

function httpsGet(url, callback)
{
	if (url.match(/^https:\/\/cvws.icloud-content.com\/.*/i) === null)
	{
		callback('Wrong domain', null, null);
	}
	https.get(url, function (res) {
	  if (res.statusCode != 200)
	  {
	  	callback('Wrong statusCode', null, null);
	  	res.resume();
	  	return;
	  }
	  var len = parseInt(res.headers['content-length']);
	  var rawData = new Buffer(len);
	  var idx = 0;
	  res.setEncoding('binary');

	  res.on('data', function (chunk) {
	  	rawData.write(chunk, idx, "binary");
	  	idx += chunk.length;
	  });
	  res.on('end', () => {
	  	var filename = res.headers['content-disposition'].match(/"(\w+\.\w+)"/);
	  	callback(null, filename[1], rawData);
	  });
	}).on('error', function (error) {
	  callback(error, null, null);
	});
}