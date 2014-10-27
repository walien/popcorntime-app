(function (App) {
	'use strict';

	var http = require('http');
	var fs = require('fs');
	var path = require('path');
	var url = require('url');
	var portfinder = require('portfinder');
	var mime = require('mime');

	var StreamServer = Backbone.Model.extend({

		initialize: function () {

			//Start a new torrent stream, ops: torrent file, magnet
			App.vent.on('serve:start', _.bind(this.start, this));
			//stop a torrent streaming
			App.vent.on('serve:stop', _.bind(this.stop, this));

		},
		start: function (file) {
			var self = this;
			this.sockets = {};
			var nextSocketId = 0;

			this.filePath = file;

			Q.ninvoke(portfinder, 'getPort').done(function (port) {
				self.port = port;

				self.server = http.createServer(_.bind(self.onRequest, self)).listen(self.port);

				win.debug('Streamer Server Started on: http://127.0.0.1:' + self.port + '/');
				self.src = 'http://127.0.0.1:' + self.port;


				self.server.on('connection', function (socket) {
					// Add a newly connected socket
					var socketId = nextSocketId++;
					self.sockets[socketId] = socket;
					console.log('socket', socketId, 'opened');

					// Remove the socket when it closes
					socket.on('close', function () {
						console.log('socket', socketId, 'closed');
						delete self.sockets[socketId];
					});

				});


			});

		},

		stop: function () {

			this.server.close(function () {
				console.log('Streamer Server closed!');
			});

			for (var socketId in this.sockets) {
				console.log('socket', socketId, 'destroyed');
				this.sockets[socketId].destroy();
			}

		},

		onRequest: function (request, response) {
			// We will only accept 'GET' method. Otherwise will return 405 'Method Not Allowed'.
			if (request.method !== 'GET') {
				this.sendResponse(response, 405, {
					'Allow': 'GET'
				}, null);
				return null;
			}

			var filePath = this.filePath;

			// Check if file exists. If not, will return the 404 'Not Found'. 
			if (!fs.existsSync(filePath)) {
				this.sendResponse(response, 404, null, null);
				console.log('File not found - server');
				return null;
			}

			var responseHeaders = {};
			var filesize = App.Streamer.streamInfo.size;
			var rangeRequest = this.readRangeHeader(request.headers['range'], filesize);

			// If 'Range' header exists, we will parse it with Regular Expression.
			if (rangeRequest == null) {
				responseHeaders['Content-Type'] = mime.lookup(filePath);
				responseHeaders['Content-Length'] = filesize; // File size.
				responseHeaders['Accept-Ranges'] = 'bytes';

				//  If not, will return file directly.
				this.sendResponse(response, 200, responseHeaders, fs.createReadStream(filePath));
				return null;
			}

			var start = rangeRequest.Start;
			var end = rangeRequest.End;

			// If the range can't be fulfilled. 
			if (start >= filesize || end >= filesize) {
				// Indicate the acceptable range.
				responseHeaders['Content-Range'] = 'bytes */' + filesize; // File size.

				// Return the 416 'Requested Range Not Satisfiable'.
				this.sendResponse(response, 416, responseHeaders, null);
				return null;
			}

			// Indicate the current range. 
			responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + filesize;
			responseHeaders['Content-Length'] = start === end ? 0 : (end - start + 1);
			responseHeaders['Content-Type'] = mime.lookup(filePath);
			responseHeaders['Accept-Ranges'] = 'bytes';
			responseHeaders['Cache-Control'] = 'no-cache';

			console.log(responseHeaders);

			// Return the 206 'Partial Content'.
			this.sendResponse(response, 206, responseHeaders, fs.createReadStream(filePath, {
				start: start,
				end: end
			}));


		},
		sendResponse: function (response, responseStatus, responseHeaders, readable) {
			response.writeHead(responseStatus, responseHeaders);

			if (readable == null) {
				response.end();
			} else {
				readable.on('open', function () {
					readable.pipe(response);
				});
			}
			return null;
		},
		readRangeHeader: function (range, totalLength) {
			/*
			 * Example of the method 'split' with regular expression.
			 *
			 * Input: bytes=100-200
			 * Output: [null, 100, 200, null]
			 *
			 * Input: bytes=-200
			 * Output: [null, null, 200, null]
			 */

			if (range === null || range.length === 0) {
				return null;
			}

			var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
			var start = parseInt(array[1]);
			var end = parseInt(array[2]);
			var result = {
				Start: isNaN(start) ? 0 : start,
				End: isNaN(end) ? (totalLength - 1) : end
			};

			if (!isNaN(start) && isNaN(end)) {
				result.Start = start;
				result.End = totalLength - 1;
			}

			if (isNaN(start) && !isNaN(end)) {
				result.Start = totalLength - end;
				result.End = totalLength - 1;
			}

			return result;
		}

	});

	App.StreamServer = new StreamServer();
})(window.App);