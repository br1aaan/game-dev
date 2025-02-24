const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const morgan = require("morgan");
const winston = require("winston");
const notesRoutes = require("./routes/notes");

// Load environment variables
dotenv.config();

// Initialize Firebase
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan("combined"));

// Session setup for OAuth
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Logging setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.Console(),
  ],
});

// OAuth Configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// OAuth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    res.json({ message: "Authentication successful", user: req.user });
  }
);

// CRUD Routes for Notes
app.post("/notes", async (req, res) => {
  try {
    const { title, content } = req.body;
    const newNote = { title, content, createdAt: new Date() };
    const docRef = await db.collection("notes").add(newNote);
    res.json({ id: docRef.id, ...newNote });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.get("/notes", async (req, res) => {
  try {
    const snapshot = await db.collection("notes").get();
    const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(notes);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/notes/:id", async (req, res) => {
  try {
    const doc = await db.collection("notes").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

app.put("/notes/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    await db.collection("notes").doc(req.params.id).update({ title, content });
    res.json({ message: "Note updated successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    await db.collection("notes").doc(req.params.id).delete();
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
