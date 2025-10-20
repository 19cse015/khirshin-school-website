const { Schema, model } = require('mongoose');

const GallerySchema = new Schema({
    title: { type: String, required: true },
    filename: String
}, { timestamps: true });

module.exports = model('Gallery', GallerySchema);
