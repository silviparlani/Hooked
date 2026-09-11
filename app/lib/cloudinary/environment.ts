export type CloudinaryEnvironment = {
  cloudName: string;
  uploadPreset: string;
};

type EnvironmentSource = Partial<Record<keyof NodeJS.ProcessEnv, string | undefined>>;

export function readCloudinaryEnvironment(source: EnvironmentSource): CloudinaryEnvironment {
  const cloudName = source.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = source.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error('Missing Cloudinary public configuration.');
  }

  if (!/^[a-z][a-z0-9-]{1,127}$/i.test(cloudName)) {
    throw new Error('Invalid Cloudinary cloud name.');
  }

  return { cloudName, uploadPreset };
}

export function getCloudinaryEnvironment(): CloudinaryEnvironment {
  return readCloudinaryEnvironment({
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  });
}
