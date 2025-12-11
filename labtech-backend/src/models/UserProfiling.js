const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    tests: [{ type: String, trim: true }],
    sample: { type: mongoose.Schema.Types.ObjectId, ref: 'Sample' },
    sampleNumber: { type: String, trim: true },
    status: { type: String, trim: true },
  },
  { _id: false }
);

const userProfilingSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    cnic: { type: String, trim: true, index: true, sparse: true, unique: false },
    phone: { type: String, trim: true, index: true, sparse: true },
    gender: { type: String, trim: true },
    age: { type: String, trim: true },
    address: { type: String, trim: true },

    visitCount: { type: Number, default: 0 },
    lastVisited: { type: Date },

    visits: [visitSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfiling', userProfilingSchema);
