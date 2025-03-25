const net = require('net');
const gt06 = require('./gt06n'); // Assuming the previous code is in gt06_parser.js

const PORT = 5000;

const server = net.createServer((socket) => {
    console.log(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        try {
            // Convert buffer to hexadecimal string
            const hexData = data.toString('hex').toUpperCase();
            
            // Parse the received GPS data
            const parsedData = gt06.parse(hexData);
            
            console.log('Received GPS Data:', JSON.stringify(parsedData, null, 2));

            // You can add additional logic here, such as:
            // - Storing the data in a database
            // - Sending alerts
            // - Forwarding to other services

            // Optional: Send acknowledgment back to the tracker
            // The exact acknowledgment depends on the GT06N protocol specifics
            const ack = Buffer.from('OK', 'ascii');
            socket.write(ack);
        } catch (error) {
            console.error('Error parsing GPS data:', error);
        }
    });

    socket.on('error', (error) => {
        console.error(`Socket error: ${error.message}`);
    });

    socket.on('close', () => {
        console.log(`Connection from ${socket.remoteAddress} closed`);
    });
});

server.listen(PORT, () => {
    console.log(`GT06N GPS Server listening on port ${PORT}`);
});

// Error handling for server
server.on('error', (error) => {
    console.error(`Server error: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
