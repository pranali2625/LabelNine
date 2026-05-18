const mongoose = require('mongoose');

const sizeStockSchema = new mongoose.Schema({
  size: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
  stock: { type: Number, required: true, min: 0, default: 0 }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  variety: {
    type: String,
    required: [true, 'Variety is required'],
    enum: [
      'Classic White Formal',
      'Oxford Button-Down',
      'Slim Fit Solid',
      'Casual Linen',
      'Printed Heritage'
    ]
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least 1']
  },
  discountedPrice: {
    type: Number,
    default: null
  },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String }
  }],
  sizes: [sizeStockSchema],
  fabric: { type: String },
  fit: { type: String, enum: ['Regular', 'Slim', 'Relaxed', 'Oversized'] },
  color: { type: String },
  care: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  tags: [{ type: String }]
}, { timestamps: true });

// Auto-generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }
  next();
});

// Virtual: total stock
productSchema.virtual('totalStock').get(function () {
  return this.sizes.reduce((sum, s) => sum + s.stock, 0);
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
