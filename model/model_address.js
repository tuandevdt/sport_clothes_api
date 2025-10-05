const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  province: { type: String, required: true },
  district: { type: String, required: true },
  commune: { type: String, required: true },
  receivingAddress: { type: String, required: true },
  phone: { type: Number, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  gps: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
}, {
  timestamps: true
});

const Address = mongoose.model('address', addressSchema);
module.exports = Address;
