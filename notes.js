const express = require("express");
const router = express.Router();

// Create a new note
router.post("/", async (req, res) => {
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

// Get all notes
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("notes").get();
    const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(notes);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Get a single note by ID
router.get("/:id", async (req, res) => {
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

// Update a note
router.put("/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    await db.collection("notes").doc(req.params.id).update({ title, content });
    res.json({ message: "Note updated successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// Delete a note
router.delete("/:id", async (req, res) => {
  try {
    await db.collection("notes").doc(req.params.id).delete();
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
