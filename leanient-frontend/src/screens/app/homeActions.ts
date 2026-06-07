export function createOpenProgressPhotoAction(openProgressPhoto: () => void): () => void {
  return () => openProgressPhoto();
}
