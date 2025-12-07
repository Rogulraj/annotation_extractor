// DICOM Image Loader Helper

import cornerstone from 'cornerstone-core';
import { apiClient } from '../../../api/client';

/**
 * Load DICOM image from backend API
 * @param dicomFileId - The UUID of the DICOM file in the backend
 * @returns Image ID for cornerstone
 */
export async function loadDicomImageFromBackend(dicomFileId: string): Promise<string> {
  try {
    // Fetch DICOM file blob from backend
    const response = await apiClient.get(`/dicom/${dicomFileId}/download`, {
      responseType: 'blob',
    });

    // Create object URL from blob
    const blob = response.data;
    const imageUrl = URL.createObjectURL(blob);

    // Use WADO URI loader for the blob URL
    // The wadouri scheme works with blob URLs
    const imageId = `wadouri:${imageUrl}`;
    
    return imageId;
  } catch (error) {
    console.error('Failed to load DICOM image from backend:', error);
    throw new Error('Failed to load DICOM file');
  }
}

/**
 * Cleanup image URL to prevent memory leaks
 * @param imageId - The cornerstone image ID
 */
export function cleanupImageUrl(imageId: string) {
  try {
    // Extract URL from imageId (remove wadouri: prefix)
    const url = imageId.replace('wadouri:', '');
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error cleaning up image URL:', error);
  }
}

/**
 * Get image metadata
 * @param element - The cornerstone-enabled element
 */
export function getImageMetadata(element: HTMLElement) {
  try {
    const enabledElement = cornerstone.getEnabledElement(element);
    if (!enabledElement || !enabledElement.image) {
      return null;
    }

    const image = enabledElement.image;
    const viewport = cornerstone.getViewport(element);

    return {
      width: image.width,
      height: image.height,
      columnPixelSpacing: image.columnPixelSpacing,
      rowPixelSpacing: image.rowPixelSpacing,
      windowCenter: viewport.voi.windowCenter,
      windowWidth: viewport.voi.windowWidth,
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return null;
  }
}
