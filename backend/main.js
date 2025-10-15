require("dotenv").config();
const express = require("express");
const router = require("./routes/router");
const cors = require("cors");
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,
  })
);
app.use("/api", router);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("server is running on port 1900");
});
