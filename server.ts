import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const MONGODB_URI = process.env.MONGODB_URI || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// MongoDB Connection
async function connectDB() {
  let uri = MONGODB_URI;
  if (!uri || !uri.startsWith('mongodb')) {
    console.log("MONGODB_URI not provided or invalid. Starting in-memory MongoDB for preview...");
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }
  
  mongoose.connect(uri)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));
}
connectDB();

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarColor: { type: String, default: "#4a90e2" }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: "New Chat" },
  updatedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

// Middleware
app.use(cors());
app.use(express.json());

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied. Token missing." });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token." });
    req.user = user;
    next();
  });
};

// Gemini Setup
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
const chatModel = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  systemInstruction: "You are Grok by xAI: helpful, witty, truthful, maximum truth-seeking AI built by xAI."
});

const imageModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-image"
});

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const colors = ['#4a90e2', '#e24a4a', '#4ae285', '#e2a74a', '#9b4ae2'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const user = new User({ name, email, password: hashedPassword, avatarColor });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name, email, avatarColor } });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatarColor: user.avatarColor } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Chat Route
app.post("/api/chat", authenticateToken, async (req: any, res) => {
  try {
    const { conversationId, text, history, image } = req.body;
    const userId = req.user.id;

    if (!text && !image) return res.status(400).json({ error: "Message text or image is required" });

    // Save user message
    const userMsg = new Message({ conversationId, userId, role: 'user', text: text || "[Image attached]" });
    await userMsg.save();

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    // Format history for Gemini
    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = chatModel.startChat({ history: chatHistory });
    
    const parts: any[] = [];
    if (text) parts.push({ text });
    if (image) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }

    const result = await chat.sendMessage(parts);
    const aiText = result.response.text();

    // Save AI message
    const aiMsg = new Message({ conversationId, userId, role: 'ai', text: aiText });
    await aiMsg.save();

    res.json({ text: aiText });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

app.post("/api/generate-image", authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const result = await imageModel.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return res.json({ imageUrl });
        }
      }
    }
    
    res.status(500).json({ error: "No image generated in response" });
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// Conversations API
app.get("/api/conversations", authenticateToken, async (req: any, res) => {
  try {
    const convs = await Conversation.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(convs.map(c => ({ id: c._id, title: c.title, updated_at: c.updatedAt })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/api/conversations", authenticateToken, async (req: any, res) => {
  try {
    const { title } = req.body;
    const conv = new Conversation({ userId: req.user.id, title: title || "New Chat" });
    await conv.save();
    res.json({ id: conv._id, title: conv.title });
  } catch (error) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.delete("/api/conversations/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    await Message.deleteMany({ conversationId: id, userId: req.user.id });
    await Conversation.deleteOne({ _id: id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Messages API
app.get("/api/messages", authenticateToken, async (req: any, res) => {
  try {
    const { conversationId } = req.query;
    const messages = await Message.find({ userId: req.user.id, conversationId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Projects API
app.get("/api/projects", authenticateToken, async (req: any, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/api/projects", authenticateToken, async (req: any, res) => {
  try {
    const { name, description, content } = req.body;
    const project = new Project({ userId: req.user.id, name, description, content });
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Tasks API
app.get("/api/tasks", authenticateToken, async (req: any, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", authenticateToken, async (req: any, res) => {
  try {
    const { title } = req.body;
    const task = new Task({ userId: req.user.id, title });
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.patch("/api/tasks/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    await Task.findOneAndUpdate({ _id: id, userId: req.user.id }, { completed });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Vite / Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
