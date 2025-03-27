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
            if (typeof gt06.parse === 'function') {
                const parsedData = gt06.parse(hexData);
                console.log('📍 Données GPS reçues :', JSON.stringify(parsedData, null, 2));
            } else {
                console.error('❌ Erreur : la fonction gt06.parse() est introuvable.');
            }

            // 📌 Répondre avec un ACK valide pour GT06N
            const ack = Buffer.from('787805010001D9DC0D0A', 'hex'); // Exemple d'ACK pour un login
            socket.write(ack);
            console.log('✅ ACK envoyé au tracker.');

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
