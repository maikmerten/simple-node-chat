var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/chat', function(req, res){
	res.sendFile(__dirname + '/chat.html');
});

app.get('/jquery.js', function(req, res){
	res.sendFile(__dirname + '/jquery-3.3.1.min.js');
});

io.on('connection', function(socket){
  socket.on('disconnect', function(){
  });

  socket.on('chatMessage', function(msg){
    io.in(msg.room).emit('chatMessage', msg);
  });

  socket.on('joinRoom', function(room){
    socket.join(room);
  });

});


http.listen(9090, function(){
	console.log('node chat server listening on *:9090');
});
