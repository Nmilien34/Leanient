import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { DoseUnit } from "@leanient/shared";

export interface MedicationCatalogItemDocument extends Document<Types.ObjectId> {
  slug: string;
  genericName: string;
  brandNames: string[];
  drugClass: "glp_1" | "dual_glp_1_gip" | "other";
  doseUnits: DoseUnit[];
  supportedDoseValues: number[];
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const medicationCatalogItemSchema = new Schema<MedicationCatalogItemDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    brandNames: {
      type: [String],
      default: [],
    },
    drugClass: {
      type: String,
      enum: ["glp_1", "dual_glp_1_gip", "other"],
      required: true,
    },
    doseUnits: {
      type: [String],
      enum: ["mg", "units"],
      default: ["mg"],
    },
    supportedDoseValues: {
      type: [Number],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const MedicationCatalogItemModel = mongoose.model<MedicationCatalogItemDocument>(
  "MedicationCatalogItem",
  medicationCatalogItemSchema,
);
