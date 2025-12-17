const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    type: { type: String, enum: ['purchase', 'adjustment', 'sale', 'return'], required: true, index: true },

    // Quantities
    unitsDelta: { type: Number, required: true }, // positive for purchase, negative for sale/return
    packs: { type: Number, min: 0 },
    itemsPerPack: { type: Number, min: 1 },

    // Pricing snapshot (per pack)
    buyPricePerPack: { type: Number, min: 0 },
    salePricePerPack: { type: Number, min: 0 },

    // Derived unit prices (for history)
    costPerUnit: { type: Number, min: 0 },
    salePricePerUnit: { type: Number, min: 0 },

    // References
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    referenceId: { type: String, trim: true }, // e.g., PO id
    invoiceNumber: { type: String, trim: true },
    expiryDate: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ referenceId: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
