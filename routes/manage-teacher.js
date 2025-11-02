const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Teacher = require('../models/Teacher');



router.post('/add-teacher', upload.single('photo'), async (req, res) => {
  try {
    let photoUrl = '';
    let publicId = '';

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'teachers' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      photoUrl = result.secure_url;
      publicId = result.public_id;
    }

    const teacher = new Teacher({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      subject: req.body.subject,
      photo: photoUrl,
      cloudinary_id: publicId,
    });

    await teacher.save();
    res.json({ message: 'Teacher added successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding teacher' });
  }
});

// 🔄 Update Teacher
router.put('/update-teacher/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Teacher updated successfully!', teacher });
  } catch (err) {
    res.status(500).json({ message: 'Error updating teacher' });
  }
});

// 🧾 Fetch all Teachers
router.get('/teachers', async (req, res) => {
  const teachers = await Teacher.find();
  res.json(teachers);
});

// ❌ Delete Teacher (Cloudinary + MongoDB)
router.delete('/delete-teacher/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.json({ message: 'Teacher not found' });

    if (teacher.cloudinary_id) {
      await cloudinary.uploader.destroy(teacher.cloudinary_id);
    }

    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted successfully (Cloudinary + DB)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting teacher' });
  }
});

module.exports = router;
