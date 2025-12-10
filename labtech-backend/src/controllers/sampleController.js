const Sample = require('../models/Sample');
const Test = require('../models/Test');

function generateSampleNumber(year, seq) {
  const num = String(seq).padStart(3, '0');
  return `LAB-${year}-${num}`;
}

// POST /api/labtech/samples
async function createSample(req, res) {
  try {
    const body = req.body || {};

    const testsIds = Array.isArray(body.tests) ? body.tests : [];
    const tests = [];

    if (testsIds.length) {
      const testDocs = await Test.find({ _id: { $in: testsIds } }).lean();
      const testMap = new Map(testDocs.map((t) => [String(t._id), t]));
      for (const id of testsIds) {
        const key = String(id);
        const doc = testMap.get(key);
        if (doc) {
          tests.push({ test: doc._id, name: doc.name, price: doc.price || 0 });
        }
      }
    }

    const consumables = Array.isArray(body.consumables)
      ? body.consumables.map((c) => ({
          item: c.item,
          quantity: Number(c.quantity) || 1,
        }))
      : [];

    const now = new Date();
    const year = now.getFullYear();
    const prefix = `LAB-${year}-`;

    const lastSample = await Sample.findOne({ sampleNumber: { $regex: `^${prefix}` } })
      .sort({ sampleNumber: -1 })
      .lean();

    let nextSeq = 1;
    if (lastSample && typeof lastSample.sampleNumber === 'string') {
      const tail = lastSample.sampleNumber.slice(-3);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    const sampleNumber = generateSampleNumber(year, nextSeq);

    const rawStatus = typeof body.status === 'string' ? body.status.toLowerCase() : '';
    let status = 'collected';
    if (rawStatus.includes('collect')) status = 'collected';
    else if (rawStatus.includes('process')) status = 'processing';
    else if (rawStatus.includes('complet')) status = 'completed';
    else if (rawStatus.includes('cancel')) status = 'cancelled';

    const sample = await Sample.create({
      sampleNumber,
      patientName: body.patientName,
      phone: body.phone,
      age: body.age,
      gender: body.gender,
      address: body.address,
      guardianRelation: body.guardianRelation,
      guardianName: body.guardianName,
      cnic: body.cnic,
      tests,
      consumables,
      totalAmount: Number(body.totalAmount) || 0,
      priority: body.priority || 'normal',
      status,
    });

    return res.status(201).json(sample);
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.sampleNumber) {
      console.error('Duplicate sampleNumber when creating sample:', err.keyValue);
      return res.status(409).json({ message: 'A sample with this sampleNumber already exists. Please retry.' });
    }
    console.error('Error creating sample:', err);
    return res.status(500).json({ message: 'Failed to create sample' });
  }
}

// GET /api/labtech/samples
async function getSamples(_req, res) {
  try {
    const samples = await Sample.find().sort({ createdAt: -1 }).lean();
    return res.json(samples);
  } catch (err) {
    console.error('Error fetching samples:', err);
    return res.status(500).json({ message: 'Failed to fetch samples' });
  }
}

async function updateSampleStatus(req, res) {
  try {
    const { id } = req.params || {};
    const body = req.body || {};

    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }

    const raw = typeof body.status === 'string' ? body.status : body.sampleStatus;
    const rawLower = typeof raw === 'string' ? raw.toLowerCase() : '';
    let status = 'collected';
    if (rawLower.includes('collect')) status = 'collected';
    else if (rawLower.includes('process')) status = 'processing';
    else if (rawLower.includes('complet')) status = 'completed';
    else if (rawLower.includes('cancel')) status = 'cancelled';

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { sampleNumber: id };

    const updated = await Sample.findOneAndUpdate(
      query,
      { status },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating sample status:', err);
    return res.status(500).json({ message: 'Failed to update sample status' });
  }
}

module.exports = {
  createSample,
  getSamples,
  updateSampleStatus,
};
