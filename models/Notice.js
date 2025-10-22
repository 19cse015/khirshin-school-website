const { Schema, model } = require('mongoose');

const NoticeSchema = new Schema({
    title: { type: String, required: true },
    category: { type: String, required: true }, // e.g., "exam", "admission"
    pdf_file: { type: String, required: true } // Cloudinary PDF URL
}, { timestamps: true });

module.exports = model('Notice', NoticeSchema);
