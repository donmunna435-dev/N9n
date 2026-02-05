
import { VideoMetadata } from '../types';

/**
 * YouTube Resumable Upload logic
 * Supports large files by using a session-based approach
 */
export const uploadToYouTube = async (
  file: Blob,
  metadata: VideoMetadata,
  accessToken: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  // 1. Initiate Resumable Upload Session
  const initiateUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
  
  const initiateResponse = await fetch(initiateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': file.size.toString(),
      'X-Upload-Content-Type': file.type || 'video/*',
    },
    body: JSON.stringify({
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: metadata.privacyStatus,
        selfDeclaredMadeForKids: false
      }
    })
  });

  if (!initiateResponse.ok) {
    const errorData = await initiateResponse.json();
    throw new Error(errorData.error?.message || 'Failed to initiate upload session');
  }

  const uploadUrl = initiateResponse.headers.get('Location');
  if (!uploadUrl) throw new Error('No upload session URL received');

  // 2. Upload the actual data
  // For simplicity in a browser context, we upload in one go but monitor progress.
  // Real resumable would chunk this, but fetch doesn't natively support PUT chunking easily with progress.
  // Instead, we use XMLHttpRequest for progress tracking.

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/*');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.id);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
};

/**
 * Resolves different link types to Blobs
 */
export const fetchFileFromUrl = async (url: string, onProgress: (progress: number) => void): Promise<Blob> => {
  // Handle Google Drive Links
  let targetUrl = url;
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
    if (match && match[1]) {
      // Note: This requires the file to be publicly accessible or use a Google Drive API token
      // In a real app, you'd call the Drive API files.get with alt=media
      targetUrl = `https://www.googleapis.com/drive/v3/files/${match[1]}?alt=media`;
    }
  }

  // Use XMLHttpRequest or fetch with a readable stream for better progress on downloads
  const response = await fetch(targetUrl);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!total) return await response.blob();

  const reader = response.body?.getReader();
  if (!reader) return await response.blob();

  let loaded = 0;
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.round((loaded / total) * 100));
  }

  return new Blob(chunks);
};
