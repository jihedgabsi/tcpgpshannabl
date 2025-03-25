const net = require('net');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const crc = require('crc');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();
connectDB();

util.inherits(Server, EventEmitter);

function Server(opts) {
  if (!(this instanceof Server)) return new Server(opts);
  
  EventEmitter.call(this);
  this.opts = Object.assign({
    port: 5000,
    debug: true,
    adapter: 'GT06'
  }, opts);

  this.devices = new Map();
  this.server = net.createServer(this.handleConnection.bind(this));
}

Server.prototype.handleConnection = function(socket) {
  const deviceId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`New connection: ${deviceId}`);

  socket.on('data', data => this.processData(socket, data));
  socket.on('end', () => this.handleDisconnect(socket));
  socket.on('error', err => console.error('Socket error:', err));
};

Server.prototype.processData = async function(socket, data) {
  try {
    const packets = this.parsePackets(data);
    for (const packet of packets) {
      const { protocol, imei, payload } = this.decodePacket(packet);
      
      switch(protocol) {
        case 0x01: 
          this.handleLogin(socket, imei, packet);
          break;
        case 0x12:
          await this.handleGPSData(imei, payload);
          break;
        case 0x13:
          this.handleHeartbeat(socket);
          break;
      }
    }
  } catch (err) {
    console.error('Processing error:', err);
  }
};

Server.prototype.parsePackets = function(data) {
  const packets = [];
  let buffer = Buffer.concat([this.buffer, data]);
  
  while (buffer.length >= 2) {
    const start = buffer.indexOf(Buffer.from([0x78, 0x78]));
    if (start === -1) break;
    
    buffer = buffer.slice(start);
    if (buffer.length < 4) break;
    
    const length = buffer[2];
    const totalLength = length + 6;
    if (buffer.length < totalLength) break;
    
    const packet = buffer.slice(0, totalLength);
    if (this.validateChecksum(packet)) {
      packets.push(packet);
      buffer = buffer.slice(totalLength);
    } else {
      buffer = buffer.slice(2);
    }
  }
  
  this.buffer = buffer;
  return packets;
};

Server.prototype.validateChecksum = function(packet) {
  const checksum = packet.slice(-4)[0];
  let calc = 0;
  
  for (let i = 2; i < packet.length - 4; i++) {
    calc += packet[i];
  }
  
  return (calc & 0xFF) === checksum;
};

Server.prototype.decodePacket = function(packet) {
  const protocol = packet[3];
  let imei = '';
  let payload = {};

  if (protocol === 0x01) {
    imei = packet.slice(4, 12).toString('hex');
  } else if (protocol === 0x12) {
    payload = this.parseGPS(packet);
  }

  return { protocol, imei, payload };
};

Server.prototype.parseGPS = function(packet) {
  return {
    latitude: packet.readUInt32BE(11) / 1800000,
    longitude: packet.readUInt32BE(15) / 1800000,
    speed: packet[19],
    timestamp: new Date(
      2000 + packet[4],
      packet[5] - 1,
      packet[6],
      packet[7],
      packet[8],
      packet[9]
    )
  };
};

Server.prototype.handleLogin = function(socket, imei, packet) {
  this.devices.set(imei, socket);
  const response = Buffer.from([
    0x78, 0x78, 0x05, 0x01, 0x00, 0x01, 
    (0x05 + 0x01) % 256, 0x0D, 0x0A
  ]);
  socket.write(response);
  console.log(`Device ${imei} logged in`);
};

Server.prototype.handleGPSData = async function(imei, data) {
  const entry = new GpsData({
    deviceId: imei,
    ...data
  });
  
  await entry.save();
  console.log(`GPS data saved for ${imei}`);
};

Server.prototype.handleHeartbeat = function(socket) {
  const response = Buffer.from([
    0x78, 0x78, 0x05, 0x13, 0x00, 0x01, 
    (0x05 + 0x13) % 256, 0x0D, 0x0A
  ]);
  socket.write(response);
};

Server.prototype.handleDisconnect = function(socket) {
  const device = [...this.devices.entries()]
    .find(([_, s]) => s === socket);
  
  if (device) {
    console.log(`Device ${device[0]} disconnected`);
    this.devices.delete(device[0]);
  }
};

// Démarrage du serveur
const server = new Server({ port: process.env.TCP_PORT || 5000 });
server.server.listen(server.opts.port, '0.0.0.0', () => {
  console.log(`Server listening on port ${server.opts.port}`);
});
