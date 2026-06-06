import * as ImagePicker from "expo-image-picker";
import type { AvatarUploadIntentRequest, User } from "@leanient/shared";
import apiService from "./api.service";

type AvatarContentType = AvatarUploadIntentRequest["contentType"];

export type AvatarSource = "library" | "camera";

export interface PickedAvatar {
  uri: string;
  contentType: AvatarContentType;
}

/** Map an asset's reported mime / extension to an accepted avatar content type. */
function normalizeContentType(mime: string | undefined, uri: string): AvatarContentType {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  if (m === "image/heic") return "image/heic";
  if (m === "image/jpeg" || m === "image/jpg") return "image/jpeg";

  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

/**
 * Launch the library or camera and return the chosen square image. Returns null
 * if the user cancels. Throws a friendly error if permission is denied.
 */
export async function pickAvatar(source: AvatarSource): Promise<PickedAvatar | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Camera access is needed to take a photo. Enable it in Settings.");
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, contentType: normalizeContentType(asset.mimeType, asset.uri) };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo access is needed to choose a picture. Enable it in Settings.");
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, contentType: normalizeContentType(asset.mimeType, asset.uri) };
}

interface AvatarApi {
  createAvatarUploadIntent: typeof apiService.createAvatarUploadIntent;
  confirmAvatarUpload: typeof apiService.confirmAvatarUpload;
}

/**
 * Upload a picked avatar: request a presigned PUT, push the bytes to S3, then
 * confirm so the key is saved on the user. Returns the updated user.
 */
export async function uploadAvatar(
  picked: PickedAvatar,
  deps: { api?: AvatarApi; fetchImpl?: typeof fetch } = {},
): Promise<User> {
  const api = deps.api ?? apiService;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const fileResponse = await fetchImpl(picked.uri);
  const blob = await fileResponse.blob();

  const intent = await api.createAvatarUploadIntent({
    contentType: picked.contentType,
    sizeBytes: blob.size || undefined,
  });

  const putResponse = await fetchImpl(intent.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": picked.contentType },
    body: blob,
  });
  if (!putResponse.ok) {
    throw new Error("Avatar upload failed. Please try again.");
  }

  return api.confirmAvatarUpload({ key: intent.key });
}
