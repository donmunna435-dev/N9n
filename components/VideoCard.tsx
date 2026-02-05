
import React from 'react';
import { VideoMetadata, UploadStatus } from '../types';

interface VideoCardProps {
  video: VideoMetadata;
  onUpdate: (id: string, updates: Partial<VideoMetadata>) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onUpdate, onRemove, isProcessing }) => {
  const getStatusColor = () => {
    switch (video.status) {
      case UploadStatus.COMPLETED: return 'text-green-400';
      case UploadStatus.FAILED: return 'text-red-400';
      case UploadStatus.UPLOADING: return 'text-blue-400';
      case UploadStatus.FETCHING: return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="glass p-4 rounded-xl flex flex-col gap-3 transition-all hover:border-slate-500">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={video.title}
            onChange={(e) => onUpdate(video.id, { title: e.target.value })}
            className="bg-transparent text-lg font-semibold w-full focus:outline-none border-b border-transparent focus:border-blue-500"
            placeholder="Video Title"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500 truncate mt-1">{video.sourceUrl}</p>
        </div>
        <button 
          onClick={() => onRemove(video.id)}
          className="text-slate-500 hover:text-red-500 transition-colors p-1"
          disabled={isProcessing}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <textarea
        value={video.description}
        onChange={(e) => onUpdate(video.id, { description: e.target.value })}
        className="bg-slate-900/50 p-2 rounded text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Description"
        disabled={isProcessing}
      />

      <div className="flex gap-2 items-center">
        <select
          value={video.privacyStatus}
          onChange={(e) => onUpdate(video.id, { privacyStatus: e.target.value as any })}
          className="bg-slate-800 text-xs px-2 py-1 rounded focus:outline-none"
          disabled={isProcessing}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
        </select>
        
        <div className="flex-1">
           <div className="flex justify-between text-xs mb-1">
             <span className={getStatusColor()}>{video.status}</span>
             <span>{video.progress}%</span>
           </div>
           <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
             <div 
               className={`h-full transition-all duration-300 ${video.status === UploadStatus.FAILED ? 'bg-red-500' : 'bg-blue-500'}`} 
               style={{ width: `${video.progress}%` }}
             />
           </div>
        </div>
      </div>

      {video.error && (
        <p className="text-xs text-red-400 mt-1 italic">Error: {video.error}</p>
      )}
      
      {video.youtubeId && (
        <a 
          href={`https://youtube.com/watch?v=${video.youtubeId}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline"
        >
          View on YouTube
        </a>
      )}
    </div>
  );
};

export default VideoCard;
