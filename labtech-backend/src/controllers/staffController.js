const Staff = require('../models/Staff');

async function createStaff(req, res) {
  try {
    const body = req.body || {};
    const doc = await Staff.create({
      name: body.name,
      role: body.role,
      email: body.email,
      phone: body.phone,
      cnic: body.cnic,
      salary: body.salary,
      lateDeduction: body.lateDeduction,
      earlyOutDeduction: body.earlyOutDeduction,
      leaveDeduction: body.leaveDeduction,
      joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
    });
    return res.status(201).json({ success: true, staff: doc });
  } catch (err) {
    console.error('createStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create staff' });
  }
}

async function listStaff(_req, res) {
  try {
    const list = await Staff.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, staff: list });
  } catch (err) {
    console.error('listStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list staff' });
  }
}

async function getStaff(req, res) {
  try {
    const { id } = req.params || {};
    const doc = await Staff.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, staff: doc });
  } catch (err) {
    console.error('getStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get staff' });
  }
}

async function updateStaff(req, res) {
  try {
    const { id } = req.params || {};
    const body = req.body || {};
    const doc = await Staff.findByIdAndUpdate(
      id,
      {
        $set: {
          name: body.name,
          role: body.role,
          email: body.email,
          phone: body.phone,
          cnic: body.cnic,
          salary: body.salary,
          lateDeduction: body.lateDeduction,
          earlyOutDeduction: body.earlyOutDeduction,
          leaveDeduction: body.leaveDeduction,
          joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
          isActive: body.isActive,
        },
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, staff: doc });
  } catch (err) {
    console.error('updateStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update staff' });
  }
}

async function deleteStaff(req, res) {
  try {
    const { id } = req.params || {};
    const doc = await Staff.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete staff' });
  }
}

module.exports = {
  createStaff,
  listStaff,
  getStaff,
  updateStaff,
  deleteStaff,
};
