const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    description: { type: String, trim: true }, // used if item not created yet
    packs: { type: Number, min: 0, required: true },
    itemsPerPack: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true }, // unit or pack price depending on UI; store unit price preferred
    isPackPrice: { type: Boolean, default: false }, // if true, unitPrice refers to pack price
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poId: { type: String, trim: true, unique: true, index: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    orderDate: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['Pending', 'Delivered', 'Cancelled'], default: 'Pending', index: true },
    items: { type: [poItemSchema], default: [] },
    totalAmount: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },
    // Receive tracking
    receivedLines: {
      type: [
        new mongoose.Schema(
          {
            item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
            packs: { type: Number, min: 0 },
            itemsPerPack: { type: Number, min: 1 },
            buyPricePerPack: { type: Number, min: 0 },
            salePricePerPack: { type: Number, min: 0 },
            invoiceNumber: { type: String, trim: true },
            expiryDate: { type: Date },
            movementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
