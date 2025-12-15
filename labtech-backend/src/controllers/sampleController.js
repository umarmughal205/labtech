const Sample = require('../models/Sample');
const Test = require('../models/Test');
const Profiling = require('../models/Profiling');
const InventoryItem = require('../models/InventoryItem');

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
    // Decrease inventory stock for used consumables
    try {
      if (Array.isArray(consumables) && consumables.length) {
        for (const c of consumables) {
          if (!c || !c.item) continue;
          try {
            const item = await InventoryItem.findById(c.item);
            if (!item) continue;
            const qty = Number(c.quantity) || 0;
            if (qty <= 0) continue;
            const current = Number(item.currentStock) || 0;
            const nextStock = Math.max(0, current - qty);
            item.currentStock = nextStock;
            await item.save();
          } catch (invErr) {
            console.error('Error updating inventory for consumable usage:', invErr);
          }
        }
      }
    } catch (invOuterErr) {
      console.error('Error in consumables inventory update block:', invOuterErr);
      // Do not fail main request because of inventory issues
    }
    // Update or create profiling record based on CNIC/phone
    try {
      if (body.cnic || body.phone) {
        const filter = [];
        if (body.cnic) filter.push({ cnic: body.cnic });
        if (body.phone) filter.push({ phone: body.phone });
        const now = new Date();

        const testsNames = Array.isArray(tests)
          ? tests.map((t) => t && t.name).filter(Boolean)
          : [];

        const existing = await Profiling.findOne(filter.length > 1 ? { $or: filter } : filter[0]);
        if (existing) {
          const set = new Set(Array.isArray(existing.sampleTypes) ? existing.sampleTypes : []);
          for (const n of testsNames) set.add(n);
          existing.sampleTypes = Array.from(set);
          existing.numberOfVisits = (existing.numberOfVisits || 0) + 1;
          existing.lastVisitDate = now;
          if (!existing.name && body.patientName) existing.name = body.patientName;
          if (!existing.cnic && body.cnic) existing.cnic = body.cnic;
          if (!existing.phone && body.phone) existing.phone = body.phone;
          await existing.save();
        } else {
          await Profiling.create({
            name: body.patientName || 'Unknown',
            cnic: body.cnic || '',
            phone: body.phone || '',
            numberOfVisits: 1,
            lastVisitDate: now,
            sampleTypes: testsNames,
            profilingNotes: '',
          });
        }
      }
    } catch (profilingErr) {
      console.error('Error updating profiling from sample:', profilingErr);
      // Do not fail main request because of profiling issues
    }

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
