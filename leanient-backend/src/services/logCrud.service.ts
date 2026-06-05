import type { Model, Types, Document } from "mongoose";
import type { LogListQuery } from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";

interface LogDocumentBase extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

export interface DailyLogService<TCreate, TPatch, TResponse> {
  create(userId: string, body: TCreate): Promise<TResponse>;
  list(userId: string, query?: LogListQuery): Promise<TResponse[]>;
  getById(userId: string, id: string): Promise<TResponse>;
  update(userId: string, id: string, patch: TPatch): Promise<TResponse>;
  softDelete(userId: string, id: string): Promise<TResponse>;
}

interface LogServiceConfig<TDocument extends LogDocumentBase, TResponse> {
  model: Model<TDocument>;
  serialize: (document: TDocument) => TResponse;
  name: string;
}

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_LIMIT = 100;

function isIdempotencyDuplicate(error: unknown): error is MongoDuplicateKeyError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as MongoDuplicateKeyError;
  return maybeError.code === 11000 && Boolean(maybeError.keyPattern?.idempotencyKey);
}

function dateRange(query?: LogListQuery): { from: Date; to: Date; limit: number } {
  const to = query?.to ? new Date(query.to) : new Date();
  const from =
    query?.from ??
    new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return {
    from: new Date(from),
    to,
    limit: query?.limit ?? DEFAULT_LIMIT,
  };
}

function normalizePatch(patch: Record<string, unknown>): Record<string, unknown> {
  if (typeof patch.recordedAt !== "string") {
    return patch;
  }

  return {
    ...patch,
    recordedAt: new Date(patch.recordedAt),
  };
}

export function createDailyLogService<TDocument extends LogDocumentBase, TCreate, TPatch, TResponse>(
  config: LogServiceConfig<TDocument, TResponse>,
): DailyLogService<TCreate, TPatch, TResponse> {
  async function findExistingForIdempotency(
    userId: string,
    idempotencyKey: unknown,
  ): Promise<TDocument | null> {
    if (typeof idempotencyKey !== "string") {
      return null;
    }

    return config.model.findOne({
      userId,
      idempotencyKey,
      deletedAt: null,
    });
  }

  return {
    async create(userId, body) {
      const data = body as Record<string, unknown>;

      try {
        const document = await config.model.create({
          ...data,
          userId,
          recordedAt: new Date(data.recordedAt as string),
          deletedAt: null,
        } as unknown as Partial<TDocument>);

        return config.serialize(document);
      } catch (error) {
        if (!isIdempotencyDuplicate(error)) {
          throw error;
        }

        const existing = await findExistingForIdempotency(userId, data.idempotencyKey);

        if (existing) {
          return config.serialize(existing);
        }

        throw new AppError({
          code: ERROR_CODES.conflict,
          message: `${config.name} idempotency key is already used by a deleted log`,
          statusCode: 409,
        });
      }
    },

    async list(userId, query) {
      const range = dateRange(query);
      const documents = await config.model
        .find({
          userId,
          deletedAt: null,
          recordedAt: {
            $gte: range.from,
            $lte: range.to,
          },
        })
        .sort({ recordedAt: -1 })
        .limit(range.limit);

      return documents.map(config.serialize);
    },

    async getById(userId, id) {
      const document = await config.model.findOne({
        _id: id,
        userId,
        deletedAt: null,
      });

      if (!document) {
        throw new NotFoundError(`${config.name} not found`);
      }

      return config.serialize(document);
    },

    async update(userId, id, patch) {
      const update = normalizePatch(patch as Record<string, unknown>);
      const document = await config.model.findOneAndUpdate(
        {
          _id: id,
          userId,
          deletedAt: null,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!document) {
        throw new NotFoundError(`${config.name} not found`);
      }

      return config.serialize(document);
    },

    async softDelete(userId, id) {
      const document = await config.model.findOneAndUpdate(
        {
          _id: id,
          userId,
          deletedAt: null,
        },
        {
          $set: {
            deletedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!document) {
        throw new NotFoundError(`${config.name} not found`);
      }

      return config.serialize(document);
    },
  };
}
