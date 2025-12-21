// Analytics Page

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDicomFiles } from '../hooks/useDicom';
import { useAnnotations } from '../hooks/useAnnotation';
import type { Annotation } from '../types/api.types';

export const AnalyticsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { data: dicomFileList } = useDicomFiles();
  const files = dicomFileList?.items || [];
  const { data: annotations = { items: [] } } = useAnnotations();

  // Ensure annotations is always an array
  const safeAnnotations = annotations?.items || [];

  console.log(safeAnnotations);

  // Group annotations by type
  const annotationsByType = safeAnnotations.reduce((acc: Record<string, number>, annotation: Annotation) => {
    acc[annotation.annotation_type] = (acc[annotation.annotation_type] || 0) + 1;
    return acc;
  }, {});

  // Group annotations by label
  const annotationsByLabel = safeAnnotations.reduce((acc: Record<string, number>, annotation: Annotation) => {
    acc[annotation.label] = (acc[annotation.label] || 0) + 1;
    return acc;
  }, {});

  const verifiedCount = safeAnnotations.filter((a: Annotation) => a.is_verified).length;
  const unverifiedCount = safeAnnotations.filter((a: Annotation) => !a.is_verified).length;
  const aiGeneratedCount = safeAnnotations.filter((a: Annotation) => a.is_ai_generated).length;


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-600">
              User: {user?.username}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total DICOM Files</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{files.length}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Annotations</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{safeAnnotations.length}</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Verified</div>
            <div className="mt-2 text-3xl font-semibold text-green-600">{verifiedCount}</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Unverified</div>
            <div className="mt-2 text-3xl font-semibold text-yellow-600">{unverifiedCount}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Annotations by Type */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Annotations by Type</h2>
            {Object.keys(annotationsByType).length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(annotationsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(count / safeAnnotations.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-900 font-medium w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Annotations by Label */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Annotations by Label</h2>
            {Object.keys(annotationsByLabel).length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(annotationsByLabel)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-gray-700 truncate flex-1">{label}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${((count as number) / safeAnnotations.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-900 font-medium w-8">{count as number}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* AI vs Manual */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI vs Manual Annotations</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">AI Generated</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${safeAnnotations.length > 0 ? (aiGeneratedCount / safeAnnotations.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-gray-900 font-medium w-8">{aiGeneratedCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Manual</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${safeAnnotations.length > 0 ? ((safeAnnotations.length - aiGeneratedCount) / safeAnnotations.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-gray-900 font-medium w-8">{safeAnnotations.length - aiGeneratedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Annotations</h2>
            {safeAnnotations.length === 0 ? (
              <p className="text-gray-500">No annotations yet</p>
            ) : (
              <div className="space-y-2">
                {safeAnnotations

                  .slice(0, 5)
                  .map((annotation: Annotation) => (
                    <div key={annotation.id} className="border-b border-gray-200 pb-2">
                      <div className="text-sm font-medium text-gray-900">{annotation.label}</div>
                      <div className="text-xs text-gray-500">
                        {annotation.annotation_type} • {new Date(annotation.created_at).toLocaleDateString()}
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
