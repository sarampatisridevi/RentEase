const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/connect.js");

const recommendRoute = require("./routes/recommend");
const chatRoute = require("./routes/chat");
const notifyRoute = require("./routes/notify");

const app = express();

//////dotenv config/////////////////////
dotenv.config();

const PORT = process.env.PORT || 8001;

// ---- middleware first (CORS must come before routes) ----
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- routes ----
app.use("/api/notify", notifyRoute);
app.use("/api/recommend", recommendRoute);
app.use("/api/ai", chatRoute);

app.use('/api/user', require('./routes/userRoutes.js'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/owner', require('./routes/ownerRoutes'))

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});