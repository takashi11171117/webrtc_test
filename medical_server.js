const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const PORT = 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.render('medical.ejs');
});

server.listen(process.env.PORT || PORT, () => console.log(`Example app listening on port ${PORT}!`));