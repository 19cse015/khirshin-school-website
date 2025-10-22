const { Schema, model } = require('mongoose');

const GallerySchema = new Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true } // Cloudinary Image URL
}, { timestamps: true });

module.exports = model('Gallery', GallerySchema);
