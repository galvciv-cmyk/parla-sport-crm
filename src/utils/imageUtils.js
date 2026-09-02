/**
 * Utilidades para el procesamiento, compresión y recorte de imágenes en el cliente
 * Permite reducir fotos tomadas con móviles (3-15MB) a avatares optimizados (<35KB) en formato WebP/JPEG
 */

/**
 * Comprime y recorta una imagen al centro a dimensiones cuadradas máximas
 * @param {File|Blob} file - Archivo de imagen original
 * @param {Object} options - Opciones de compresión
 * @param {number} options.maxDimension - Ancho/Alto máximo en px (default 320)
 * @param {number} options.quality - Calidad de compresión (0.1 a 1.0, default 0.82)
 * @param {string} options.format - Formato ('image/webp' o 'image/jpeg')
 * @returns {Promise<string>} Base64 Data URL de la imagen optimizada
 */
export const compressAndCropImage = (file, {
  maxDimension = 320,
  quality = 0.82,
  format = 'image/webp'
} = {}) => {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      return reject(new Error('Archivo de imagen no válido'));
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calcular recorte centrado (Square crop)
          const minSide = Math.min(img.width, img.height);
          const startX = (img.width - minSide) / 2;
          const startY = (img.height - minSide) / 2;

          const targetSize = Math.min(minSide, maxDimension);
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Mejorar calidad de escalado en canvas
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar la porción centrada
          ctx.drawImage(
            img,
            startX, startY, minSide, minSide,
            0, 0, targetSize, targetSize
          );

          // Intentar exportar a WebP, fallback a JPEG
          let dataUrl = canvas.toDataURL(format, quality);
          if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Error al decodificar la imagen seleccionada'));
      };

      img.src = readerEvent.target.result;
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Convierte un DataURL a tamaño aproximado en KB
 */
export const getDataUrlSizeKb = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const stringLength = dataUrl.length - 'data:image/webp;base64,'.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
  return Math.round(sizeInBytes / 1024);
};
