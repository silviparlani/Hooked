export type ProjectPhoto = {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  assetVersion: number;
  format: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: Date;
};

export const MAX_PROJECT_PHOTOS = 5;
