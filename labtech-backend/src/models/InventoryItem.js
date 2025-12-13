const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    unit: { type: String, required: true, trim: true },

    // Stock & thresholds
    currentStock: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 0, min: 0 },

    // Pack configuration (optional)
    itemsPerPack: { type: Number, min: 1 },

    // Pricing
    buyPricePerPack: { type: Number, min: 0 },
    salePricePerPack: { type: Number, min: 0 },
    costPerUnit: { type: Number, min: 0, default: 0 },
    salePricePerUnit: { type: Number, min: 0 },

    // References & metadata
    invoiceNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    location: { type: String, trim: true },
    lastRestocked: { type: Date },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ supplier: 1 });
inventoryItemSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
