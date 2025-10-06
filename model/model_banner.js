const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    banner: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Banner = mongoose.model('banner', bannerSchema);

module.exports = Banner;
