import * as Notifications from "expo-notifications";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

/**
 * The PERMISSIONS settings group reads real OS grant states, so "Allowed" is
 * never a guess. Rows deep-link to iOS Settings; the app can't flip these
 * itself.
 */
export type PermissionState = "Allowed" | "Off" | "Ask";

export interface PermissionStatuses {
  notifications: PermissionState;
  camera: PermissionState;
  photos: PermissionState;
}

const toState = (granted: boolean, canAskAgain: boolean): PermissionState =>
  granted ? "Allowed" : canAskAgain ? "Ask" : "Off";

export async function loadPermissionStatuses(): Promise<PermissionStatuses> {
  const [notif, cam, photos] = await Promise.all([
    Notifications.getPermissionsAsync().catch(() => null),
    Camera.getCameraPermissionsAsync().catch(() => null),
    ImagePicker.getMediaLibraryPermissionsAsync().catch(() => null),
  ]);
  return {
    notifications: notif ? toState(notif.granted, notif.canAskAgain) : "Ask",
    camera: cam ? toState(cam.granted, cam.canAskAgain) : "Ask",
    photos: photos ? toState(photos.granted, photos.canAskAgain) : "Ask",
  };
}
