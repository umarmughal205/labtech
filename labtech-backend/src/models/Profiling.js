const mongoose = require('mongoose');

// Patient profiling collection
// Stores longitudinal history per patient (by CNIC/phone) for lab usage
const profilingSchema = new mongoose.Schema(
  {
    // Optional reference to a registered user (patient)
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

    // Identity
    name: { type: String, required: true, trim: true },
    cnic: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },

    // Aggregated info
    numberOfVisits: { type: Number, default: 0 },
    lastVisitDate: { type: Date },

    // Sample history at a high level
    sampleTypes: [{ type: String, trim: true }],

    // Free-text clinical / history notes
    profilingNotes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'profiling' }
);

module.exports = mongoose.model('Profiling', profilingSchema);
