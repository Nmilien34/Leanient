import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { DoseUnit, Weekday } from "@leanient/shared";

export interface UserMedicationProtocolDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  medicationCatalogId?: Types.ObjectId;
  medicationName: string;
  customMedicationName?: string;
  doseAmount?: number;
  doseUnit: DoseUnit;
  shotDays: Weekday[];
  /**
   * Legacy single shot day from before split-dose support. Kept readable so
   * documents written by the old schema still load; new writes use shotDays.
   * Resolve with resolveShotDays() rather than reading either field directly.
   */
  shotDay?: Weekday;
  startDate: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userMedicationProtocolSchema = new Schema<UserMedicationProtocolDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    medicationCatalogId: {
      type: Schema.Types.ObjectId,
      ref: "MedicationCatalogItem",
    },
    medicationName: {
      type: String,
      required: true,
      trim: true,
    },
    customMedicationName: {
      type: String,
      trim: true,
    },
    doseAmount: {
      type: Number,
      min: 0,
    },
    doseUnit: {
      type: String,
      enum: ["mg", "units"],
      required: true,
    },
    shotDays: {
      type: [String],
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
      validate: {
        validator: (days: string[]) => Array.isArray(days) && days.length > 0,
        message: "shotDays must contain at least one day",
      },
    },
    // Legacy single-day field. Optional so old documents still load; never
    // written by new code. Read via resolveShotDays().
    shotDay: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const UserMedicationProtocolModel = mongoose.model<UserMedicationProtocolDocument>(
  "UserMedicationProtocol",
  userMedicationProtocolSchema,
);

/**
 * Resolve a protocol's shot days, bridging legacy single-day documents. New docs
 * store shotDays; documents written before split-dose support only have the
 * legacy shotDay scalar. Always returns the canonical array.
 */
export function resolveShotDays(
  protocol: Pick<UserMedicationProtocolDocument, "shotDays" | "shotDay">,
): Weekday[] {
  if (Array.isArray(protocol.shotDays) && protocol.shotDays.length > 0) {
    return protocol.shotDays;
  }
  return protocol.shotDay ? [protocol.shotDay] : [];
}
