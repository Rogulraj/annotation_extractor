// Cornerstone Viewport Component - FIXED

import React, { useEffect, useRef, useState } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import { initCornerstone } from '../../lib/cornerstone/config/cornerstoneConfig';
import { loadDicomImageFromBackend, cleanupImageUrl } from '../../lib/cornerstone/helpers/imageLoader';
import { CustomRectangleRoiTool, CustomRectangleRoiToolName } from '../../lib/cornerstone/tools/CustomRectangleRoi';

interface CornerstoneViewportProps {
  dicomFileId: string;
  onAnnotationCreated?: (annotation: any) => void;
  onAnnotationModified?: (annotation: any) => void;
  onMeasurementRemoved?: (annotationId?: string) => void;
  onReady?: (payload: { element: HTMLElement }) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  onDrawingProgress?: (coords: { startX: number; startY: number; endX: number; endY: number }) => void;
  onAnnotationFinalized?: (coords: { startX: number; startY: number; endX: number; endY: number; color?: string; label?: string; id?: string }) => void;
  activeTool?: string;
  existingAnnotations?: any[];
}

export const CornerstoneViewport: React.FC<CornerstoneViewportProps> = ({
  dicomFileId,
  onAnnotationCreated,
  onAnnotationModified,
  onMeasurementRemoved,
  onReady,
  onDrawingStateChange,
  onDrawingProgress,
  onAnnotationFinalized,
  activeTool = 'Wwwc',
  existingAnnotations = [],
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDrawingRef = useRef(false);

  // Initialize Cornerstone once on mount
  useEffect(() => {
    try {
      console.log('Initializing Cornerstone...');
      initCornerstone();

      // Add tools globally first
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(CustomRectangleRoiTool);
      
      console.log('Tools registered globally');
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize Cornerstone:', err);
      setError('Failed to initialize viewer');
    }

    return () => {
      // Cleanup on unmount
      if (viewportRef.current) {
        try {
          cornerstone.disable(viewportRef.current);
        } catch (e) {
          console.error('Error disabling cornerstone:', e);
        }
      }
    };
  }, []);

  // Load DICOM image
  useEffect(() => {
    if (!isInitialized || !viewportRef.current || !dicomFileId) return;

    const element = viewportRef.current;
    let currentImageId: string | null = null;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setImageLoaded(false);

        console.log('Enabling cornerstone on element...');
        // Enable cornerstone on the element
        cornerstone.enable(element);

        console.log('Loading DICOM image...');
        // Load the image from backend
        const loadedImageId = await loadDicomImageFromBackend(dicomFileId);
        currentImageId = loadedImageId;
        setImageId(loadedImageId);

        const image = await cornerstone.loadImage(loadedImageId);
        console.log('Image loaded, displaying...');
        cornerstone.displayImage(element, image);

        // Fit image to viewport
        cornerstone.fitToWindow(element);

        console.log('Adding tools to element...');
        // Add all tools to the element  
        // Note: Tools must be added globally first (done in init)
        cornerstoneTools.addToolForElement(element, cornerstoneTools.PanTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.ZoomTool);
        cornerstoneTools.addToolForElement(element, cornerstoneTools.WwwcTool);
        cornerstoneTools.addToolForElement(element, CustomRectangleRoiTool);

        console.log('Setting default tool active...');
        // Set window/level as default active tool
        cornerstoneTools.setToolActiveForElement(element, 'Wwwc', { mouseButtonMask: 1 });

        // Make other tools passive (available but not active)
        cornerstoneTools.setToolPassiveForElement(element, 'Pan');
        cornerstoneTools.setToolPassiveForElement(element, 'Zoom');
        cornerstoneTools.setToolPassiveForElement(element, CustomRectangleRoiToolName);

        // Load existing annotations
        loadExistingAnnotations(element);

        // Setup event listeners
        element.addEventListener('cornerstonetoolsmeasurementadded', handleMeasurementAdded);
        element.addEventListener('cornerstonetoolsmeasurementmodified', handleMeasurementModified);
        element.addEventListener('cornerstonetoolsmeasurementremoved', handleMeasurementRemoved);

        if (onReady) onReady({ element });

        const handleMouseDown = () => {
          isDrawingRef.current = true;
          if (onDrawingStateChange) onDrawingStateChange(true);
        };
        const handleMouseUp = () => {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (onDrawingStateChange) onDrawingStateChange(false);
          }
        };
        const handleMouseLeave = () => {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (onDrawingStateChange) onDrawingStateChange(false);
          }
        };
        const handleMouseDownWithHit = (evt: MouseEvent) => {
          const { offsetX, offsetY } = evt;
          try {
            const toolState = cornerstoneTools.getToolState(element, CustomRectangleRoiToolName);
            if (toolState && toolState.data) {
              for (const m of toolState.data) {
                const b = m._deleteIconBounds;
                if (b && offsetX >= b.x && offsetX <= b.x + b.width && offsetY >= b.y && offsetY <= b.y + b.height) {
                  cornerstoneTools.removeToolState(element, CustomRectangleRoiToolName, m);
                  cornerstone.updateImage(element);
                  if (onMeasurementRemoved) onMeasurementRemoved(m._annotationId);
                  return;
                }
              }
            }
          } catch {}
          handleMouseDown();
        };
        element.addEventListener('mousedown', handleMouseDownWithHit);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mouseleave', handleMouseLeave);

        (element as any)._csHandleMouseDown = handleMouseDownWithHit;
        (element as any)._csHandleMouseUp = handleMouseUp;
        (element as any)._csHandleMouseLeave = handleMouseLeave;

        setImageLoaded(true);
        setIsLoading(false);
        console.log('DICOM loaded successfully!');

      } catch (err: any) {
        console.error('Error loading DICOM:', err);
        setError(err.message || 'Failed to load DICOM file');
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      if (currentImageId) {
        cleanupImageUrl(currentImageId);
      }
      
      if (element) {
        element.removeEventListener('cornerstonetoolsmeasurementadded', handleMeasurementAdded);
        element.removeEventListener('cornerstonetoolsmeasurementmodified', handleMeasurementModified);
        element.removeEventListener('cornerstonetoolsmeasurementremoved', handleMeasurementRemoved);
        if ((element as any)._csHandleMouseDown) {
          element.removeEventListener('mousedown', (element as any)._csHandleMouseDown);
          (element as any)._csHandleMouseDown = undefined;
        }
        if ((element as any)._csHandleMouseUp) {
          element.removeEventListener('mouseup', (element as any)._csHandleMouseUp);
          (element as any)._csHandleMouseUp = undefined;
        }
        if ((element as any)._csHandleMouseLeave) {
          element.removeEventListener('mouseleave', (element as any)._csHandleMouseLeave);
          (element as any)._csHandleMouseLeave = undefined;
        }
      }
    };
  }, [isInitialized, dicomFileId]);

  // Update active tool when it changes
  useEffect(() => {
    if (!viewportRef.current || !isInitialized || !imageLoaded) return;

    const element = viewportRef.current;

    try {
      console.log(`Switching to tool: ${activeTool}`);
      
      // Deactivate all tools first
      cornerstoneTools.setToolPassiveForElement(element, 'Pan');
      cornerstoneTools.setToolPassiveForElement(element, 'Zoom');
      cornerstoneTools.setToolPassiveForElement(element, 'Wwwc');
      cornerstoneTools.setToolPassiveForElement(element, CustomRectangleRoiToolName);

      // Activate the selected tool
      cornerstoneTools.setToolActiveForElement(element, activeTool, { mouseButtonMask: 1 });
      
      console.log(`Tool ${activeTool} activated`);
    } catch (err) {
      console.error('Error changing tool:', err);
    }

  }, [activeTool, isInitialized, imageLoaded]);

  // Load existing annotations onto the viewport
  const loadExistingAnnotations = (element: HTMLElement) => {
    if (!existingAnnotations || existingAnnotations.length === 0) {
      console.log('No existing annotations to load');
      return;
    }

    try {
      console.log(`Loading ${existingAnnotations.length} existing annotations...`);
      
      existingAnnotations.forEach((annotation) => {
        if (annotation.annotation_type === 'rectangle') {
          const measurementData = {
            visible: true,
            active: false,
            color: annotation.color || '#1d4ed8',
            handles: {
              start: {
                x: annotation.coordinates.x,
                y: annotation.coordinates.y,
                highlight: false,
                active: false,
              },
              end: {
                x: annotation.coordinates.x + annotation.coordinates.width,
                y: annotation.coordinates.y + annotation.coordinates.height,
                highlight: false,
                active: false,
              },
            },
            _rectLabel: annotation.label,
            _annotationId: annotation.id,
          };

          cornerstoneTools.addToolState(element, CustomRectangleRoiToolName, measurementData);
        }
      });

      // Redraw the image to show annotations
      cornerstone.updateImage(element);
      console.log('Existing annotations loaded');
    } catch (err) {
      console.error('Error loading existing annotations:', err);
    }
  };

  const handleMeasurementAdded = (event: any) => {
    const { toolType, measurementData } = event.detail;
    
    if (toolType === CustomRectangleRoiToolName) {
      measurementData._dirty = true;
      const startX = Math.round(measurementData.handles.start.x);
      const startY = Math.round(measurementData.handles.start.y);
      const endX = Math.round(measurementData.handles.end.x);
      const endY = Math.round(measurementData.handles.end.y);

      if (onAnnotationFinalized) {
        onAnnotationFinalized({
          startX,
          startY,
          endX,
          endY,
          color: measurementData.color || '#1d4ed8',
          label: measurementData._rectLabel || 'New Annotation',
          id: measurementData._annotationId,
        });
      }

      if (onAnnotationCreated) {
        const annotation = {
          annotation_type: 'rectangle' as const,
          label: measurementData._rectLabel || 'New Annotation',
          coordinates: {
            x: startX,
            y: startY,
            width: Math.round(Math.abs(endX - startX)),
            height: Math.round(Math.abs(endY - startY)),
          },
          color: measurementData.color || '#1d4ed8',
        };
        onAnnotationCreated(annotation);
      }
    }
  };

  const handleMeasurementModified = (event: any) => {
    const { toolType, measurementData } = event.detail;
    
    if (toolType === CustomRectangleRoiToolName) {
      measurementData._dirty = true;
      const startX = Math.round(measurementData.handles.start.x);
      const startY = Math.round(measurementData.handles.start.y);
      const endX = Math.round(measurementData.handles.end.x);
      const endY = Math.round(measurementData.handles.end.y);

      if (isDrawingRef.current && onDrawingProgress) {
        onDrawingProgress({ startX, startY, endX, endY });
      }

      if (onAnnotationModified) {
        const annotation = {
          id: measurementData._annotationId,
          coordinates: {
            x: startX,
            y: startY,
            width: Math.round(Math.abs(endX - startX)),
            height: Math.round(Math.abs(endY - startY)),
          },
        };
        onAnnotationModified(annotation);
      }
    }
  };

  const handleMeasurementRemoved = (event: any) => {
    const { toolType, measurementData } = event.detail;
    if (toolType === CustomRectangleRoiToolName) {
      if (onMeasurementRemoved) onMeasurementRemoved(measurementData?._annotationId);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-red-500">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Error Loading DICOM</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading DICOM file...</p>
          </div>
        </div>
      )}
      <div
        ref={viewportRef}
        className="w-full h-full"
        style={{ 
          minHeight: '400px',
          touchAction: 'none', // Prevent default touch behaviors
        }}
      />
    </div>
  );
};
