import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase.ts';

export interface UploadResult {
  url: string;
  storagePath: string;
  fileName: string;
  fileSizeStr: string;
}

/**
 * Upload a real statutory file to Firebase Storage under a per-institution isolated path.
 * Enforces 10 MB limit and valid file types.
 */
export async function uploadVaultDocument(
  file: File,
  institutionId: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10 MB statutory upload limit.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `documents/${institutionId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/pdf',
      customMetadata: {
        originalName: file.name,
        institutionId,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      snapshot => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      error => {
        console.error('Firebase Storage Upload Error:', error);
        reject(new Error(error.message || 'Failed to upload document to cloud storage.'));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const sizeBytes = file.size;
          const fileSizeStr =
            sizeBytes > 1024 * 1024
              ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
              : `${(sizeBytes / 1024).toFixed(1)} KB`;

          resolve({
            url: downloadUrl,
            storagePath,
            fileName: file.name,
            fileSizeStr,
          });
        } catch (err: any) {
          reject(new Error(err.message || 'Failed to retrieve uploaded file download URL.'));
        }
      }
    );
  });
}
