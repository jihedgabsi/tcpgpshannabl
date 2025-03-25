const net = require('net');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
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
  this.buffer = Buffer.alloc(0);
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
        default:
          console.log(`Unhandled protocol: 0x${protocol.toString(16)}`);
      }
    }
  } catch (err) {
    console.error('Processing error:', err);
  }
};

Server.prototype.parsePackets = function(data) {
  const packets = [];
  this.buffer = Buffer.concat([this.buffer, data]);
  
  while (this.buffer.length >= 4) {
    const startIndex = this.buffer.indexOf(Buffer.from([0x78, 0x78]));
    
    if (startIndex === -1) {
      this.buffer = Buffer.alloc(0);
      break;
    }
    
    if (startIndex > 0) {
      this.buffer = this.buffer.subarray(startIndex);
    }

    if (this.buffer.length < 4) break;

    const packetLength = this.buffer[2];
    const totalLength = packetLength + 6;
    
    if (this.buffer.length < totalLength) break;

    const packet = this.buffer.subarray(0, totalLength);
    this.buffer = this.buffer.subarray(totalLength);

    if (!this.validatePacket(packet)) continue;

    packets.push(packet);
  }
  
  return packets;
};

Server.prototype.validatePacket = function(packet) {
  // Verify end bytes
  if (!packet.subarray(-2).equals(Buffer.from([0x0D, 0x0A]))) {
    console.log('Invalid end bytes');
    return false;
  }

  // Verify checksum
  const receivedChecksum = packet[packet.length - 4];
  let calculatedChecksum = 0;
  
  for (let i = 2; i < packet.length - 4; i++) {
    calculatedChecksum += packet[i];
  }
  calculatedChecksum %= 256;

  if (calculatedChecksum !== receivedChecksum) {
    console.log(`Checksum mismatch: ${calculatedChecksum} vs ${receivedChecksum}`);
    return false;
  }

  return true;
};

Server.prototype.decodePacket = function(packet) {
  const protocol = packet[3];
  let imei = '';
  let payload = {};

  switch(protocol) {
    case 0x01: // Login packet
      imei = packet.subarray(4, 19).toString('ascii');
      break;
      
    case 0x12: // GPS data
      payload = {
        timestamp: this.parseDate(packet.subarray(4, 10)),
        latitude: this.convertCoord(packet.readUInt32BE(11)),
        longitude: this.convertCoord(packet.readUInt32BE(15)),
        speed: packet[19],
        course: packet.readUInt16BE(20) & 0x03FF,
        flags: (packet.readUInt16BE(20) >> 10) & 0x03,
        satellites: packet[10],
        battery: packet[22]
      };
      break;
  }

  return { protocol, imei, payload };
};

Server.prototype.convertCoord = function(value) {
  const degrees = Math.floor(value / 1000000);
  const minutes = (value - (degrees * 1000000)) / 100000;
  return degrees + (minutes / 60);
};

Server.prototype.parseDate = function(raw) {
  return new Date(
    2000 + raw[0],
    raw[1] - 1,
    raw[2],
    raw[3],
    raw[4],
    raw[5]
  );
};

Server.prototype.handleLogin = function(socket, imei) {
  this.devices.set(imei, socket);
  
  const response = Buffer.alloc(10);
  response.writeUInt16BE(0x7878, 0); // Start bytes
  response[2] = 0x05; // Packet length
  response[3] = 0x01; // Protocol
  response[4] = 0x00; // Serial
  response[5] = 0x01; // Serial
  response[6] = (0x05 + 0x01) % 256; // Checksum
  response[7] = 0x0D; // End bytes
  response[8] = 0x0A;
  
  socket.write(response);
  console.log(`Login confirmed for ${imei}`);
};

Server.prototype.handleGPSData = async function(imei, data) {
  try {
    const gpsEntry = new GpsData({
      deviceId: imei,
      ...data,
      timestamp: new Date(data.timestamp)
    });
    
    await gpsEntry.save();
    console.log(`GPS data saved for ${imei}`);
  } catch (err) {
    console.error(`DB save error for ${imei}:`, err);
  }
};

Server.prototype.handleHeartbeat = function(socket) {
  const response = Buffer.from([
    0x78, 0x78, 0x05, 0x13, 0x00, 0x01, 
    (0x05 + 0x13) % 256, 0x0D, 0x0A
  ]);
  socket.write(response);
};

Server.prototype.handleDisconnect = function(socket) {
  const entry = [...this.devices.entries()].find(([_, s]) => s === socket);
  if (entry) {
    console.log(`Device ${entry[0]} disconnected`);
    this.devices.delete(entry[0]);
  }
};

// Démarrage du serveur
const server = new Server({ 
  port: process.env.TCP_PORT || 5000 
});

server.server.listen(server.opts.port, '0.0.0.0', () => {
  console.log(`Server listening on port ${server.opts.port}`);
});

module.exports = Server;
