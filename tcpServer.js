const net = require('net');
const crc = require('crc');

const PORT = process.env.TCP_PORT || 5000;
const clients = new Map();
let buffer = Buffer.alloc(0);

function validateChecksum(packet) {
    const receivedChecksum = packet[packet.length - 4];
    let calculatedChecksum = 0;
    
    // Calcul du checksum à partir de l'octet de longueur (index 2)
    for (let i = 2; i < packet.length - 4; i++) {
        calculatedChecksum += packet[i];
    }
    
    return (calculatedChecksum & 0xFF) === receivedChecksum;
}

function processPackets(data) {
    buffer = Buffer.concat([buffer, data]);
    const packets = [];

    while (buffer.length >= 4) {
        // Recherche du début de trame
        const startIndex = buffer.indexOf(Buffer.from([0x78, 0x78]));
        if (startIndex === -1) {
            buffer = buffer.slice(buffer.length - 2);
            break;
        }

        buffer = buffer.slice(startIndex);
        
        if (buffer.length < 4) break;
        
        const length = buffer[2];
        const totalLength = length + 6;
        
        if (buffer.length < totalLength) break;
        
        const packet = buffer.slice(0, totalLength);
        buffer = buffer.slice(totalLength);

        if (!validateChecksum(packet)) {
            console.log('⚠️ Checksum invalide - Paquet ignoré');
            continue;
        }

        packets.push(packet);
    }
    
    return packets;
}

function parseLoginPacket(packet) {
    return {
        type: 'login',
        imei: packet.slice(4, 19).toString('ascii'),
        serial: packet.readUInt16BE(19)
    };
}

const server = net.createServer((socket) => {
    console.log(`📡 Nouvelle connexion: ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        const packets = processPackets(data);
        
        packets.forEach(packet => {
            const protocol = packet[3];
            
            switch(protocol) {
                case 0x01: // Login
                    const loginData = parseLoginPacket(packet);
                    clients.set(loginData.imei, socket);
                    console.log(`✅ Connexion IMEI: ${loginData.imei}`);
                    
                    // Réponse login valide
                    const response = Buffer.from('787805010001D9DC0D0A', 'hex');
                    socket.write(response);
                    break;
                    
                case 0x12: // Données GPS
                    if (validateChecksum(packet)) {
                        const latitude = packet.readUInt32BE(11) / 1800000;
                        const longitude = packet.readUInt32BE(15) / 1800000;
                        console.log(`📍 Position valide: ${latitude}, ${longitude}`);
                    }
                    break;
            }
        });
    });

    socket.on('end', () => {
        console.log('❌ Déconnexion client');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur GT06N actif sur port ${PORT}`);
});
