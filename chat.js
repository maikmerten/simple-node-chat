"use strict";

var app = require('express')();
var http = require('http');
var passport = require('passport');
var bodyParser = require('body-parser');
var ldapStrategy = require('passport-ldapauth');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var crypto = require('crypto');
var whiskers = require('whiskers');
var fs = require('fs');

// local configuration, see config-example.js
let config = require("./config");
const tlsoptions = {
  key: fs.readFileSync(config.tlsconfig.key),
  cert: fs.readFileSync(config.tlsconfig.cert)
};


var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);


const secret = "yay!" + new Date().getTime();

passport.use(new ldapStrategy(config.ldapconfig));

app.use(cookieParser(secret));
const cookieExpirationDate = new Date();
const cookieExpirationDays = 365;
cookieExpirationDate.setDate(cookieExpirationDate.getDate() + cookieExpirationDays);
// required for passport session
app.use(session({
  secret: secret, // must match with the secret for cookie-parser
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: cookieExpirationDate // use expires instead of maxAge
  }
}));

app.engine('.html', whiskers.__express);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

var user_cache = {};
passport.serializeUser(function (user, next) {
  delete user.userCacheId;
  let id = crypto.createHmac('sha1', secret).update(JSON.stringify(user)).digest('hex');
  user.userCacheId = id;
  user_cache[id] = user;
  next(null, id);
});
passport.deserializeUser(function (id, next) {
  next(null, user_cache[id]);
});

function getUserDisplayName(user) {
  // TODO: make field configurable
  return user.cn;
}


function setSelectedRoom(request, room) {
  request.session.selectedRoom = room;
}


function getSelectedRoom(request) {
  let room = "lobby"
  if (request.session && request.session.selectedRoom) {
    room = request.session.selectedRoom;
  }
  return room;
}

function ensureAuthenticated(req, res, next) {
  if (req.query && req.query.room) {
    setSelectedRoom(req, req.query.room);
  }
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

app.post('/login',
  function (request, response, next) {
    passport.authenticate('ldapauth',
      function (err, user, info) {
        if (!user) {
          response.redirect("/login");
        } else {
          request.login(user, function (error) {
            if (error) return next(error);
            response.redirect("/chat");
          });
        }
      })(request, response, next);
  }
);

app.get('/logout', function (req, res) {
  delete user_cache[req.user.userCacheId];
  req.logout();
  res.redirect('/login');
});

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/loginform.html');
});

app.get('/chat', ensureAuthenticated, function (req, res) {
  res.render(__dirname + '/chat.html', {
    userid: req.user.userCacheId,
    room: getSelectedRoom(req)
  });
});

app.get('/chat.css', function (req, res) {
  res.sendFile(__dirname + '/chat.css');
});


app.get('/jquery.js', function (req, res) {
  res.sendFile(__dirname + '/jquery-3.3.1.min.js');
});

/**
 * Chat functionality using socket.io
 */

function broadcastNames(room) {
  let names = [];
  Object.keys(io.sockets.sockets).forEach(function (id) {
    let sock = io.sockets.sockets[id];
    if (sock.mydata && sock.mydata.name && sock.mydata.room && sock.mydata.room == room) {
      names.push(sock.mydata.name);
    }
  })
  io.in(room).emit("updateNames", names);
}

io.on('connection', function (socket) {
  socket.mydata = new Object();

  socket.on('disconnect', function () {
    broadcastNames(socket.mydata.room);
  });

  socket.on('chatMessage', function (msg) {
    msg.name = socket.mydata.name;
    msg.date = Date.now();
    msg.room = socket.mydata.room;
    if (config.showIP) {
      msg.ipaddr = socket.handshake.address;
    }
    io.in(msg.room).emit('chatMessage', msg);
  });

  socket.on('joinRoom', function (joinmsg) {
    let room = joinmsg.room;
    let user = user_cache[joinmsg.userid];
    if (user) {
      let name = getUserDisplayName(user);
      socket.mydata.room = joinmsg.room;
      socket.mydata.name = name;
      socket.join(room);
      broadcastNames(room);
    }
  });


});

httpServer.listen(9090, function () {
  console.log('node chat server listening on *:9090');
});



