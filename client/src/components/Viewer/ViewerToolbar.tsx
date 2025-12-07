// Viewer Toolbar Component

import React from 'react';
import { 
  Move, 
  ZoomIn, 
  Sun, 
  Square,
  MousePointer2
} from 'lucide-react';
import { CustomRectangleRoiToolName } from '../../lib/cornerstone/tools/CustomRectangleRoi';

interface ViewerToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

const tools = [
  { 
    id: 'Wwwc', 
    name: 'Window/Level', 
    icon: Sun,
    description: 'Adjust brightness and contrast'
  },
  { 
    id: 'Pan', 
    name: 'Pan', 
    icon: Move,
    description: 'Move the image'
  },
  { 
    id: 'Zoom', 
    name: 'Zoom', 
    icon: ZoomIn,
    description: 'Zoom in/out'
  },
  { 
    id: CustomRectangleRoiToolName, 
    name: 'Rectangle', 
    icon: Square,
    description: 'Draw rectangle annotations'
  },
];

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  activeTool,
  onToolChange,
}) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-1 text-gray-400 text-xs mr-2">
        <MousePointer2 size={14} />
        <span>Tools:</span>
      </div>
      
      <div className="flex gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md transition-all
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
              title={tool.description}
            >
              <Icon size={16} />
              <span className="text-sm font-medium">{tool.name}</span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-900 rounded text-gray-300">W</kbd>
          <span>Window/Level</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-900 rounded text-gray-300">P</kbd>
          <span>Pan</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-900 rounded text-gray-300">Z</kbd>
          <span>Zoom</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-900 rounded text-gray-300">R</kbd>
          <span>Rectangle</span>
        </div>
      </div>
    </div>
  );
};
