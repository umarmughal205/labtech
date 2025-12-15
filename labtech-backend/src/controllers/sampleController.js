const Sample = require('../models/Sample');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const Counter = require('../models/Counter');

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

    let patientId = '';
    try {
      const next = await Counter.findOneAndUpdate(
        { _id: 'patientId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      ).lean();
      const n = next && typeof next.seq === 'number' ? next.seq : 1;
      patientId = `LP${String(n).padStart(2, '0')}`;
    } catch (e) {
      patientId = 'LP01';
    }

    const sample = await Sample.create({
      sampleNumber,
      patientId,
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

    const update = { status };
    if (Array.isArray(body.results)) {
      update.results = body.results;
    }
    if (typeof body.interpretation === 'string') {
      update.interpretation = body.interpretation;
    }
    // Persist per-test interpretations when provided
    if (Array.isArray(body.interpretations)) {
      update.interpretations = body.interpretations;
    } else if (Array.isArray(body.testInterpretations)) {
      update.interpretations = body.testInterpretations;
    }
    if (status === 'completed') {
      update.completedAt = new Date();
    }

    const updated = await Sample.findOneAndUpdate(
      query,
      update,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    if (Array.isArray(body.results) && body.results.length) {
      try {
        const editExisting = !!body.editExisting;
        const trQuery = { sample: updated._id };
        const existing = await TestResult.findOne(trQuery).sort({ createdAt: -1 });
        const payload = {
          sample: updated._id,
          sampleNumber: updated.sampleNumber,
          patientName: updated.patientName,
          phone: updated.phone,
          age: updated.age,
          gender: updated.gender,
          address: updated.address,
          cnic: updated.cnic,
          tests: (updated.tests || []).map((t) => ({ name: t.name, test: t.test })),
          results: body.results,
          interpretation: update.interpretation || updated.interpretation || '',
          interpretations: update.interpretations || updated.interpretations || [],
          status,
        };
        if (editExisting || existing) {
          if (existing) {
            await TestResult.updateOne({ _id: existing._id }, payload);
          } else {
            await TestResult.create(payload);
          }
        } else {
          await TestResult.create(payload);
        }
      } catch (err) {
        console.error('Failed to upsert TestResult entry', err);
      }
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating sample status:', err);
    return res.status(500).json({ message: 'Failed to update sample status' });
  }
}

// GET /api/labtech/samples/:id - fetch single sample by Mongo _id or sampleNumber
async function getSampleById(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { sampleNumber: id };

    const sample = await Sample.findOne(query).lean();
    if (!sample) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    return res.json(sample);
  } catch (err) {
    console.error('Error fetching sample by id:', err);
    return res.status(500).json({ message: 'Failed to fetch sample' });
  }
}

// GET /api/labtech/samples/:id/test-result - latest test_result by sample _id or sampleNumber
async function getLatestTestResult(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    // Try direct lookup on TestResult
    let tr = await TestResult.findOne(isObjectId ? { sample: id } : { sampleNumber: id })
      .sort({ createdAt: -1 })
      .lean();
    if (!tr && isObjectId) {
      // Attempt via sampleNumber if sample exists
      const sample = await Sample.findOne({ _id: id }).lean();
      if (sample && sample.sampleNumber) {
        tr = await TestResult.findOne({ sampleNumber: sample.sampleNumber })
          .sort({ createdAt: -1 })
          .lean();
      }
    }
    if (!tr) return res.status(404).json({ message: 'No test result found for this sample' });
    return res.json(tr);
  } catch (err) {
    console.error('Error fetching latest test result:', err);
    return res.status(500).json({ message: 'Failed to fetch test result' });
  }
}

module.exports = {
  createSample,
  getSamples,
  updateSampleStatus,
  getSampleById,
  getLatestTestResult,
};
