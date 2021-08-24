const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const schedule = require("node-schedule");
const Room = require("../schemas/room");
const Chat = require("../schemas/chat");

const { Good, Auction, User, sequelize } = require("../models");
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const { route } = require("./auth");

// router
const router = express.Router();

// 로그인했으면 render했을 때 user에다가 회원정보 기입
router.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// 기본 화면
router.get("/", async (req, res, next) => {
  try {
    const goods = await Good.findAll({ where: { SoldId: null } });
    res.render("main", {
      title: "NodeAuction",
      goods,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});
// 채팅방
router.get("/", (req, res) => {
  res.render("main");
});

//router
router.get("/", (req, res) => {
  res.render("index");
});

//채팅방 라우터
router.get("/chat", async (req, res, next) => {
  try {
    const rooms = await Room.find({});
    res.render("chatmain", { rooms, title: "채팅방" });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room", (req, res) => {
  res.render("room", { title: "채팅방 생성" });
});

router.post("/room", async (req, res, next) => {
  try {
    const newRoom = await Room.create({
      title: req.body.title,
      max: req.body.max,
      // owner: req.session.color,
      password: req.body.password,
    });
    const io = req.app.get("io");
    io.of("/room").emit("newRoom", newRoom);
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room/:id", async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id });
    const io = req.app.get("io");
    if (!room) {
      return res.redirect("/?error=존재하지 않는 방입니다.");
    }
    if (room.password && room.password !== req.query.password) {
      return res.redirect("/?error=비밀번호가 틀렸습니다.");
    }
    const { rooms } = io.of("/chat").adapter;
    if (
      rooms &&
      rooms[req.params.id] &&
      room.max <= rooms[req.params.id].length
    ) {
      return res.redirect("/?error=허용 인원이 초과하였습니다.");
    }
    const chats = await Chat.find({ room: room._id }).sort("createdAt");
    return res.render("chat", {
      room,
      title: room.title,
      chats,
      user: req.session.color,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

// router.delete("/room/:id", async (req, res, next) => {
//   try {
//     await Room.remove({ _id: req.params.id });
//     await Chat.remove({ room: req.params.id });
//     res.send("ok");
//     setTimeout(() => {
//       req.app.get("io").of("/room").emit("removeRoom", req.params.id);
//     }, 2000);
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// });

router.post("/room/:id/chat", async (req, res, next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });
    await chat.save();
    req.app.get("io").of("/chat").to(req.params.id).emit("chat", chat);
    res.send("ok");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

try {
  fs.readdirSync("uploads");
} catch (err) {
  console.error("uploads 폴더가 없어 uploads 폴더를 생성합니다.");
  fs.mkdirSync("uploads");
}
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, "uploads/");
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      done(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
router.post("/room/:id/gif", upload.single("gif"), async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.color,
      gif: req.file.filename,
    });
    req.app.get("io").of("/chat").to(req.params.id).emit("chat", chat);
    res.send("ok");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 회원가입 화면
router.get("/join", isNotLoggedIn, (req, res) => {
  res.render("join", {
    title: "회원가입 - NodeAuction",
  });
});

// 상품 등록 화면
router.get("/good", isLoggedIn, (req, res) => {
  res.render("good", { title: "상품 등록 - NodeAuction" });
});

// 상품 업로드
try {
  fs.readdirSync("uploads");
} catch (err) {
  console.error("uploads 폴더가 없어 uploads 폴더를 생성합니다.");
  fs.mkdirSync("uploads");
}

/*
// 상품 업로드 - 이미지 (multer)
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, "uploads/");
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(
        null,
        path.basename(file.originalname, ext) + new Date().valueOf() + ext
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
*/

// 상품 업로드
router.post(
  "/good",
  isLoggedIn,
  upload.single("img"),
  async (req, res, next) => {
    try {
      const { name, price } = req.body;
      await Good.create({
        OwnerId: req.user.id,
        name,
        img: req.file.filename,
        price,
      });
      const end = new Date();
      end.setDate(end.getDate() + 1); // 하루 뒤
      schedule.scheduleJob(end, async () => {
        const t = await sequelize.transaction();
        try {
          const success = await Auction.findOne({
            where: { GoodId: good.id },
            order: [["bid", "DESC"]],
            transaction: t,
          });
          await Good.update(
            { SoldId: success.UserId },
            { where: { id: good.id }, transaction: t }
          );
          await User.update(
            {
              money: sequelize.literal(`money - ${success.bid}`),
            },
            {
              where: { id: success.UserId },
              transaction: t,
            }
          );
          await t.commit();
        } catch (err) {
          await t.rollback();
        }
      });
      res.redirect("/");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

router.get("/good/:id", isLoggedIn, async (req, res, next) => {
  try {
    const [good, auction] = await Promise.all([
      Good.findOne({
        where: { id: req.params.id },
        include: {
          model: User,
          as: "Owner",
        },
      }),
      Auction.findAll({
        where: { goodId: req.params.id },
        include: { model: User },
        order: [["bid", "ASC"]],
      }),
    ]);
    res.render("auction", {
      title: `${good.name} - NodeAuction`,
      good,
      auction,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/good/:id/bid", isLoggedIn, async (req, res, next) => {
  try {
    const { bid, msg } = req.body;
    const good = await Good.findOne({
      where: { id: req.params.id },
      include: { model: Auction },
      order: [[{ model: Auction }, "bid", "DESC"]],
    });
    if (good.price >= bid) {
      return res.status(403).send("시작 가격보다 높게 입찰해야 합니다.");
    }
    if (new Date(good.createdAt).valueOf() + 24 * 60 * 60 * 1000 < new Date()) {
      return res.status(403).send("경매가 이미 종료되었습니다");
    }
    if (good.Auctions[0] && good.Auctions[0].bid >= bid) {
      return res.status(403).send("이전 입찰가보다 높아야 합니다");
    }
    const result = await Auction.create({
      bid,
      msg,
      UserId: req.user.id,
      GoodId: req.params.id,
    });
    // 실시간으로 입찰 내역 전송
    req.app.get("io").to(req.params.id).emit("bid", {
      bid: result.bid,
      msg: result.msg,
      nick: req.user.nick,
    });
    return res.send("ok");
  } catch (err) {
    console.error(err);
    return next(err);
  }
});

router.get("/list", isLoggedIn, async (req, res, next) => {
  try {
    const goods = await Good.findAll({
      where: { SoldId: req.user.id },
      include: { model: Auction },
      oreder: [[{ model: Auction }, "bid", "DESC"]],
    });
    res.render("list", { title: "낙찰 목록 - NodeAuction", goods });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
