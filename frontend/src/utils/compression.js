/**
 * Client-side Canvas Image Compression
 * Enforces Company A's constraint: Uploads MUST be under 300 KB for highway dead zones.
 */
export async function compressImage(file, maxKb = 260) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Scale down dimensions if high resolution (typical mobile camera is 4000x3000)
        let { width, height } = img;
        const maxDimension = 1400; // Optimal resolution for reading LR stamps & numbers

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively lower JPEG quality until size < maxKb
        let quality = 0.82;
        const step = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas compression failed'));
              }
              const currentKb = blob.size / 1024;
              if (currentKb <= maxKb || quality <= 0.35) {
                // Resolved within constraint
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve({
                  file: compressedFile,
                  sizeKb: Math.round(currentKb * 10) / 10,
                  previewUrl: URL.createObjectURL(blob)
                });
              } else {
                quality -= 0.12;
                step();
              }
            },
            'image/jpeg',
            quality
          );
        };

        step();
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

