'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');
const util = require('./util');
const torrentParser = require('./torrent-parser');

function udpSend(socket, message, rawUrl, cb = () => {}) {
	const url = urlParse(rawUrl);
	socket.send(message, 0, message.length, url.port, url.host, cb);
}

function getResponseType() {}

function buildConnectionRequest() {
	const buffer = Buffer.allocUnsafe(16);
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

function buildAnnounceRequest(connectionId, torrent, port = 6881) {
	const buffer = Buffer.allocUnsafe(98);

	// connection id
	connectionId.copy(buffer, 0);
	// action
	buffer.writeUInt32BE(1, 8);
	// transaction id
	crypto.randomBytes(4).copy(buffer, 12);
	// info hash
	torrentParser.infoHash(torrent).copy(buffer, 16);
	// peer id
	util.genId().copy(buffer, 36);
	// downloaded
	Buffer.alloc(8).copy(buffer, 56);
	// left
	torrentParser.size(torrent).copy(buffer, 64);
	// uploaded
	Buffer.alloc(8).copy(buffer, 72);
	// event
	buffer.writeUInt32BE(0, 80);
	// ip address
	buffer.writeUInt32BE(0, 84);
	// key
	crypto.randomBytes(4).copy(buffer, 88);
	// num want
	buffer.writeInt32BE(-1, 92);
	// port
	buffer.writeUInt16LE(port, 96);

	return buffer;
}

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
