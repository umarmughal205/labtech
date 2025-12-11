const Appointment = require('../models/Appointment');
const Sample = require('../models/Sample');
const UserProfiling = require('../models/UserProfiling');

// GET /api/profiling/search?name=&cnic=&service=
// Returns aggregated patient history across Appointments, Samples, and UserProfiling
async function searchProfiling(req, res) {
  try {
    const { name = '', cnic = '', service = '' } = req.query || {};

    const nameRegex = name ? new RegExp(String(name).trim(), 'i') : null;
    const cnicRegex = cnic ? new RegExp(String(cnic).trim(), 'i') : null;
    const serviceRegex = service ? new RegExp(String(service).trim(), 'i') : null;

    const apptFilter = {};
    if (nameRegex) apptFilter.patientName = nameRegex;
    if (cnicRegex) apptFilter.cnic = cnicRegex;
    if (serviceRegex) apptFilter.testName = serviceRegex;

    const sampleFilter = {};
    if (nameRegex) sampleFilter.patientName = nameRegex;
    if (cnicRegex) sampleFilter.cnic = cnicRegex;
    if (serviceRegex) sampleFilter['tests.name'] = serviceRegex;

    // Optionally include profiling matches
    const profileFilter = {};
    if (cnicRegex) profileFilter.cnic = cnicRegex;
    if (!cnicRegex && nameRegex) profileFilter.name = nameRegex;

    const [appointments, samples, profiles] = await Promise.all([
      Appointment.find(apptFilter).sort({ createdAt: -1 }).lean(),
      Sample.find(sampleFilter).sort({ createdAt: -1 }).lean(),
      Object.keys(profileFilter).length ? UserProfiling.find(profileFilter).sort({ updatedAt: -1 }).lean() : Promise.resolve([]),
    ]);

    return res.json({ success: true, appointments, samples, profiles });
  } catch (err) {
    console.error('Profiling search error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/profiling/lookup?cnic=&phone=
// Returns a single profiling record (if any) for autofill
async function lookupProfiling(req, res) {
  try {
    const { cnic = '', phone = '' } = req.query || {};
    const q = {};
    if (cnic && String(cnic).trim()) q.cnic = String(cnic).trim();
    else if (phone && String(phone).trim()) q.phone = String(phone).trim();

    if (!Object.keys(q).length) {
      return res.status(400).json({ success: false, message: 'Provide cnic or phone' });
    }

    const doc = await UserProfiling.findOne(q).lean();
    if (!doc) return res.json({ success: true, profile: null });
    return res.json({ success: true, profile: doc });
  } catch (err) {
    console.error('Profiling lookup error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { searchProfiling, lookupProfiling };
