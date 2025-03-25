const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

dotenv.config();
connectDB();

// Buffer accumulateur pour les données TCP
let buffer = Buffer.alloc(0);

function parseGT06N(data) {
    buffer = Buffer.concat([buffer, data]);
    
    const packets = [];
    while (buffer.length > 2) {
        // Recherche du début de trame (0x78 0x78)
        const startIndex = buffer.indexOf(Buffer.from([0x78, 0x78]));
        if (startIndex === -1) {
            buffer = buffer.slice(buffer.length - 2);
            break;
        }
        
        if (startIndex > 0) {
            buffer = buffer.slice(startIndex);
        }

        if (buffer.length < 8) break; // Taille minimale d'une trame

        const packetLength = buffer[2];
        const totalLength = packetLength + 5; // 4 bytes header/checksum + 1 byte length
        
        if (buffer.length < totalLength) break;

        const packet = buffer.slice(0, totalLength);
        buffer = buffer.slice(totalLength);

        // Vérification des bytes de fin (0x0D 0x0A)
        if (packet[packet.length - 2] !== 0x0D || packet[packet.length - 1] !== 0x0A) {
            continue;
        }

        // Calcul du checksum
        let checksum = 0;
        for (let i = 0; i < packet.length - 4; i++) {
            checksum += packet[i];
        }
        checksum = checksum % 256;

        if (checksum !== packet[packet.length - 4]) {
            console.log('Checksum invalide');
            continue;
        }

        packets.push(packet);
    }

    return packets;
}

function parseLocationData(packet) {
    const protocol = packet[3];
    let data = {};

    // Exemple pour le protocole de localisation (0x12)
    if (protocol === 0x12) {
        const dateTime = packet.slice(4, 10);
        const satellite = packet[10];
        const lat = packet.readUInt32BE(11) / 1000000;
        const lon = packet.readUInt32BE(15) / 1000000;
        const speed = packet[19];
        const courseStatus = packet.readUInt16BE(20);
        
        // Conversion DDDMM.MMMMMM → DD.DDDDDD
        data = {
            deviceId: packet.readUInt32BE(4).toString(),
            latitude: convertCoordinate(lat),
            longitude: convertCoordinate(lon),
            speed: speed,
            direction: courseStatus & 0x03FF,
            datetime: parseDateTime(dateTime),
            status: (courseStatus >> 10) & 0x03
        };
    }

    return data;
}

function convertCoordinate(value) {
    const degrees = Math.floor(value / 100);
    const minutes = value - (degrees * 100);
    return degrees + (minutes / 60);
}

function parseDateTime(rawDate) {
    const year = 2000 + rawDate[0];
    const month = rawDate[1];
    const day = rawDate[2];
    const hour = rawDate[3];
    const minute = rawDate[4];
    const second = rawDate[5];
    return new Date(year, month - 1, day, hour, minute, second);
}

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', async data => {
        const packets = parseGT06N(data);

        for (const packet of packets) {
            const protocol = packet[3];
            
            // Réponse pour connexion (protocole 0x01)
            if (protocol === 0x01) {
                const response = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x01, 0xD9, 0xDC, 0x0D, 0x0A]);
                socket.write(response);
                console.log('Réponse login envoyée');
            }
            
            if (protocol === 0x12) {
                const locationData = parseLocationData(packet);
                console.log('Données GPS:', locationData);

                try {
                    const existingGpsEntry = await GpsData.findOne({ deviceId: locationData.deviceId });
                    
                    if (existingGpsEntry) {
                        await GpsData.updateOne(
                            { deviceId: locationData.deviceId },
                            { ...locationData, updatedAt: new Date() }
                        );
                    } else {
                        const gpsEntry = new GpsData(locationData);
                        await gpsEntry.save();
                    }
                } catch (error) {
                    console.error("Erreur base de données:", error);
                }
            }
        }
    });

    socket.on('error', err => console.error("Erreur socket:", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
