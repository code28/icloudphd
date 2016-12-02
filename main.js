var baseUrl = 'https://icphd.code28.de/';
$(function() {
	$('.hidden').hide().removeClass('hidden');
	if (window.location.hash.length > 1)
	{
		loadAlbum(window.location.hash.substr(1));
	}
	else
	{
		$('#divLoader').hide();
		$('#divInput').show();
	}
});


$('#btnLoad').click(function () {
	var albumId = $('#inputUrl').val();
	if (albumId.match(/^https?:\/\/(www\.)?icloud\.com\/sharedalbum\/(\w*-?\w*\/)?#/i) === null)
	{
		printError('URL doesn\'t match required schema.');
	}
	else
	{
		$('#divError').fadeOut();
		$('#divLoader').fadeIn();
		$('#divInput').fadeOut();
		albumId = albumId.substr(albumId.indexOf('#')+1);
		window.location.hash = '#' + albumId;
		loadAlbum(albumId);
	}
});


function loadAlbum(albumId)
{
var albumName = '';
var photos = {};
$.ajax({
	url: baseUrl + albumId + '/sharedstreams/webstream',
	method: 'POST',
	data: '{"streamCtag":null}'
})
.then(function (data) {
	albumName = data.streamName;
	var photoGuids = [];
	$('#divResultTitle').html('<h1>' + albumName + '<br><small>by ' + data.userFirstName + ' ' + data.userLastName + '</small></h1>');
	$('#divNumPic').html(data.photos.length + ' photos');
	$('#divResultHeader').delay(300).fadeIn();

	$.each(data.photos, function (i, photo) {
		photoGuids.push(photo.photoGuid);
		var size = 0;
		var checksum = '';
		$.each(photo.derivatives, function (j, derivative) {
			if (derivative.fileSize > size)
			{
				checksum = derivative.checksum;
			}
		});
		photos[checksum] = {};
		photos[checksum].guid = photo.photoGuid;
	});

	return $.ajax({
		url: baseUrl + albumId + '/sharedstreams/webasseturls',
		method: 'POST',
		data: '{"photoGuids": ' + JSON.stringify(photoGuids) + '}'
	});
})
.then(function (data) {
	var result = '';
	var photosArray = [];
	$.each(photos, function (id) {
		photos[id].url = 'https://' + data.items[id].url_location + data.items[id].url_path;
		photosArray.push(photos[id].url);
		result += '<a href="https://www.icloud.com/sharedalbum/#' + albumId + ';' + photos[id].guid + '"><img src="' + photos[id].url + '" class="img"></a>';
		//result += '<a class="imgdownload" href="' + photos[id].url + '" download><img src="' + photos[id].url + '" class="img"></a>';
	});
	$('#divResult').html(result);
	$('#divLoader').fadeOut();
	$('#divResultBody').fadeIn();

	$('#btnDownload').click(function () {
		$(this).html('loading...').attr('disabled', 'true');
		var newForm = $('<form>', {
			'action': baseUrl + window.location.hash.substr(1) + '/sharedstreams/ziparchive',
			'method': 'POST'
		}).append($('<input>', {
			'name': 'data',
			'value': encodeURIComponent('{"albumName": "' + albumName + '", "photos": ' + JSON.stringify(photosArray) + '}'),
			'type': 'hidden'
		}));
		newForm.submit();
	}).removeAttr('disabled');
})
.fail(function(err) {
	if (err.status == 404)
	{
		printError('Album ID not found.');
	}
	else
	{
		printError('An error occured: ' + err.statusText + '. Please report an issue at Github.');
	}
});
}


function printError(errMsg)
{
	if (errMsg == undefined)
	{
		errMsg = 'An error occured. Please report an issue at Github.';
	}
	$('#divLoader').hide();
	$('#divError').children('span').html(errMsg);
	$('#divError').fadeIn();
	$('#divInput').delay(10).fadeIn();
}