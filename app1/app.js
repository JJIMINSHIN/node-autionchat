const express = require("express")
const http =require("http")
const app = express();
const path = require("path")
const server = http.createServer(app);
const socketIO = require("socket.io");
const moment =require("moment")
const io =socketIO(server);

app.use(express1.static(path.join(__dirname,"src")));

const PORT = process.env.PORT || 8010; //서버실행

io.on("connection",(socket)=>{

    socket.on("chatting",(data) => {
        console.log(data);
        const { name, msg} = data;
        //클라이언트에게 되돌려주기
        io.emit("chatting",{
            name,
            msg,
            time: moment(new Date()).format("h: mm A")
        });
    })


})

server.listen(PORT, () =>console.log(`server is running ${PORT}`)) //포트 실행








