const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: String,
  subject: String,
  email: String,
  phone: String,
  photo: String,
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
