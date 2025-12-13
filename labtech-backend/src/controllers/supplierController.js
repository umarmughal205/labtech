const Supplier = require('../models/Supplier');

function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// GET /api/lab/suppliers
async function listSuppliers(req, res) {
  try {
    const { q, status } = req.query || {};
    const { limit, skip } = parsePagination(req);
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (q && String(q).trim()) {
      const s = String(q).trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { contactPerson: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
      ];
    }
    const [rows, total] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ]);
    return res.json({ success: true, rows, total, pageSize: limit });
  } catch (err) {
    console.error('listSuppliers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list suppliers' });
  }
}

// GET /api/lab/suppliers/:id
async function getSupplier(req, res) {
  try {
    const doc = await Supplier.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, supplier: doc });
  } catch (err) {
    console.error('getSupplier error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get supplier' });
  }
}

// POST /api/lab/suppliers
async function createSupplier(req, res) {
  try {
    const body = req.body || {};
    const doc = await Supplier.create({
      name: body.name,
      contactPerson: body.contactPerson,
      email: body.email,
      phone: body.phone,
      address: body.address,
      products: Array.isArray(body.products) ? body.products : (typeof body.products === 'string' ? body.products.split(',').map(s=>s.trim()).filter(Boolean) : []),
      contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : undefined,
      contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : undefined,
      status: body.status,
      notes: body.notes,
    });
    return res.status(201).json({ success: true, supplier: doc });
  } catch (err) {
    console.error('createSupplier error:', err);
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Supplier name must be unique' });
    return res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
}

// PUT /api/lab/suppliers/:id
async function updateSupplier(req, res) {
  try {
    const body = req.body || {};
    const update = {
      name: body.name,
      contactPerson: body.contactPerson,
      email: body.email,
      phone: body.phone,
      address: body.address,
      products: Array.isArray(body.products) ? body.products : (typeof body.products === 'string' ? body.products.split(',').map(s=>s.trim()).filter(Boolean) : undefined),
      contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : undefined,
      contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : undefined,
      status: body.status,
      notes: body.notes,
    };
    const doc = await Supplier.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, supplier: doc });
  } catch (err) {
    console.error('updateSupplier error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
}

// DELETE /api/lab/suppliers/:id
async function deleteSupplier(req, res) {
  try {
    const doc = await Supplier.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteSupplier error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
