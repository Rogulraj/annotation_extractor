// DICOM Viewer Page with Cornerstone Integration

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDicomFile } from '../hooks/useDicom';
import { useAnnotations, useDeleteAnnotation } from '../hooks/useAnnotation';
import { useQueryClient } from '@tanstack/react-query';
import { annotationService } from '../services/annotation.service';
import { CornerstoneViewport } from '../components/Viewer/CornerstoneViewport';
import { ViewerToolbar } from '../components/Viewer/ViewerToolbar';
import { Trash2 } from 'lucide-react';
import type { Annotation } from '../types/api.types';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

export const ViewerPage = () => {
  const { dicomId } = useParams<{ dicomId: string }>();
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('Wwwc');
  
  const { data: selectedFile, isLoading: loadingFile } = useDicomFile(dicomId);
  const { data: annotationsData, isLoading: loadingAnnotations } = useAnnotations(
    dicomId ? { dicom_file_id: dicomId } : undefined,
    { enabled: !!dicomId }
  );
  const { mutate: deleteAnnotation } = useDeleteAnnotation();
  const queryClient = useQueryClient();

  // Extract annotations array safely
  const annotations = annotationsData?.items || [];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w':
          setActiveTool('Wwwc');
          break;
        case 'p':
          setActiveTool('Pan');
          break;
        case 'z':
          setActiveTool('Zoom');
          break;
        case 'r':
          setActiveTool('CustomRectangleRoi');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const [isDrawing, setIsDrawing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'success'|'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const syncTimerRef = useRef<number | null>(null);
  const viewportElementRef = useRef<HTMLElement | null>(null);

  const handleDrawingStateChange = useCallback((drawing: boolean) => {
    setIsDrawing(drawing);
  }, []);

  const toBackendCoords = (handles: { start: { x:number; y:number }; end: { x:number; y:number } }) => {
    const startX = Math.round(handles.start.x);
    const startY = Math.round(handles.start.y);
    const endX = Math.round(handles.end.x);
    const endY = Math.round(handles.end.y);
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    return { x, y, width, height };
  };

  const hasUnsavedChanges = useCallback(() => {
    const el = viewportElementRef.current;
    if (!el) return false;
    const state = cornerstoneTools.getToolState(el, 'CustomRectangleRoi');
    if (!state || !state.data || state.data.length === 0) return false;
    return state.data.some((m: any) => !m._annotationId || m._dirty);
  }, []);

  const saveFromToolState = useCallback(async () => {
    console.log('saveFromToolState', dicomId, viewportElementRef.current);
    if (!dicomId) return;
    const el = viewportElementRef.current;
    if (!el) return;
    const toolState = cornerstoneTools.getToolState(el, 'CustomRectangleRoi');
    const items = toolState?.data ?? [];
    console.log('items', items);
    if (items.length === 0) return;

    setSaveStatus('saving');
    setSaveMessage('Saving changes...');

    const retry = async <T,>(fn: () => Promise<T>) => {
      const delays = [1000, 2000, 4000];
      for (let i = 0; i < delays.length; i++) {
        try {
          return await fn();
        } catch (e) {
          if (i === delays.length - 1) throw e;
          await new Promise(res => setTimeout(res, delays[i]));
        }
      }
      return await fn();
    };

    try {
      // Remove duplicates among unsaved
      const seen: Record<string, boolean> = {};
      for (const m of items) {
        if (!m._annotationId) {
          const c = toBackendCoords(m.handles);
          const key = `${c.x}-${c.y}-${c.width}-${c.height}-${m._rectLabel ?? ''}`;
          if (seen[key]) {
            cornerstoneTools.removeToolState(el, 'CustomRectangleRoi', m);
          } else {
            seen[key] = true;
          }
        }
      }

      // Save new and modified
      for (const m of (cornerstoneTools.getToolState(el, 'CustomRectangleRoi')?.data ?? [])) {
        const coords = toBackendCoords(m.handles);
        if (!m._annotationId) {
          const created = await retry(() => annotationService.createAnnotation({
            dicom_file_id: dicomId,
            annotation_type: 'rectangle',
            label: m._rectLabel || 'Annotation',
            coordinates: coords,
            color: m.color || '#1d4ed8'
          }));
          m._annotationId = created.id;
          m._dirty = false;
        } else if (m._dirty) {
          await retry(() => annotationService.updateAnnotation(m._annotationId as string, {
            coordinates: coords
          }));
          m._dirty = false;
        }
      }
      cornerstone.updateImage(el);
      setSaveStatus('success');
      setSaveMessage('Saved');
      // Refresh lists
      queryClient.invalidateQueries({ queryKey: ['annotations'] });
    } catch (e: any) {
      setSaveStatus('error');
      setSaveMessage('Save failed. Will retry.');
    }
  }, [dicomId, queryClient]);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    syncTimerRef.current = window.setTimeout(async () => {
      if (isDrawing) {
        scheduleSync();
        return;
      }
      const hasChanges = hasUnsavedChanges();
      console.log('hasChanges', hasChanges);
      if (hasChanges) {
        await saveFromToolState();
        scheduleSync();
      } else {
        scheduleSync();
      }
    }, 10000);
  }, [isDrawing, hasUnsavedChanges, saveFromToolState]);

  useEffect(() => {
    scheduleSync();
    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [scheduleSync]);

  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    if (confirm('Are you sure you want to delete this annotation?')) {
      deleteAnnotation({ id: annotationId });
      const el = viewportElementRef.current;
      if (el) {
        const state = cornerstoneTools.getToolState(el, 'CustomRectangleRoi');
        const items = state?.data ?? [];
        const target = items.find((m: any) => m._annotationId === annotationId);
        if (target) {
          cornerstoneTools.removeToolState(el, 'CustomRectangleRoi', target);
          cornerstone.updateImage(el);
        }
      }
    }
  }, [deleteAnnotation]);

  const loading = loadingFile || loadingAnnotations;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">
                {selectedFile?.original_filename || 'DICOM Viewer'}
              </h1>
              {selectedFile && (
                <p className="text-xs text-gray-400">
                  {selectedFile.patient_id && `Patient: ${selectedFile.patient_id}`}
                  {selectedFile.modality && ` • ${selectedFile.modality}`}
                  {selectedFile.study_date && ` • ${selectedFile.study_date}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white text-sm bg-gray-700 px-3 py-2 rounded-md">
              <span className="text-gray-400">Annotations:</span>{' '}
              <span className="font-semibold">{annotations.length}</span>
            </div>
            <button
              onClick={async () => {
                if (isDrawing) {
                  setSaveStatus('error');
                  setSaveMessage('Finish drawing first');
                  return;
                }
                await saveFromToolState();
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              Save Now
            </button>
            {saveStatus !== 'idle' && (
              <div className="text-xs text-gray-300">
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <ViewerToolbar activeTool={activeTool} onToolChange={setActiveTool} />

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Viewer Area */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-white bg-black">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Loading DICOM file...</p>
              </div>
            </div>
          ) : selectedFile && dicomId ? (
            <CornerstoneViewport
              dicomFileId={dicomId}
              onDrawingStateChange={handleDrawingStateChange}
              onReady={({ element }) => { viewportElementRef.current = element; }}
              onMeasurementRemoved={(id) => {
                if (id) {
                  deleteAnnotation({ id });
                  queryClient.invalidateQueries({ queryKey: ['annotations'] });
                }
              }}
              activeTool={activeTool}
              existingAnnotations={annotations}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white bg-black">
              <div className="text-center">
                <p className="text-lg">No DICOM file found</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Annotations Sidebar */}
        <div className="w-80 bg-gray-800 overflow-y-auto border-l border-gray-700">
          <div className="p-4">
            <h2 className="text-white font-semibold text-lg mb-4">Annotations</h2>
            
            {annotations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No annotations yet</p>
                <p className="text-gray-500 text-xs">
                  Select the Rectangle tool and draw on the image to create annotations
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map((annotation: Annotation) => (
                  <div 
                    key={annotation.id} 
                    className="bg-gray-700 p-3 rounded-lg hover:bg-gray-650 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{annotation.label}</div>
                        <div className="text-gray-400 text-xs mt-1">
                          Type: <span className="capitalize">{annotation.annotation_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDeleteAnnotation(annotation.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
                          title="Delete annotation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {annotation.color && (
                      <div className="flex items-center gap-2 mt-2">
                        <div 
                          className="w-4 h-4 rounded border border-gray-600" 
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-gray-400 text-xs">Color</span>
                      </div>
                    )}

                    {annotation.notes && (
                      <div className="text-gray-300 text-xs mt-2 p-2 bg-gray-800 rounded">
                        {annotation.notes}
                      </div>
                    )}

                    {annotation.is_ai_generated && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded">
                          AI Generated
                        </span>
                      </div>
                    )}

                    {annotation.is_verified && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded">
                          ✓ Verified
                        </span>
                      </div>
                    )}

                    <div className="text-gray-500 text-xs mt-2">
                      {new Date(annotation.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
