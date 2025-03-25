const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

dotenv.config();
connectDB();

// Configuration
const BUFFER_START = Buffer.from([0x78, 0x78]);
const BUFFER_END = Buffer.from([0x0D, 0x0A]);
let buffer = Buffer.alloc(0);
const devices = new Map(); // Suivi des appareils par connexion

function parseGT06N(data) {
    buffer = Buffer.concat([buffer, data]);
    const packets = [];

    while (buffer.length >= 2) {
        const startIndex = buffer.indexOf(BUFFER_START);
        
        if (startIndex === -1) {
            buffer = buffer.slice(-2);
            break;
        }

        if (startIndex > 0) {
            buffer = buffer.slice(startIndex);
        }

        if (buffer.length < 8) break;

        const packetLength = buffer[2];
        const totalLength = packetLength + 6; // 2(start) + 1(len) + len + 1(checksum) + 2(end)

        if (buffer.length < totalLength) break;

        const packet = buffer.slice(0, totalLength);
        buffer = buffer.slice(totalLength);

        if (!packet.slice(-2).equals(BUFFER_END)) {
            continue;
        }

        // Calcul checksum
        let checksum = 0;
        for (let i = 2; i < packet.length - 4; i++) {
            checksum += packet[i];
        }
        checksum %= 256;

        if (checksum !== packet[packet.length - 4]) {
            console.log(`Checksum invalide (${checksum} vs ${packet[packet.length - 4]})`);
            continue;
        }

        packets.push(packet);
    }

    return packets;
}

function parseLogin(packet) {
    return {
        imei: packet.slice(4, 19).toString('ascii'),
        alarm: packet[19]
    };
}

function parseLocation(packet) {
    const data = {
        protocol: packet[3],
        imei: devices.get(this) || 'unknown',
        date: parseDate(packet.slice(4, 10)),
        latitude: convertCoord(packet.readUInt32BE(11)),
        longitude: convertCoord(packet.readUInt32BE(15)),
        speed: packet[19],
        course: packet.readUInt16BE(20) & 0x03FF,
        status: (packet.readUInt16BE(20) >> 10) & 0x03,
        satellites: packet[10],
        gsm: packet[21],
        battery: packet[22]
    };
    return data;
}

function convertCoord(value) {
    const deg = Math.floor(value / 1000000);
    const min = (value - deg * 1000000) / 10000;
    return deg + min / 60;
}

function parseDate(raw) {
    return new Date(
        2000 + raw[0],
        raw[1] - 1,
        raw[2],
        raw[3],
        raw[4],
        raw[5]
    );
}

const server = net.createServer(socket => {
    console.log('Nouvelle connexion:', socket.remoteAddress);

    socket.on('data', async data => {
        try {
            const packets = parseGT06N(data);
            
            for (const packet of packets) {
                switch (packet[3]) {
                    case 0x01: // Login
                        const login = parseLogin(packet);
                        devices.set(socket, login.imei);
                        
                        const response = Buffer.from([
                            0x78, 0x78, 0x05, 0x01, 0x00, 0x01, 
                            (0x05 + 0x01) % 256, 0x0D, 0x0A
                        ]);
                        
                        socket.write(response);
                        console.log(`Appareil connecté: ${login.imei}`);
                        break;

                    case 0x12: // Données GPS
                        const gpsData = new GpsData({
                            deviceId: devices.get(socket),
                            ...parseLocation(packet)
                        });
                        
                        await gpsData.save();
                        console.log('Position enregistrée:', gpsData);
                        break;

                    case 0x13: // Heartbeat
                        socket.write(Buffer.from([0x78, 0x78, 0x05, 0x13, 0x00, 0x01, 0x59, 0x0D, 0x0A]));
                        break;
                }
            }
        } catch (error) {
            console.error('Erreur traitement:', error);
        }
    });

    socket.on('end', () => {
        console.log('Déconnexion:', devices.get(socket) || 'inconnu');
        devices.delete(socket);
    });

    socket.on('error', err => console.error('Erreur socket:', err));
});

const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur GT06N en écoute sur port ${PORT}`);
});
