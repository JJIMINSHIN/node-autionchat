const SocketIO = require("socket.io");
const moment = require("moment");

module.exports = (server, app) => {
  const io = SocketIO(server, { path: "/socket.io" });
  app.set("io", io); //express var , route-socketio conn
  const room = io.of("/room");
  const chat = io.of("/chat");

  io.on("connection", (socket) => {
    // 웹 소켓 연결 시
    console.log("연결 확인");

    const req = socket.request;
    const {
      headers: { referer },
    } = req;
    const roomId = referer.split("/")[referer.split("/").length - 1];
    socket.join(roomId);

    room.on("connection", (socket) => {
      console.log("room 네임스페이스에 접속");
      socket.on("disconnect", () => {
        console.log("room 네임스페이스 접속 해제");
      });
    });
    chat.on("connection", (socket) => {
      console.log("chat 네임스페이스에 접속");
      const req = socket.request;
      const {
        headers: { referer },
      } = req;
      const roomId = referer
        .split("/")
        [referer.split("/").length - 1].replace(/\?.+/, "");
      socket.join(roomId);
      socket.to(roomId).emit("join", {
        user: "system",
        // chat: `${req.session.color}님이 입장하셨습니다.`,
      });
    });

     chat

    // front receive message
    // socket.on("chatting", (data) => {
    //   const { name, msg, time } = data;
    //   console.log(data);

    //   // back send message
    //   io.emit("chatting", {
    //     name,
    //     msg,
    //     time: moment(new Date()).format("h:ss A"),
    //   });
    // });
    // // chat

    socket.on("disconnect", () => {
       socket.leave(roomId);
     });
  });
};

//chat
