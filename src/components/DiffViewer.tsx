import React, { useMemo } from 'react';
import type { GitDiff } from '../services/gitCore';

interface DiffViewerProps {
  diff: GitDiff;
  viewMode?: 'unified' | 'split';
  onApply?: () => void;
  onReject?: () => void;
}

export function DiffViewer({ diff, viewMode = 'unified', onApply, onReject }: DiffViewerProps) {
  const renderUnifiedDiff = () => {
    return (
      <div className="font-mono text-sm">
        <div className="bg-gray-800 px-4 py-2 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{diff.path}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              diff.type === 'added' ? 'bg-green-600' :
              diff.type === 'deleted' ? 'bg-red-600' :
              'bg-yellow-600'
            }`}>
              {diff.type}
            </span>
          </div>
        </div>

        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b border-gray-700">
            <div className="bg-blue-900/30 px-4 py-1 text-blue-300 text-xs">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>

            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={`px-4 py-1 ${
                  line.type === 'add' ? 'bg-green-900/20 text-green-300' :
                  line.type === 'del' ? 'bg-red-900/20 text-red-300' :
                  'bg-gray-900 text-gray-300'
                }`}
              >
                <span className="select-none mr-2 text-gray-500">
                  {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                </span>
                <span>{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSplitDiff = () => {
    return (
      <div className="font-mono text-sm">
        <div className="bg-gray-800 px-4 py-2 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{diff.path}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              diff.type === 'added' ? 'bg-green-600' :
              diff.type === 'deleted' ? 'bg-red-600' :
              'bg-yellow-600'
            }`}>
              {diff.type}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-700">
          <div className="bg-gray-900">
            <div className="bg-gray-800 px-4 py-1 text-gray-400 text-xs font-semibold sticky top-12">
              Original
            </div>
            {diff.oldContent && (
              <pre className="p-4 text-gray-300 whitespace-pre-wrap break-words">
                {diff.oldContent}
              </pre>
            )}
          </div>

          <div className="bg-gray-900">
            <div className="bg-gray-800 px-4 py-1 text-gray-400 text-xs font-semibold sticky top-12">
              Modified
            </div>
            {diff.newContent && (
              <pre className="p-4 text-gray-300 whitespace-pre-wrap break-words">
                {diff.newContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {(onApply || onReject) && (
        <div className="flex items-center gap-2 p-4 bg-gray-800 border-b border-gray-700">
          {onApply && (
            <button
              onClick={onApply}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Apply Changes
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Reject Changes
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
      </div>
    </div>
  );
}
