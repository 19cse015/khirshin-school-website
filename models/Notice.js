const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    pdf_file: { type: String },
    pdf_public_id: { type: String }, // Cloudinary public ID
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
