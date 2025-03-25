const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

dotenv.config();
connectDB();

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');
    let buffer = '';

    socket.on('data', async data => {
        // Conversion des données en chaîne
        const receivedData = data.toString();
        
        // Log des données brutes reçues
        console.log('----------------------------');
        console.log('Données brutes reçues (raw):');
        console.log(receivedData);
        console.log('Longueur des données:', receivedData.length);
        console.log('Représentation hexadécimale:');
        console.log(Buffer.from(receivedData).toString('hex'));
        console.log('Représentation ASCII:');
        console.log(JSON.stringify(receivedData));
        console.log('----------------------------');

        buffer += receivedData;
        
        try {
            // Tentative de parsing JSON
            const jsonData = JSON.parse(buffer);
            
            // Réinitialisation du buffer après parsing réussi
            buffer = '';

            console.log('Données JSON parsées avec succès :');
            console.log(JSON.stringify(jsonData, null, 2));

            // Reste du code de traitement des données GPS (comme précédemment)
            if (jsonData.deviceId && jsonData.latitude && jsonData.longitude) {
                try {
                    const existingGpsEntry = await GpsData.findOne({ deviceId: jsonData.deviceId });

                    if (existingGpsEntry) {
                        await GpsData.updateOne(
                            { deviceId: jsonData.deviceId },
                            { 
                                latitude: jsonData.latitude, 
                                longitude: jsonData.longitude, 
                                speed: jsonData.speed || 0,
                                updatedAt: new Date() 
                            }
                        );
                        console.log("Données GPS mises à jour !");
                    } else {
                        const gpsEntry = new GpsData({
                            deviceId: jsonData.deviceId,
                            latitude: jsonData.latitude,
                            longitude: jsonData.longitude,
                            speed: jsonData.speed || 0
                        });
                        await gpsEntry.save();
                        console.log("Nouvelles données GPS enregistrées !");
                    }
                } catch (error) {
                    console.error("Erreur lors de l'enregistrement des données GPS :", error);
                }
            } else {
                console.log("Données JSON incomplètes");
            }
        } catch (parseError) {
            console.log("Erreur de parsing JSON :");
            console.log(parseError.message);
            console.log("Buffer actuel :", buffer);
        }
    });

    socket.on('error', err => {
        console.error("Erreur socket :", err);
    });

    socket.on('end', () => {
        console.log("Connexion terminée");
        buffer = ''; // Réinitialiser le buffer
    });
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
