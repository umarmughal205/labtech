const Profiling = require('../models/Profiling');

// GET /api/lab/profiling - list all profiling records (basic info)
async function listProfiling(req, res) {
  try {
    const items = await Profiling.find({}).sort({ updatedAt: -1 }).lean();

    return res.json({
      success: true,
      items: items.map((p) => ({
        id: String(p._id),
        name: p.name,
        cnic: p.cnic,
        phone: p.phone,
        numberOfVisits: p.numberOfVisits || 0,
        lastVisitDate: p.lastVisitDate || null,
        sampleTypes: Array.isArray(p.sampleTypes) ? p.sampleTypes : [],
        profilingNotes: p.profilingNotes || '',
      })),
    });
  } catch (err) {
    console.error('listProfiling error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/lab/profiling/lookup?cnic=...&phone=...
// Used by Sample Intake to prefill patient details from profiling
async function lookupProfiling(req, res) {
  try {
    const { cnic, phone } = req.query || {};

    if (!cnic && !phone) {
      return res.status(400).json({ success: false, message: 'cnic or phone is required' });
    }

    const filter = [];
    if (cnic) filter.push({ cnic: String(cnic) });
    if (phone) filter.push({ phone: String(phone) });

    const p = await Profiling.findOne(filter.length > 1 ? { $or: filter } : filter[0]).lean();

    if (!p) {
      return res.status(404).json({ success: false, message: 'Profiling record not found' });
    }

    return res.json({
      success: true,
      item: {
        id: String(p._id),
        name: p.name,
        cnic: p.cnic,
        phone: p.phone,
        numberOfVisits: p.numberOfVisits || 0,
        lastVisitDate: p.lastVisitDate || null,
        sampleTypes: Array.isArray(p.sampleTypes) ? p.sampleTypes : [],
        profilingNotes: p.profilingNotes || '',
      },
    });
  } catch (err) {
    console.error('lookupProfiling error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/lab/profiling/:id - get single profiling record
async function getProfiling(req, res) {
  try {
    const { id } = req.params;
    const p = await Profiling.findById(id).lean();

    if (!p) {
      return res.status(404).json({ success: false, message: 'Profiling record not found' });
    }

    return res.json({
      success: true,
      item: {
        id: String(p._id),
        name: p.name,
        cnic: p.cnic,
        phone: p.phone,
        numberOfVisits: p.numberOfVisits || 0,
        lastVisitDate: p.lastVisitDate || null,
        sampleTypes: Array.isArray(p.sampleTypes) ? p.sampleTypes : [],
        profilingNotes: p.profilingNotes || '',
      },
    });
  } catch (err) {
    console.error('getProfiling error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/lab/profiling - create new profiling record
async function createProfiling(req, res) {
  try {
    const { name, cnic, phone, numberOfVisits, lastVisitDate, sampleTypes, profilingNotes } = req.body || {};

    if (!name || !cnic || !phone) {
      return res.status(400).json({ success: false, message: 'name, cnic and phone are required' });
    }

    const doc = await Profiling.create({
      name,
      cnic,
      phone,
      numberOfVisits: typeof numberOfVisits === 'number' ? numberOfVisits : 0,
      lastVisitDate: lastVisitDate ? new Date(lastVisitDate) : undefined,
      sampleTypes: Array.isArray(sampleTypes) ? sampleTypes : [],
      profilingNotes: profilingNotes || '',
    });

    return res.status(201).json({ success: true, id: String(doc._id) });
  } catch (err) {
    console.error('createProfiling error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PUT /api/lab/profiling/:id - update existing profiling record
async function updateProfiling(req, res) {
  try {
    const { id } = req.params;
    const { name, cnic, phone, numberOfVisits, lastVisitDate, sampleTypes, profilingNotes } = req.body || {};

    const update = {};
    if (typeof name === 'string') update.name = name;
    if (typeof cnic === 'string') update.cnic = cnic;
    if (typeof phone === 'string') update.phone = phone;
    if (typeof numberOfVisits === 'number') update.numberOfVisits = numberOfVisits;
    if (lastVisitDate) update.lastVisitDate = new Date(lastVisitDate);
    if (Array.isArray(sampleTypes)) update.sampleTypes = sampleTypes;
    if (typeof profilingNotes === 'string') update.profilingNotes = profilingNotes;

    const doc = await Profiling.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Profiling record not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('updateProfiling error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  listProfiling,
  getProfiling,
  createProfiling,
  updateProfiling,
  lookupProfiling,
};
