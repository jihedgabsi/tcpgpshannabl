const net = require('net');
const crc = require('crc');
const gt06 = require('./gt06n.js').gt06;

const PORT = 5000;
let buffer = Buffer.alloc(0);

const server = net.createServer((connection) => {
    console.log(`📡 Nouvelle connexion: ${connection.remoteAddress}:${connection.remotePort}`);

    connection.on('data', (data) => {
        try {
            buffer = Buffer.concat([buffer, data]);
            
            while (buffer.length >= 4) {
                const startIndex = buffer.indexOf(Buffer.from([0x78, 0x78]));
                if (startIndex === -1) {
                    buffer = buffer.slice(buffer.length - 2);
                    break;
                }

                const packet = extractPacket(buffer.slice(startIndex));
                if (!packet) break;

                const result = gt06.parse(packet.toString('hex'));
                handleProtocol(connection, result);
            }
        } catch (error) {
            console.error('Erreur traitement données:', error);
        }
    });

    connection.on('end', () => {
        console.log('❌ Déconnexion client');
        buffer = Buffer.alloc(0);
    });

}).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur GT06N actif sur port ${PORT}`);
});

function extractPacket(buffer) {
    if (buffer.length < 4) return null;
    
    const length = buffer[2];
    const totalLength = length + 6;
    
    if (buffer.length < totalLength) return null;
    
    const packet = buffer.slice(0, totalLength);
    if (!validateChecksum(packet)) {
        console.log('⚠️ Checksum invalide - Paquet ignoré');
        return null;
    }

    return packet;
}

function validateChecksum(packet) {
    const receivedChecksum = packet.slice(-4).readUInt16BE(0);
    const calculatedChecksum = crc.crc16xmodem(packet.slice(2, -4));
    return receivedChecksum === calculatedChecksum;
}

function handleProtocol(connection, result) {
    if (result.error) {
        console.log('❌ Erreur:', result.error);
        return;
    }

    console.log('📩 Message reçu:', result);

    switch(result.event) {
        case '01':
            const loginResponse = Buffer.from('787805010001D9DC0D0A', 'hex');
            connection.write(loginResponse);
            break;

        case '13':
            const heartbeatResponse = Buffer.from('78780513000159C50D0A', 'hex');
            connection.write(heartbeatResponse);
            break;
    }
}
