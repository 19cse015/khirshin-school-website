const { Schema, model } = require('mongoose');

const TeacherSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    photo: { type: String } // Cloudinary URL রাখার জন্য
}, { timestamps: true });

module.exports = model('Teacher', TeacherSchema);
