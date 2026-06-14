import * as ImagePicker from "expo-image-picker";
import type { ProgressPhoto, ProgressPhotoUploadIntentRequest } from "@leanient/shared";
import apiService from "./api.service";

type ProgressPhotoContentType = ProgressPhotoUploadIntentRequest["contentType"];

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

export interface PickedProgressPhoto {
  uri: string;
  contentType: ProgressPhotoContentType;
}

const LIBRARY_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 0.9,
};

export function detectProgressPhotoContentType(
  mimeType: string | undefined,
  uri: string,
): ProgressPhotoContentType {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  if (mime === "image/heic") return "image/heic";
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";

  const normalized = uri.split(/[?#]/)[0]?.toLowerCase() ?? "";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

export async function pickProgressPhotoFromLibrary(): Promise<PickedProgressPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo access is needed to choose a progress photo. Enable it in Settings.");
  }

  const result = await ImagePicker.launchImageLibraryAsync(LIBRARY_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    contentType: detectProgressPhotoContentType(asset.mimeType, asset.uri),
  };
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
      kind: input.kind,
      faceFullness: input.faceFullness,
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
