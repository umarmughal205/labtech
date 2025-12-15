const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const InventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: CategorySchema, required: false },
    currentStock: { type: Number, default: 0 },
    minThreshold: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    costPerUnit: { type: Number, default: 0 },
    supplier: { type: String, default: '' },
    location: { type: String, default: '' },
    expiryDate: { type: Date },
    lastRestocked: { type: Date },

    // Optional fields used by UI for packs/unit pricing
    packs: { type: Number },
    itemsPerPack: { type: Number },
    salePricePerPack: { type: Number },
    salePricePerUnit: { type: Number },
    buyPricePerPack: { type: Number },
    invoiceNumber: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
