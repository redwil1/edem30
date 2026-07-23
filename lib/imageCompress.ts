// Сжимает изображение на клиенте перед загрузкой: уменьшает до maxDimension
// по большей стороне и перекодирует в JPEG нужного качества. Это решает
// сразу две проблемы: реальные фото с телефона (часто 3-10МБ) перестают
// упираться в лимиты бакетов/сервера, и любой формат, который браузер умеет
// декодировать (включая HEIC там, где это поддерживается), превращается в
// обычный JPEG — сервер принимает только jpeg/png/webp.
//
// Раньше при любой ошибке (в т.ч. недекодируемый HEIC на браузерах без
// поддержки) функция молча возвращала исходный файл как есть — тот долетал
// до сервера в неподдерживаемом формате и отклонялся с непонятной для
// пользователя причиной. Теперь ошибка декодирования выбрасывается наружу,
// чтобы вызывающий код мог показать конкретное объяснение.
export class ImageCompressError extends Error {}

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageCompressError(
      "Браузер не смог обработать это изображение — возможно, формат HEIC. Попробуйте выбрать другое фото или сначала сохранить его как JPG/PNG."
    );
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.max(1, Math.round(bitmap.width * scale));
  const targetH = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");

  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) {
    throw new ImageCompressError(
      "Не удалось сжать изображение. Попробуйте другое фото."
    );
  }

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";

  return new File([blob], newName, { type: "image/jpeg" });
}
