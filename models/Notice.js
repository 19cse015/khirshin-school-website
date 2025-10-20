const { Schema, model } = require('mongoose');

const NoticeSchema = new Schema({
    title: { type: String, required: true },
    category: String,
    pdf_file: String
}, { timestamps: true });

module.exports = model('Notice', NoticeSchema);
