import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';

export interface UseCameraResult {
  photo: Photo | null;
  isLoading: boolean;
  isSupported: boolean;
  takePhoto: () => Promise<Photo | null>;
  pickFromGallery: () => Promise<Photo | null>;
  clearPhoto: () => void;
}

export function useCamera(): UseCameraResult {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSupported = Capacitor.isNativePlatform();

  const takePhoto = async (): Promise<Photo | null> => {
    setIsLoading(true);
    try {
      // Check permissions first
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera !== 'granted') {
        const requestResult = await Camera.requestPermissions({ permissions: ['camera'] });
        if (requestResult.camera !== 'granted') {
          toast.error('Camera permission denied');
          return null;
        }
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 500,
        height: 500,
      });

      setPhoto(image);
      return image;
    } catch (error: any) {
      // User cancelled is not an error
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        return null;
      }
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const pickFromGallery = async (): Promise<Photo | null> => {
    setIsLoading(true);
    try {
      // Check permissions first
      const permissions = await Camera.checkPermissions();
      
      if (permissions.photos !== 'granted') {
        const requestResult = await Camera.requestPermissions({ permissions: ['photos'] });
        if (requestResult.photos !== 'granted') {
          toast.error('Photo library permission denied');
          return null;
        }
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 500,
        height: 500,
      });

      setPhoto(image);
      return image;
    } catch (error: any) {
      // User cancelled is not an error
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        return null;
      }
      console.error('Error picking photo:', error);
      toast.error('Failed to pick photo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
  };

  return {
    photo,
    isLoading,
    isSupported,
    takePhoto,
    pickFromGallery,
    clearPhoto,
  };
}

// Helper to convert base64 to blob for upload
export function base64ToBlob(base64: string, contentType: string = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}
