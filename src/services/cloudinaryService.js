const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const getResourceType = (file) => {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'video';
  return 'raw';
};

export const uploadImageToCloudinary = async (file, fromId, toId) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `messenger/${fromId}_${toId}`);
  formData.append('tags', `messenger,chat,${fromId},${toId}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Image upload failed');
  }

  const data = await response.json();
  return data.secure_url;
};

export const uploadFileToCloudinary = async (file, fromId, toId) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const resourceType = getResourceType(file);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `messenger/${fromId}_${toId}`);
  formData.append('tags', `messenger,chat,${fromId},${toId}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'File upload failed');
  }

  const data = await response.json();
  return { url: data.secure_url, resourceType };
};

export const uploadAvatarToCloudinary = async (file, userId) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `messenger/avatars/${userId}`);
  formData.append('tags', `messenger,avatar,${userId}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Avatar upload failed');
  }

  const data = await response.json();
  return data.secure_url;
};
