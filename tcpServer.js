const net = require('net');

const PORT = process.env.TCP_PORT || 5000;
const clients = [];

// Fonction pour extraire l'IMEI du message de connexion
function extractIMEI(hexString) {
    let imei = "";
    for (let i = 8; i < 24; i += 2) {
        imei += parseInt(hexString.substring(i, i + 2), 16).toString();
    }
    return imei;
}

// Fonction pour analyser les données GT06
function parseGT06Data(data) {
    const hexString = data.toString('hex').toUpperCase();
    console.log(`📍 Trame reçue : ${hexString}`);

    // Vérification du préfixe GT06 (78 78 ou 79 79)
    if (!hexString.startsWith('7878') && !hexString.startsWith('7979')) {
        console.log('⚠️ Trame invalide.');
        return null;
    }

    // Type de message (byte après 7878)
    const messageType = hexString.substring(4, 6);

    if (messageType === '01') {
        // 📡 **Message de connexion (Login Message)**
        const imei = extractIMEI(hexString);
        return { type: 'connexion', imei };
    } 
    else if (messageType === '12') {
        // 📍 **Message de localisation**
        const year = parseInt(hexString.substring(8, 10), 16) + 2000;
        const month = parseInt(hexString.substring(10, 12), 16);
        const day = parseInt(hexString.substring(12, 14), 16);
        const hour = parseInt(hexString.substring(14, 16), 16);
        const minute = parseInt(hexString.substring(16, 18), 16);
        const second = parseInt(hexString.substring(18, 20), 16);
        const date = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

        const latitudeRaw = parseInt(hexString.substring(22, 30), 16);
        const longitudeRaw = parseInt(hexString.substring(30, 38), 16);
        const latitude = latitudeRaw / 1800000.0;
        const longitude = longitudeRaw / 1800000.0;

        const speed = parseInt(hexString.substring(38, 40), 16);
        const directionRaw = parseInt(hexString.substring(40, 44), 16);
        const direction = directionRaw & 0x03FF; // 10 bits pour la direction

        return { 
            type: 'position',
            date,
            latitude,
            longitude,
            speed,
            direction
        };
    } else {
        console.log(`⚠️ Type de message inconnu : ${messageType}`);
        return null;
    }
}

// Serveur TCP
const server = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`📡 Nouveau périphérique connecté : ${clientAddress}`);

    clients.push(socket);

    socket.on('data', (data) => {
        const parsedData = parseGT06Data(data);
        if (parsedData) {
            if (parsedData.type === 'connexion') {
                console.log(`✅ Connexion établie avec l'IMEI : ${parsedData.imei}`);

                // Réponse ACK au login
                const ack = Buffer.from('787805010002E9DC0D0A', 'hex');
                socket.write(ack);
            } else if (parsedData.type === 'position') {
                console.log(`📍 Position reçue :
                - Date : ${parsedData.date}
                - Latitude : ${parsedData.latitude}
                - Longitude : ${parsedData.longitude}
                - Vitesse : ${parsedData.speed} km/h
                - Direction : ${parsedData.direction}°`);
            }
        }
    });

    // Déconnexion
    socket.on('end', () => {
        console.log(`❌ Déconnexion de ${clientAddress}`);
        clients.splice(clients.indexOf(socket), 1);
    });

    socket.on('error', (err) => {
        console.error(`⚠️ Erreur avec ${clientAddress} : ${err.message}`);
    });
});

// Lancer le serveur
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur TCP GT06 en écoute sur le port ${PORT}`);
});
