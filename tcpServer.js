const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

function parseGT06NPacket(buffer) {
    console.log('--- Début du parsing du paquet ---');
    console.log('Paquet brut (hexadécimal):', buffer.toString('hex'));
    console.log('Longueur du paquet:', buffer.length);

    // Vérifier le start bit (0x78 0x78)
    if (buffer[0] !== 0x78 || buffer[1] !== 0x78) {
        console.log('❌ Invalid start bit');
        return null;
    }

    // Longueur du paquet
    const packetLength = buffer[2];
    console.log('Longueur du paquet (payload):', packetLength);

    // Type de protocole
    const protocolNumber = buffer[3];
    console.log('Numéro de protocole:', protocolNumber.toString(16));

    switch (protocolNumber) {
        case 0x01: // Login Packet
            console.log('📡 Paquet de login');
            console.log('Données de login:', buffer.slice(4, -2).toString('hex'));
            return null;

        case 0x10: // GPS Location Data
            console.log('🛰️ Paquet de données GPS');

            // Extraction des données GPS
            const year = buffer[4] + 2000;
            const month = buffer[5];
            const day = buffer[6];
            const hour = buffer[7];
            const minute = buffer[8];
            const second = buffer[9];

            console.log(`📅 Date: ${year}-${month}-${day} ${hour}:${minute}:${second}`);

            // Latitude et longitude
            const latitude = ((buffer[10] << 24) | (buffer[11] << 16) | (buffer[12] << 8) | buffer[13]) / 30000 / 60;
            const longitude = ((buffer[14] << 24) | (buffer[15] << 16) | (buffer[16] << 8) | buffer[17]) / 30000 / 60;

            // Vitesse
            const speed = buffer[18];

            // Autres informations
            const courseAndStatus = (buffer[19] << 8) | buffer[20];
            const satelitesCount = courseAndStatus & 0x0F;
            const gpsSignal = (courseAndStatus >> 4) & 0x01;

            const gpsData = {
                timestamp: new Date(year, month - 1, day, hour, minute, second),
                latitude: latitude,
                longitude: longitude,
                speed: speed,
                satelitesCount: satelitesCount,
                gpsSignal: gpsSignal ? 'Good' : 'Poor'
            };

            // Affichage détaillé des données GPS
            console.log('🌍 Coordonnées GPS:');
            console.log(`   Latitude: ${gpsData.latitude}`);
            console.log(`   Longitude: ${gpsData.longitude}`);
            console.log(`📍 Vitesse: ${gpsData.speed} km/h`);
            console.log(`🛰️ Satellites: ${gpsData.satelitesCount}`);
            console.log(`📶 Signal GPS: ${gpsData.gpsSignal}`);

            return gpsData;

        default:
            console.log(`❓ Numéro de protocole non supporté: ${protocolNumber}`);
            return null;
    }
}

const server = net.createServer(socket => {
    console.log('🔌 Nouvelle connexion TCP');
    console.log(`🌐 Adresse client: ${socket.remoteAddress}:${socket.remotePort}`);
    let buffer = Buffer.alloc(0);

    socket.on('data', async data => {
        console.log('\n--- 📥 Nouvelles données reçues ---');
        console.log('Données brutes (hexadécimal):', data.toString('hex'));
        console.log('Longueur des données:', data.length);

        // Concaténer les nouveaux données au buffer existant
        buffer = Buffer.concat([buffer, data]);

        // Tant qu'il y a des paquets complets à traiter
        while (buffer.length >= 4) {
            // Vérifier le start bit
            if (buffer[0] === 0x78 && buffer[1] === 0x78) {
                // Longueur du paquet
                const packetLength = buffer[2] + 5; // 2 start bytes + 1 length byte + data + 2 checksum bytes

                // Vérifier si nous avons le paquet complet
                if (buffer.length >= packetLength) {
                    // Extraire le paquet
                    const packetBuffer = buffer.slice(0, packetLength);
                    
                    // Parser le paquet
                    const gpsData = parseGT06NPacket(packetBuffer);

                    if (gpsData) {
                        try {
                            // Enregistrer dans la base de données
                            const gpsEntry = new GpsData({
                                deviceId: socket.remoteAddress, // Utiliser l'adresse IP comme identifiant
                                latitude: gpsData.latitude,
                                longitude: gpsData.longitude,
                                speed: gpsData.speed,
                                timestamp: gpsData.timestamp,
                                additionalInfo: {
                                    satelitesCount: gpsData.satelitesCount,
                                    gpsSignal: gpsData.gpsSignal
                                }
                            });

                            await gpsEntry.save();
                            console.log('💾 Données GPS enregistrées en base de données !');
                        } catch (error) {
                            console.error("❌ Erreur lors de l'enregistrement :", error);
                        }
                    }

                    // Supprimer le paquet traité du buffer
                    buffer = buffer.slice(packetLength);
                } else {
                    // Paquet incomplet, attendre plus de données
                    console.log('⏳ Paquet incomplet, attente de plus de données');
                    break;
                }
            } else {
                // Données invalides, supprimer le premier octet
                console.log('❌ Données invalides, suppression du premier octet');
                buffer = buffer.slice(1);
            }
        }
    });

    socket.on('error', err => {
        console.error("❌ Erreur socket :", err);
    });

    socket.on('end', () => {
        console.log("🔌 Connexion terminée");
    });
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur TCP en écoute sur le port ${PORT}`);
    console.log('Prêt à recevoir des données du tracker GPS GT06N');
});
