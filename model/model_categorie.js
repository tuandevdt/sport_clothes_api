const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        enum: ['club', 'national'],
        required: true
    },
    image: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Category = mongoose.model('categorie', categorySchema);

module.exports = Category;
