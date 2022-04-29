const fs = require('fs');
const bencode = require('bencode');

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
const url = urlParse(torrent.announce.toString('utf8'));
const socket = dgram.createSocket('udp4');
const message = Buffer.from('hello?', 'utf-8');
socket.send(message, 0, message.length, url.port, url.host, () => {});

socket.on('message', (msg) => {
	console.log(msg.toString('utf8'));
});
