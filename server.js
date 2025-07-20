const express = require("express");
var cors = require("cors");
let http = require("http");
var bcrypt = require("bcrypt");
const app = express();
app.use(cors());

// const corsOptions = {
//   origin: true, // frontend URL here
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   optionsSuccessStatus: 200
// };
//app.use(cors(corsOptions));  
// app.options('*', cors(corsOptions)); // for preflight support


app.use(express.json());



app.use(express.urlencoded({ extended: true }));
//server static files

app.use(express.static("public"));


app.use("/", require("./app/middlewares/auth"));
app.use("/", require("./app/middlewares/responseTimeMiddleware"));

const db = require("./app/models");

let routes = require("./app/routes");

db.mongoose.set("strictQuery", false);
db.mongoose
  .connect(db.url, {})
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to  CommunityTrips" });
});

app.use("/", routes);

// var usersData = {
//   fullName: "fawda",
//   password: "123456789",
//   email: "fawda@yopmail.com",
//   role: "admin",
//   status: "active",
//   isVerified: "Y",
// };

// const seedDb = async () => {
//   if ((await db.users.countDocuments()) == 0) {

//     console.log(usersData.password);
//     usersData.password = await bcrypt.hashSync(
//       usersData.password,
//       bcrypt.genSaltSync(10)
//     );

//     await db.users.create(usersData);
//   }
// };
// seedDb();
const PORT = process.env.PORT || 6969;

let startServer = http.createServer(app);
startServer.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}.`);
});
module.exports = app;
