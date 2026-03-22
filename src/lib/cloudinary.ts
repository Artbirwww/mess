// Cloudinary конфигурация
// Зарегистрируйтесь на https://cloudinary.com и получите данные из dashboard

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

// Проверка конфигурации
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.warn('⚠️ Cloudinary не настроен. Добавьте VITE_CLOUDINARY_CLOUD_NAME и VITE_CLOUDINARY_UPLOAD_PRESET в .env');
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  url: string;
  public_id: string;
  format: string;
}

/**
 * Загрузка изображения на Cloudinary
 * Использует unsigned upload preset (не требует подписи на сервере)
 */
export const uploadImageToCloudinary = async (
  file: File,
  fromId: string,
  toId: string
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary не настроен. Проверьте переменные окружения.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `messenger/${fromId}_${toId}`);
  formData.append('tags', `messenger,chat,${fromId},${toId}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Ошибка загрузки изображения');
    }

    const data: CloudinaryUploadResponse = await response.json();
    console.log('✅ Cloudinary upload success:', data.secure_url);

    return data.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Оптимизация URL изображения Cloudinary
 * Добавляет параметры для оптимизации размера и качества
 */
export const optimizeCloudinaryUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}
): string => {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.quality) transforms.push(`q_${options.quality}`);

  if (transforms.length === 0) {
    // По умолчанию оптимизируем для превью
    transforms.push('w_400', 'q_auto');
  }

  const transformStr = transforms.join(',');

  // Вставляем трансформации в URL Cloudinary
  return url.replace(
    /\/upload\/(.+)/,
    `/upload/${transformStr}/$1`
  );
};

/**
 * Удаление изображения с Cloudinary (требует подписи, только для администратора)
 * Для client-side использования не рекомендуется
 */
export const deleteImageFromCloudinary = async (
  _publicId: string
): Promise<void> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
    throw new Error('Cloudinary API key не настроен');
  }

  // Для удаления требуется подпись на сервере
  // Эта функция для справки - реализуйте на Cloud Functions если нужно
  console.warn('Удаление изображений требует серверной подписи');
};
