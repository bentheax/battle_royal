var app = require("express")();
var _ = require("lodash");
var http = require("http").Server(app);
var io = require("socket.io")(http);
var port = process.env.PORT || 3000;
var clients = {};
// TODO: `loot` should be a hash with the `id` as the key.
var loot = _.times(10, function() {
  return {
    id: Math.random().toString(),
    x: _.random(0, 2047),
    y: _.random(0, 2047),
  }
});

app.get("*", function(req, res) {
  if (req.path === "/") {
    res.sendFile(__dirname + "/index.html");
  } else {
    res.sendFile(__dirname + req.path);
  }
});

io.on("connection", function(socket) {
  socket.on("announce", function(player) {
    clients[player.name] = { name: player.name, socket: socket.id, health: 5, alive: true };
  });

  socket.on("moved", function(locationMsg) {
    player = clients[locationMsg.id];

    if (!player) {
      return;
    }

    player.location = {
      x: locationMsg.x,
      y: locationMsg.y
    };
  });

  socket.on("shotsFired", function(payload) {
    console.log("Shot fired!", payload)
    io.emit("shotsFired", payload)
  });

  socket.on("gotLoot", function(payload) {
    loot = _.reject(loot, function(l) {
      return l.id === payload.lootId
    })
  })

  socket.on("playerHit", function(msg) {
    clients[msg.playerId].health -= 1;
    io.emit("playerHit", msg);
  });

  socket.on("playerDead", function(msg) {
    clients[msg.playerId].health = 0;
    clients[msg.playerId].alive = false;
    io.emit("playerDead", msg);
  });

  socket.on("disconnect", function() {
    console.log(`Disconnecting ${socket.id}`)
    var newClients = {}
    for (var client_id in clients) {
      if (clients[client_id].socket != socket.id) {
        newClients[client_id] = clients[client_id]
      }
    }
    clients = newClients
  });
});

setInterval(function() {
  let playersRemainingCount = _.filter(clients, (client) => (client.alive)).length

  io.emit("worldUpdated", {
    clients,
    loot,
    playersRemainingCount,
  });
}, 1000 / 60);

http.listen(port, function() {
  console.log("listening on *:" + port);
});
