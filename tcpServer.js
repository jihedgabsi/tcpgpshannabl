const net = require('net');
const gt06 = require('./gt06n'); // Vérifie si le module gt06n est bien défini

const PORT = 5000;

const server = net.createServer((socket) => {
    console.log(`✅ Nouvelle connexion : ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        try {
            if (!data || data.length === 0) {
                console.warn('⚠️ Données vides reçues, ignorées.');
                return;
            }

            // Convertir le buffer en une chaîne hexadécimale
            const hexData = data.toString('hex').toUpperCase();
            console.log(`📥 Données reçues (HEX) : ${hexData}`);

            // Parser les données GPS avec la bibliothèque gt06
            let parsedData;
            if (typeof gt06.parse === 'function') {
                parsedData = gt06.parse(hexData);
                console.log('📍 Données GPS reçues :', JSON.stringify(parsedData, null, 2));
            } else {
                console.error('❌ Erreur : la fonction gt06.parse() est introuvable.');
                return;
            }

            // Générer un ACK approprié en fonction du type d'événement
            let ack;
            const event = parsedData.event;
           
            // Extraire le numéro de séquence (les derniers bytes avant 0D0A)
            // Pour la plupart des paquets, le numéro de séquence est les 2 octets avant 0D0A
            const seqNumber = hexData.substring(hexData.length - 6, hexData.length - 4);
           
            if (event === '01') {
                // ACK pour login
                ack = Buffer.from(`78780501${seqNumber}0D0A`, 'hex');
            } else {
                // ACK standard pour les autres types d'événements (12, 13, 16, etc.)
                ack = Buffer.from(`78780501${seqNumber}0D0A`, 'hex');
            }

            socket.write(ack);
            console.log(`✅ ACK envoyé au tracker: ${ack.toString('hex').toUpperCase()}`);

        } catch (error) {
            console.error('❌ Erreur lors du parsing des données GPS :', error);
        }
    });

    socket.on('error', (error) => {
        console.error(`⚠️ Erreur socket (${socket.remoteAddress}): ${error.message}`);
    });

    socket.on('close', () => {
        console.log(`🔌 Connexion fermée : ${socket.remoteAddress}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur GT06N démarré sur le port ${PORT}`);
});

// Gestion des erreurs globales
server.on('error', (error) => {
    console.error(`❌ Erreur serveur : ${error.message}`);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 Erreur critique non gérée :', error);
});
