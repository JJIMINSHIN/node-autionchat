"use strict";

const router = require("./auth");

//메세지 강제로 보내기

const nickname = document.querySelector("#nickname");
const chatList = document.querySelector(".chatting-list");
const chatInput = document.querySelector(".chatting-input");
const sendButton = document.querySelector(".send-button");

sendButton.addEventListener("click", () => {
  //전송할내용 오브젝트로 만들기
  const param = {
    name: nickname.value,
    msg: chatInput.value,
  };
  socket.emit("chatting", param);
});

//서버에서 받은메세지를 콘솔에 출력
socket.on("chatting", (data) => {
  const { name, msg, time } = data;
  const item = new LiModel(data.name, data.msg, data.time);
  item.makeLi();
});

//li꾸미기
function LiModel(name, msg, time) {
  this.name = name;
  this.msg = msg;
  this.time = time;

  this.makeLi = () => {
    const li = document.createElement("li");
    li.classList.add(nickname.value === this.name ? "sent" : "received");
    const dom = `<span class="profile">
        <span class="user">${this.name}</span>
        <img src="https://placeimg.com/50/50/any" alt="any">
        </span>
        <span class="message">${this.msg}</span>
        <span class="time">${this.time}</span>`;
    li.innerHTML = dom;
    chatList.appendChild(li);
  };
}

//router
router.get("/", (req, res) => {
  res.render("index");
});
