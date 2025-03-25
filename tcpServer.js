const net = require('net');
const crc = require('crc'); // Ajouter avec: npm install crc

const PORT = process.env.TCP_PORT || 5000;
const clients = new Map();

// Fonction améliorée d'extraction de l'IMEI
function extractIMEI(packet) {
    return packet.slice(4, 19).toString('ascii');
}

// Nouvelle fonction de validation checksum
function validateChecksum(packet) {
    const receivedChecksum = packet[packet.length - 4];
    let calculatedChecksum = 0;
    for (let i = 2; i < packet.length - 4; i++) {
        calculatedChecksum += packet[i];
    }
    return (calculatedChecksum % 256) === receivedChecksum;
}

// Version corrigée du parser GT06
function parseGT06Data(data) {
    try {
        const startBytes = data.readUInt16BE(0);
        if (startBytes !== 0x7878 && startBytes !== 0x7979) {
            console.log('⚠️ Trame invalide (mauvais header)');
            return null;
        }

        const packetLength = data[2];
        const protocol = data[3];
        
        if (!validateChecksum(data)) {
            console.log('⚠️ Checksum invalide');
            return null;
        }

        switch(protocol) {
            case 0x01: // Login
                return {
                    type: 'login',
                    imei: extractIMEI(data),
                    serial: data.readUInt16BE(19)
                };

            case 0x12: // Données GPS
                const date = new Date(
                    2000 + data[4],
                    data[5] - 1,
                    data[6],
                    data[7],
                    data[8],
                    data[9]
                );
                
                return {
                    type: 'gps',
                    date: date.toISOString(),
                    latitude: data.readUInt32BE(11) / 1800000,
                    longitude: data.readUInt32BE(15) / 1800000,
                    speed: data[19],
                    direction: data.readUInt16BE(20) & 0x03FF,
                    flags: (data.readUInt16BE(20) >> 10) & 0x03,
                    satellites: data[10]
                };

            case 0x13: // Heartbeat
                return { type: 'heartbeat' };

            case 0x16: // Alarme
                return { type: 'alarm', code: data.readUInt16BE(21) };

            default:
                console.log(`⚠️ Type de message non géré : 0x${protocol.toString(16)}`);
                return null;
        }
    } catch (error) {
        console.error('Erreur de parsing:', error);
        return null;
    }
}

// Serveur TCP amélioré
const server = net.createServer((socket) => {
    const clientKey = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`📡 Nouvelle connexion: ${clientKey}`);

    socket.on('data', (data) => {
        try {
            const result = parseGT06Data(data);
            if (!result) return;

            switch(result.type) {
                case 'login':
                    console.log(`✅ Login IMEI: ${result.imei}`);
                    clients.set(result.imei, socket);
                    // Réponse login correcte
                    const response = Buffer.from('787805010001D9DC0D0A', 'hex');
                    socket.write(response);
                    break;

                case 'gps':
                    console.log(`📍 Position ${result.imei || 'inconnu'}:
                    Lat: ${result.latitude.toFixed(6)}, Lon: ${result.longitude.toFixed(6)}
                    Vitesse: ${result.speed} km/h, Sat: ${result.satellites}`);
                    break;

                case 'heartbeat':
                    socket.write(Buffer.from('78780513000159C50D0A', 'hex'));
                    break;

                case 'alarm':
                    console.log(`🚨 Alarme ${result.code} de ${result.imei}`);
                    break;
            }
        } catch (error) {
            console.error('Erreur traitement data:', error);
        }
    });

    socket.on('end', () => {
        console.log(`❌ Déconnexion: ${clientKey}`);
        clients.delete(clientKey);
    });

    socket.on('error', (err) => {
        console.error(`⚠️ Erreur ${clientKey}: ${err.message}`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur GT06N actif sur port ${PORT}`);
});
