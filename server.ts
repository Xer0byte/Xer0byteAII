import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Initialize DB
const dbFile = "app.db";
const db = new Database(dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    avatarColor TEXT
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    user_id INTEGER,
    role TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    description TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth routes
  app.post("/api/auth/signup", (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }
      
      const colors = ['#4a90e2', '#e24a4a', '#4ae285', '#e2a74a', '#9b4ae2'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      
      const stmt = db.prepare("INSERT INTO users (name, email, password, avatarColor) VALUES (?, ?, ?, ?)");
      const info = stmt.run(name, email, password, avatarColor);
      
      res.json({ id: info.lastInsertRowid, name, email, avatarColor });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Failed to sign up" });
      }
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT id, name, email, avatarColor FROM users WHERE email = ? AND password = ?").get(email, password);
      
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  // Conversations API
  app.get("/api/conversations", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.json([]);
      const convs = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(userId);
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", (req, res) => {
    try {
      const { userId, title } = req.body;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const stmt = db.prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)");
      const info = stmt.run(userId, title || "New Chat");
      res.json({ id: info.lastInsertRowid, title: title || "New Chat" });
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      db.prepare("DELETE FROM chat_messages WHERE conversation_id = ? AND user_id = ?").run(id, userId);
      db.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").run(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages API
  app.get("/api/messages", (req, res) => {
    try {
      const { userId, conversationId } = req.query;
      if (!userId || !conversationId) return res.json([]);
      const messages = db.prepare("SELECT * FROM chat_messages WHERE user_id = ? AND conversation_id = ? ORDER BY timestamp ASC").all(userId, conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", (req, res) => {
    try {
      const { userId, conversationId, role, text } = req.body;
      if (!userId || !conversationId) return res.status(400).json({ error: "Missing fields" });
      
      const stmt = db.prepare("INSERT INTO chat_messages (conversation_id, user_id, role, text) VALUES (?, ?, ?, ?)");
      const info = stmt.run(conversationId, userId, role, text);
      
      // Update conversation timestamp
      db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
      
      res.json({ id: info.lastInsertRowid, role, text });
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  app.delete("/api/messages", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      db.prepare("DELETE FROM chat_messages WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting messages:", error);
      res.status(500).json({ error: "Failed to delete messages" });
    }
  });

  // Projects API
  app.get("/api/projects", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.json([]);
      const projects = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", (req, res) => {
    try {
      const { userId, name, description, content } = req.body;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const stmt = db.prepare("INSERT INTO projects (user_id, name, description, content) VALUES (?, ?, ?, ?)");
      const info = stmt.run(userId, name, description, content);
      res.json({ id: info.lastInsertRowid, name, description, content });
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Tasks API
  app.get("/api/tasks", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.json([]);
      const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", (req, res) => {
    try {
      const { userId, title } = req.body;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const stmt = db.prepare("INSERT INTO tasks (user_id, title) VALUES (?, ?)");
      const info = stmt.run(userId, title);
      res.json({ id: info.lastInsertRowid, title, completed: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      db.prepare("UPDATE tasks SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Vite middleware for development
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
