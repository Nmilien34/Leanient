import type { ProgressPhoto, ProgressPhotoUploadIntentRequest } from "@leanient/shared";
import apiService from "./api.service";

interface ProgressPhotoApi {
  createProgressPhotoUploadIntent: typeof apiService.createProgressPhotoUploadIntent;
  confirmProgressPhotoUpload: typeof apiService.confirmProgressPhotoUpload;
}

interface ProgressPhotoServiceOptions {
  api?: ProgressPhotoApi;
  fetchImpl?: typeof fetch;
}

export interface UploadProgressPhotoInput extends ProgressPhotoUploadIntentRequest {
  bytes: BodyInit;
}

function resolveUploadSizeBytes(input: UploadProgressPhotoInput, photo: ProgressPhoto): number {
  if (input.sizeBytes) {
    return input.sizeBytes;
  }

  if (input.bytes instanceof Blob) {
    return input.bytes.size;
  }

  if (photo.sizeBytes) {
    return photo.sizeBytes;
  }

  throw new Error("Progress photo sizeBytes is required before confirming upload");
}

export class ProgressPhotoService {
  private readonly api: ProgressPhotoApi;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: ProgressPhotoServiceOptions = {}) {
    this.api = options.api ?? apiService;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async uploadProgressPhoto(input: UploadProgressPhotoInput): Promise<ProgressPhoto> {
    const intent = await this.api.createProgressPhotoUploadIntent({
      captureDate: input.captureDate,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    const response = await this.fetchImpl(intent.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": input.contentType,
      },
      body: input.bytes,
    });

    if (!response.ok) {
      throw new Error("Progress photo upload failed");
    }

    return this.api.confirmProgressPhotoUpload({
      photoId: intent.photo.id,
      sizeBytes: resolveUploadSizeBytes(input, intent.photo),
    });
  }
}

export function createProgressPhotoService(
  options: ProgressPhotoServiceOptions = {},
): ProgressPhotoService {
  return new ProgressPhotoService(options);
}

const progressPhotoService = createProgressPhotoService();

export default progressPhotoService;
