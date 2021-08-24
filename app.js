const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const nunjucks = require("nunjucks");
const dotenv = require("dotenv");

// dotenv
dotenv.config();

// router
const connect = require("./schemas");
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");

// model
const { sequelize } = require("./models");

// passport
const passportConfig = require("./passport");

// websocket, sse
const sse = require("./sse");
const webSocket = require("./socket");

// checkauction
const checkAuction = require("./checkAuction");
const Socket = require("./socket");

// server
const app = express();
passportConfig();
checkAuction();
app.set("port", process.env.PORT || 8010);
app.set("view engine", "html");
app.enable('trust proxy');
nunjucks.configure("views", {
  express: app,
  watch: true,
});

connect();

// app.use((req, res, next) => {
//   if (!req.session.color) {
//     const colorHash = new ColorHash();
//     req.session.color = colorHash.hex(req.sessionID);
//   }
//   next();
// });

// db
sequelize
  .sync({ force: true })
  .then(() => {
    console.log("데이터베이스 연결 성공");
  })
  .catch((err) => {
    console.error(err);
  });

// sessionMiddleware 분리 - 웹소켓과 연결
const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
});

// log.requests
app.use(morgan("dev"));

// static
app.use(express.static(path.join(__dirname, "public")));
app.use("/img", express.static(path.join(__dirname, "uploads")));
app.use("/gif", express.static(path.join(__dirname, "uploads")));

// data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// cookie
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(sessionMiddleware);

// const wrap = (middleware) => (socket, next) =>
//   middleware(socket.request, {}, next);
// app.use(wrap(cookieParser(process.env.COOKIE_SECRET)));
// app.use(wrap(sessionMiddleware));

app.use(passport.initialize());
app.use(passport.session());

//chat
app.use(express.static(path.join(__dirname, "src")));

/* io.on("connection",(socket)=>{

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
*/

// router_connect
app.use("/", indexRouter);
app.use("/auth", authRouter);

// no router - 404
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});

// error page
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== "production" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// port
const server = app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중");
});

webSocket(server, app, sessionMiddleware);
sse(server);
