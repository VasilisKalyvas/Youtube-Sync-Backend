import http from "http";
import path from "path";
import { Server } from "socket.io";
import express from "express";

const app = express();
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "/frontend/build/index.html"));
});

const httpServer = http.Server(app);

const io = new Server(httpServer, { cors: { origin: "*" } });
const users = [];
const rooms = [];

const getRoomUsers = (room) => {
  return users.filter((user) => user.room === room);
};

const removeUser = (id) => {
  const findIdx = users.findIndex((user) => user.socketId == id);

  if (findIdx >= 0) {
    return users.splice(findIdx, 1)[0];
  }
};

const removeRoom = (id) => {
  const findIdx = rooms.findIndex((room) => room == id);

  if (findIdx >= 0) {
    return rooms.splice(findIdx, 1)[0];
  }
};

let currentRoom = "";
let roomId = "";
let CurrentUser = {};
let videoLink = "";
let isSubmit;

io.on("connection", (socket) => {
  io.emit("rooms", rooms);
  
  socket.on("join_room", (data) => {
    roomId = data.roomName;
    socket.join(roomId);
    
    if (!rooms.find((room) => room === roomId)) {
      rooms.push(roomId);
    }

    CurrentUser = {
      name: data.username,
      room: data.roomName,
      socketId: socket.id,
    };

    const welcome = `Welcome ${data.username} in room ${roomId}`;
    const messageSystem = {
      from: "System",
      body: welcome,
    };
    io.sockets.in(roomId).emit("messages", messageSystem);
    users.push(CurrentUser);
    io.sockets.in(roomId).emit("online", getRoomUsers(roomId));
    io.emit("rooms", rooms);
    if (currentRoom === CurrentUser.room) {
      io.sockets
        .in(currentRoom)
        .emit("video", { videoLink, isSubmit, currentRoom });
    }
  });

  io.sockets.in(roomId).emit("online", getRoomUsers(roomId));

  socket.on("messages", (data) => {
    socket.broadcast.to(roomId).emit("messages", data);
  });
  socket.on("onVideoLink", (data) => {
    videoLink = data.video;
    isSubmit = data.submit;
    currentRoom = data.currentRoom;
    io.sockets
      .in(currentRoom)
      .emit("video", { videoLink, isSubmit, currentRoom });
  });

  socket.on("onVideoStatus", (data) => {
    io.sockets
      .in(data.currentRoom)
      .emit("videoStatus", {
        status: data.status,
        currentRoom: data.currentRoom,
      });
  });

  socket.on("onSecondsChange", (data) => {
    io.sockets
      .in(data.currentRoom)
      .emit("secondsChange", {
        time: data.time,
        currentRoom: data.currentRoom,
      });
  });
  console.log(getRoomUsers(roomId).length);

  socket.on("disconnect", () => {
    const left = `${CurrentUser.name} left the room`;
    const messageSystem = {
      from: "System",
      body: left,
    };
    io.sockets.in(roomId).emit("messages", messageSystem);
    removeUser(CurrentUser.socketId);
    if(getRoomUsers(roomId).length === 0){
      removeRoom(roomId);
    }
    console.log(rooms)
    io.emit("rooms", rooms);
    io.sockets.in(roomId).emit("online", getRoomUsers(roomId));
  });
  console.log(rooms);
  io.sockets.in(roomId).emit("online", getRoomUsers(roomId));
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server started at Port:${PORT}`);
});
