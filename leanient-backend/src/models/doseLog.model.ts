import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { DoseInjectionSite, DoseLogUnit } from "@leanient/shared";

export interface DoseLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  medicationProtocolId: Types.ObjectId;
  doseAmount: number;
  doseUnit: DoseLogUnit;
  injectionSite?: DoseInjectionSite;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const doseLogSchema = new Schema<DoseLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    medicationProtocolId: {
      type: Schema.Types.ObjectId,
      ref: "UserMedicationProtocol",
      required: true,
    },
    doseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    doseUnit: {
      type: String,
      enum: ["mg", "ml", "units", "mcg"],
      required: true,
    },
    injectionSite: {
      type: String,
      enum: [
        "abdomen_left",
        "abdomen_right",
        "thigh_left",
        "thigh_right",
        "arm_left",
        "arm_right",
        "buttock_left",
        "buttock_right",
      ],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

doseLogSchema.index({ userId: 1, recordedAt: -1 });
doseLogSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

export const DoseLogModel = mongoose.model<DoseLogDocument>("DoseLog", doseLogSchema);
