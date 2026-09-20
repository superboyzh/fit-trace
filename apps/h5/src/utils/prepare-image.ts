const MAX_EDGE = 1600;
const REENCODE_THRESHOLD = 1.5 * 1024 * 1024;
const HEIC_TYPES = ['image/heic', 'image/heif'];

/**
 * 上传前把图片处理成识别服务更容易接受的格式。
 * iPhone 默认拍出 HEIC，很多视觉模型不接受，而且原图往往有几 MB；
 * 浏览器能解码时就统一转成 JPEG 并限制长边，解码失败则原样上传。
 */
export async function prepareImageFile(file: File): Promise<File> {
  const needsReencode = HEIC_TYPES.includes(file.type.toLowerCase());
  if (!needsReencode && file.size <= REENCODE_THRESHOLD) return file;

  try {
    const bitmap = await decode(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // 部分浏览器无法解码 HEIC，退回 img 标签再试一次。
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('无法解码该图片'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
