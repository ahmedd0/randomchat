const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.json());
app.use(cors({
    "Access-Control-Allow-Origin": "http://localhost:4200"  // Replace with your actual front-end origin
}));

app.use("/uploads", express.static("uploads"));

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send("welcome");
});
// Set to store all connected socket IDs
let connectedSockets = new Set([]);
let sockets = new Set([]);
// Handle socket connections
io.on('connection', socket => {
    socket.removeAllListeners('message');

    // Add the socket ID to the set of connected sockets
    connectedSockets.add(socket.id);
    sockets.add(socket.id);
    io.emit('users', Array.from(connectedSockets)
    )

    // If there are at least two sockets connected, pair them randomly
    if (connectedSockets.size >= 2) {
        const randomSocketIds = getRandomSocketIds();
        const [firstSocketId, secondSocketId] = randomSocketIds;
        // Notify the paired sockets
        io.to(firstSocketId).emit('paired', { message: 'You are now connected with a stranger!', partner: secondSocketId });
        io.to(secondSocketId).emit('paired', { message: 'You are now connected with a stranger!', partner: firstSocketId });
        // Remove the paired sockets from the set (optional)
        connectedSockets.delete(firstSocketId);
        connectedSockets.delete(secondSocketId);
        setupUnpairedListener(firstSocketId, secondSocketId);
        setupUnpairedListener(secondSocketId, firstSocketId);

    }

    // Handle incoming messages
    socket.on('message', data => {
        // Get the socket of the receiver
        if (sockets.has(data.sender)) {
            io.to(data.sender).emit('message', { sender: data.sender, message: data.message });
            // Send the message only to the receiver
        } else {
            console.log('Receiver is not connected');

        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        connectedSockets.delete(socket.id);
        sockets.delete(socket.id);
        io.emit('users', Array.from(connectedSockets))

    });
});

// Function to generate two random socket IDs
function getRandomSocketIds() {
    const socketIds = Array.from(connectedSockets);
    const firstIndex = Math.floor(Math.random() * socketIds.length);
    let secondIndex = Math.floor(Math.random() * socketIds.length);
    while (secondIndex === firstIndex) {
        secondIndex = Math.floor(Math.random() * socketIds.length);
    }
    return [socketIds[firstIndex], socketIds[secondIndex]];
}
function setupUnpairedListener(firstSocketId, secondSocketId) {
    io.sockets.sockets.get(firstSocketId).on('unpaired', () => {
        connectedSockets.add(firstSocketId);
        connectedSockets.add(secondSocketId);
        io.to(secondSocketId).emit('unpaired', { message: 'Your Partner Left!' });
    });
}
// Start the server
server.listen(8080, () => {
    console.log(`Server started on port 8080}`);
});