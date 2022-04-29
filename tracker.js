'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');

function udpSend(socket, message, rawUrl, cb = () => {}) {
	const url = urlParse(rawUrl);
	socket.send(message, 0, message.length, url.port, url.host, cb);
}

function getResponseType() {}

function buildConnectionRequest() {
	const buffer = Buffer.alloc(16);
	buffer.writeUInt32BE(0x417, 0);
	buffer.writeUInt32BE(0x27101980, 4);
	buffer.writeUInt32BE(0, 8);
	crypto.randomBytes(4).copy(buffer, 12);

	return buffer;
}

function parseConnectionResponse(response) {
	return {
		action: response.readUInt32BE(0),
		transactionId: response.readUInt32BE(4),
		connectionId: response.slice(8),
	};
}

function buildAnnounceRequest(connectionId) {}

function parseAnnounceResponse(response) {}

module.exports.getPeers = (torrent, callback) => {
	const socket = dgram.createSocket('udp4');
	const url = torrent.announce.toString('utf8');

	udpSend(socket, buildConnectionRequest(), url);

	socket.on('message', (response) => {
		if (getResponseType(response) === 'connect') {
			const connResponse = parseConnectionResponse(response);
			const announceReq = buildAnnounceRequest(connResponse.connectionId);
			udpSend(socket, announceReq, url);
		} else if (getResponseType(response) === 'announce') {
			const announceResponse = parseAnnounceResponse(response);
			callback(announceResponse.peers);
		}
	});
};
