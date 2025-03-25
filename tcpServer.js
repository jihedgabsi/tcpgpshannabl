const net	= require('net');
const gt06 = require('./gt06n.js').gt06;

const server = net.createServer((connection) => {
    connection.setEncoding('hex');
    connection.on('data', (data) => {
        let result = gt06.parseLocation(data);

    });
}).listen(5000);
