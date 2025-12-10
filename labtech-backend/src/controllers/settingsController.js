const Settings = require('../models/Settings');

// GET /api/settings - get single global settings document
async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings', err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
}

// PUT /api/settings - update global settings document
async function updateSettings(req, res) {
  try {
    const payload = req.body || {};

    const settings = await Settings.findOneAndUpdate({}, payload, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(settings);
  } catch (err) {
    console.error('Error updating settings', err);
    res.status(400).json({ message: 'Failed to update settings' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
