const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

function calculateChecksum(buffer) {
    let checksum = 0;
    for (let i = 2; i < buffer.length - 2; i++) {
        checksum += buffer[i];
    }
    return checksum & 0xFFFF;
}

function createResponsePacket(protocolNumber, serialNumber) {
    // Création d'un paquet de réponse
    const startBits = Buffer.from([0x78, 0x78]); // Start bits
    const lengthByte = Buffer.from([0x05]); // Longueur du paquet
    const protocolByte = Buffer.from([protocolNumber]); // Numéro de protocole
    const serialBytes = Buffer.from([
        (serialNumber >> 8) & 0xFF, 
        serialNumber & 0xFF
    ]);
    
    // Calculer le checksum
    const packetWithoutChecksum = Buffer.concat([
        startBits, 
        lengthByte, 
        protocolByte, 
        serialBytes
    ]);
    
    const checksumValue = calculateChecksum(packetWithoutChecksum);
    const checksumBytes = Buffer.from([
        (checksumValue >> 8) & 0xFF, 
        checksumValue & 0xFF
    ]);
    
    const endBytes = Buffer.from([0x0D, 0x0A]); // End bits
    
    return Buffer.concat([
        startBits, 
        lengthByte, 
        protocolByte, 
        serialBytes, 
        checksumBytes, 
        endBytes
    ]);
}

function parseLoginPacket(buffer) {
    console.log('🔐 Parsing paquet de login');
    
    // Extraction des informations de login
    const protocolNumber = buffer[3];
    const loginData = buffer.slice(4, -2);
    
    console.log('Données de login (hexadécimal):', loginData.toString('hex'));
    
    // Extraction du numéro de série (2 derniers octets avant le checksum)
    const serialNumber = (buffer[buffer.length - 4] << 8) | buffer[buffer.length - 3];
    
    console.log('Numéro de série:', serialNumber);
    
    return {
        protocolNumber,
        serialNumber,
        loginData: loginData.toString('hex')
    };
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
                    
                    // Protocole
                    const protocolNumber = packetBuffer[3];

                    // Parsing selon le type de paquet
                    switch (protocolNumber) {
                        case 0x01: // Paquet de login
                            const loginInfo = parseLoginPacket(packetBuffer);
                            
                            // Enregistrer les informations de login
                            try {
                                const deviceEntry = new GpsData({
                                    deviceId: loginInfo.serialNumber.toString(),
                                    additionalInfo: {
                                        loginData: loginInfo.loginData,
                                        connectionInfo: {
                                            ip: socket.remoteAddress,
                                            port: socket.remotePort
                                        }
                                    },
                                    timestamp: new Date()
                                });
                                await deviceEntry.save();
                                console.log('💾 Informations de login enregistrées');
                            } catch (error) {
                                console.error('❌ Erreur lors de l\'enregistrement:', error);
                            }

                            // Répondre au tracker
                            const responsePacket = createResponsePacket(
                                protocolNumber, 
                                loginInfo.serialNumber
                            );
                            socket.write(responsePacket);
                            console.log('✅ Réponse envoyée au tracker');
                            break;

                        case 0x10: // Paquet de données GPS
                            console.log('🛰️ Paquet de données GPS détecté');
                            // Implémenter le parsing des données GPS ici
                            break;

                        default:
                            console.log(`❓ Protocole non supporté: ${protocolNumber}`);
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


