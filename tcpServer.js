const net = require('net');
const crc = require('crc');

const PORT = 5000;
let buffer = Buffer.alloc(0);

function calculateChecksum(packet) {
    let sum = 0;
    for (let i = 2; i < packet.length - 4; i++) {
        sum += packet[i];
    }
    return sum % 256;
}

function parseGT06Packet(packet) {
    const protocol = packet[3];
    const result = { protocol };

    switch(protocol) {
        case 0x01: // Login
            result.imei = packet.slice(4, 19).toString('ascii');
            result.serial = packet.readUInt16BE(19);
            break;

        case 0x12: // GPS
            result.timestamp = new Date(
                2000 + packet[4],
                packet[5] - 1,
                packet[6],
                packet[7],
                packet[8],
                packet[9]
            );
            result.latitude = packet.readUInt32BE(11) / 1800000;
            result.longitude = packet.readUInt32BE(15) / 1800000;
            result.speed = packet[19];
            result.course = packet.readUInt16BE(20) & 0x03FF;
            break;

        case 0x13: // Heartbeat
            break;

        default:
            result.error = 'Protocol non géré';
    }

    return result;
}

const server = net.createServer(socket => {
    console.log(`Nouvelle connexion: ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', data => {
        buffer = Buffer.concat([buffer, data]);

        while (true) {
            const start = buffer.indexOf(Buffer.from([0x78, 0x78]));
            if (start === -1) break;
            if (start > 0) buffer = buffer.slice(start);

            if (buffer.length < 4) break;
            const length = buffer[2];
            const totalLength = length + 6;

            if (buffer.length < totalLength) break;

            const packet = buffer.slice(0, totalLength);
            buffer = buffer.slice(totalLength);

            if (packet.slice(-2).compare(Buffer.from([0x0D, 0x0A])) !== 0) {
                console.log('Erreur de fin de trame');
                continue;
            }

            if (calculateChecksum(packet) !== packet[packet.length - 4]) {
                console.log('Checksum invalide');
                continue;
            }

            const parsed = parseGT06Packet(packet);
            console.log('Trame reçue:', parsed);

            // Réponse pour login
            if (parsed.protocol === 0x01) {
                const response = Buffer.from([
                    0x78, 0x78, 0x05, 0x01, 0x00, 0x01, 
                    (0x05 + 0x01) % 256, 0x0D, 0x0A
                ]);
                socket.write(response);
            }
        }
    });

    socket.on('error', err => console.error('Erreur:', err));
    socket.on('end', () => console.log('Déconnexion'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur GT06N en écoute sur port ${PORT}`);
});
