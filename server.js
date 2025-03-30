require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Define Mongoose Schema
const sensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  pressure: Number,
  light: Number,
  ds18b20_temp: Number,
  aqi: Number,
  uv_index: Number,
  timestamp: { type: Date, default: Date.now },
});

// Model
const SensorData = mongoose.model("SensorData", sensorDataSchema);

// 📥 API Endpoint to Receive Data from NodeMCU
app.post("/api/data", async (req, res) => {
  try {
    const { temperature, humidity, pressure, light, ds18b20_temp, aqi, uv_index } = req.body;

    // Validate Data
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: "Missing required data fields" });
    }

    // Get the latest data entry
    const lastEntry = await SensorData.findOne().sort({ timestamp: -1 });

    // Check if 15 minutes have passed since the last stored entry
    if (lastEntry) {
      const timeDiff = (Date.now() - lastEntry.timestamp) / (1000 * 60); // Convert ms to minutes
      if (timeDiff < 15) {
        return res.status(200).json({ message: "Data ignored (too soon)" });
      }
    }

    // Save new data
    const newEntry = new SensorData({
      temperature,
      humidity,
      pressure,
      light,
      ds18b20_temp,
      aqi,
      uv_index,
    });
    await newEntry.save();

    console.log("📡 Data stored:", req.body);
    res.status(201).json({ message: "Data stored successfully" });
  } catch (err) {
    console.error("❌ Error saving data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📤 API Endpoint to Fetch Data for Frontend
app.get("/api/data", async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
