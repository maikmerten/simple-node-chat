"use strict";

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/chat', function(req, res){
	res.sendFile(__dirname + '/chat.html');
});

app.get('/jquery.js', function(req, res){
	res.sendFile(__dirname + '/jquery-3.3.1.min.js');
});

function broadcastNames(room) {
  let names = [];
  Object.keys(io.sockets.sockets).forEach(function(id) {
    let sock = io.sockets.sockets[id];
    if(sock.mydata && sock.mydata.name && sock.mydata.room && sock.mydata.room == room) {
      names.push(sock.mydata.name);
    }
  })
  io.in(room).emit("updateNames", names);
}

io.on('connection', function(socket){
  socket.mydata = new Object();

  socket.on('disconnect', function(){
    broadcastNames(socket.mydata.room);
  });

  socket.on('chatMessage', function(msg){
    msg.name = socket.mydata.name;
    msg.date = Date.now();
    msg.room = socket.mydata.room;
    io.in(msg.room).emit('chatMessage', msg);
  });

  socket.on('joinRoom', function(room){
    socket.mydata.room = room;
    socket.join(room);
  });

  socket.on('updateName', function(name){
    socket.mydata.name = name;
    let room = socket.mydata.room;
    broadcastNames(room);
 
  });

});


http.listen(9090, function(){
	console.log('node chat server listening on *:9090');
});
