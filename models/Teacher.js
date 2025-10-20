const { Schema, model } = require('mongoose');

const TeacherSchema = new Schema({

    name: { type: String, required: true },
    email: String,
    phone: String,
    subject: String,
    photo: String
}, { timestamps: true });

module.exports = model('Teacher', TeacherSchema);
