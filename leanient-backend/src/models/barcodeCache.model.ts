import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

/**
 * A resolved barcode lookup, cached so repeat scans of the same product serve
 * from our DB instead of re-hitting an external food API. Shared across all
 * users (a barcode is universal), so once anyone scans a product everyone
 * benefits. Most valuable once a rate-limited source (Nutritionix) is in play.
 */
export interface BarcodeCacheDocument extends Document {
  code: string;
  source: string;
  name: string;
  protein: number;
  calories: number;
  components: { name: string; protein: number; calories: number }[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema = new Schema(
  { name: String, protein: Number, calories: Number },
  { _id: false },
);

const barcodeCacheSchema = new Schema<BarcodeCacheDocument>(
  {
    code: { type: String, required: true, unique: true },
    source: { type: String, required: true },
    name: { type: String, required: true },
    protein: { type: Number, required: true },
    calories: { type: Number, required: true },
    components: { type: [componentSchema], default: [] },
    confidence: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Refresh cached products 90 days after their last write, so source corrections
// (e.g. an Open Food Facts entry getting better data) eventually propagate.
barcodeCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const BarcodeCacheModel =
  (mongoose.models.BarcodeCache as mongoose.Model<BarcodeCacheDocument>) ??
  mongoose.model<BarcodeCacheDocument>("BarcodeCache", barcodeCacheSchema);
