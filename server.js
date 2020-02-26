const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const PORT = 3000;

app.get('/', function(req, res) {
  res.render('index.ejs');
});

const chat = io.on('connection', function (client) {
  console.log('connected');
  client.emit('connected', 'aaaaaa');
});

// app.io.route('ready', function(req) {
//   req.io.join(req.data)
//   app.io.room(req.data).broadcast('announce', {
//     message: `New client in the ${req.data} room.`
//   })
// })

server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));