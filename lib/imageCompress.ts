// Сжимает изображение на клиенте перед загрузкой: уменьшает до maxDimension
// по большей стороне и перекодирует в JPEG нужного качества. Это решает
// сразу две проблемы: реальные фото с телефона (часто 3-10МБ, иногда в
// HEIC) перестают упираться в лимиты бакетов/сервера, и заодно HEIC (если
// браузер вообще способен его декодировать) превращается в обычный JPEG.
// Если сжать не получилось (неизвестный кодек, ошибка canvas) — просто
// возвращает исходный файл, чтобы не блокировать загрузку совсем.
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);

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

    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";

    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
