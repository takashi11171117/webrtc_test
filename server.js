const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const port = 3000;

app.get('/', function(req, res) {
  res.render('index.ejs');
});

const chat = io.on('connection', function (client) {
  client.emit('connected');

  client.on('init', function(req) {
    client.join(req.room);
    // chat.to(req.room).emit('message', req.name + ' さんが入室');
    client.broadcast.to(req.room).emit('announce', {
      message: `New client in the ${req.room} room.`
    })
  });

  client.on('send', function(req) {
    client.broadcast.to(req.room).emit('message', {
      message: req.message,
      author: req.author
    })
  });
});

server.listen(port, () => console.log(`Example app listening on port ${port}!`));