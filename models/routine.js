const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// Routine Schema
const routineSchema = new mongoose.Schema({
    class: {
        type: String,
        required: true,
        unique: true // same class এ duplicate routine prevent করবে
    },
    rows: [
        {
            time: { type: String, required: true },
            subjects: [{ type: String }]
        }
    ]
}, { timestamps: true });

const Routine = mongoose.model("Routine", routineSchema);

// ✅ POST - Save routine (delete previous if same class exists)
router.post("/routine", async (req, res) => {
    try {
        const { className, rows } = req.body;

        if (!className || !rows || rows.length === 0) {
            return res.status(400).json({ error: "Class and routine data are required" });
        }

        // Delete old routine of the same class
        await Routine.deleteMany({ class: className });

        // Save new one
        const routine = new Routine({ class: className, rows });
        await routine.save();

        res.json({
            message: `✅ Routine for Class ${className} saved successfully! Previous routine deleted.`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ GET - Fetch all routines (for admin view)
router.get("/routine", async (req, res) => {
    try {
        const routines = await Routine.find().sort({ createdAt: -1 });
        res.json(routines);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ GET - Fetch routine for a specific class
router.get("/routine/class/:className", async (req, res) => {
    try {
        const className = req.params.className;
        const routine = await Routine.findOne({ class: className });

        if (!routine) {
            return res.status(404).json({ error: "No routine found for this class" });
        }

        res.json(routine);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ DELETE - Delete routine(s) for a specific class manually
router.delete("/routine/class/:className", async (req, res) => {
    try {
        const className = req.params.className;
        const result = await Routine.deleteMany({ class: className });

        res.json({
            message: `${result.deletedCount} routine(s) deleted for class ${className}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
