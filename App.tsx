
import React, { useState, useEffect, useCallback } from 'react';
import { VideoMetadata, UploadStatus, GoogleAuthState } from './types';
import { initGoogleAuth, requestToken } from './services/googleAuth';
import { uploadToYouTube, fetchFileFromUrl } from './services/youtubeUpload';
import VideoCard from './components/VideoCard';

const App: React.FC = () => {
  const [auth, setAuth] = useState<GoogleAuthState>({
    accessToken: null,
    expiresAt: 0,
    isAuthenticated: false,
  });
  const [queue, setQueue] = useState<VideoMetadata[]>([]);
  const [rawLinks, setRawLinks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  const currentOrigin = window.location.origin;

  useEffect(() => {
    initGoogleAuth((token) => {
      setAuth({
        accessToken: token,
        expiresAt: Date.now() + 3600 * 1000,
        isAuthenticated: true,
      });
    });
  }, []);

  const addLinksToQueue = () => {
    const links = rawLinks.split('\n').map(l => l.trim()).filter(l => l !== '');
    const newItems: VideoMetadata[] = links.map(url => ({
      id: Math.random().toString(36).substr(2, 9),
      sourceUrl: url,
      title: 'Auto Title: ' + (url.split('/').pop()?.split('?')[0] || 'New Video'),
      description: 'Uploaded via TubeStream Automator',
      tags: ['automation', 'tubestream'],
      privacyStatus: 'private',
      status: UploadStatus.IDLE,
      progress: 0
    }));
    setQueue(prev => [...prev, ...newItems]);
    setRawLinks('');
  };

  const updateVideo = useCallback((id: string, updates: Partial<VideoMetadata>) => {
    setQueue(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  }, []);

  const removeVideo = (id: string) => {
    setQueue(prev => prev.filter(v => v.id !== id));
  };

  const processQueue = async () => {
    if (!auth.accessToken) {
      requestToken();
      return;
    }

    setIsProcessing(true);
    for (const video of queue) {
      if (video.status === UploadStatus.COMPLETED) continue;

      try {
        updateVideo(video.id, { status: UploadStatus.FETCHING, progress: 0 });
        const fileBlob = await fetchFileFromUrl(video.sourceUrl, (p) => {
          updateVideo(video.id, { progress: p });
        });

        updateVideo(video.id, { status: UploadStatus.UPLOADING, progress: 0 });
        const youtubeId = await uploadToYouTube(fileBlob, video, auth.accessToken, (p) => {
          updateVideo(video.id, { progress: p });
        });

        updateVideo(video.id, { status: UploadStatus.COMPLETED, progress: 100, youtubeId });
      } catch (err: any) {
        console.error(err);
        updateVideo(video.id, { status: UploadStatus.FAILED, error: err.message });
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            TubeStream
          </h1>
          <p className="text-slate-400">Bulk YouTube Upload Automation</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShowConfigHelper(!showConfigHelper)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${showConfigHelper ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'text-slate-500 border-slate-800 hover:border-slate-600'}`}
          >
            {showConfigHelper ? 'Close Guide' : 'Setup Guide'}
          </button>
          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected
            </div>
          ) : (
            <button 
              onClick={requestToken}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {showConfigHelper && (
        <div className="mb-8 glass border-blue-500/30 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">!</span>
            Critical Configuration Checklist
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-4 text-slate-300">
              <p className="font-semibold text-white">Step 1: Google Cloud Console Credentials</p>
              <ul className="space-y-2 list-decimal pl-4">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 underline">Credentials</a>.</li>
                <li>Edit your <strong>OAuth 2.0 Client ID</strong>.</li>
                <li>Add this to <strong>Authorized JavaScript origins</strong>:</li>
              </ul>
              <div className="bg-slate-900 p-3 rounded font-mono text-blue-400 flex justify-between items-center border border-slate-700">
                <span className="truncate mr-2">{currentOrigin}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(currentOrigin)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
                >
                  COPY
                </button>
              </div>
              <p className="text-[10px] text-slate-500">Note: Leave "Authorized redirect URIs" empty.</p>
            </div>

            <div className="space-y-4 text-slate-300">
              <p className="font-semibold text-white">Step 2: OAuth Consent Screen</p>
              <ul className="space-y-2 list-decimal pl-4">
                <li>Go to <a href="https://console.cloud.google.com/apis/oauthconsent" target="_blank" className="text-blue-400 underline">OAuth Consent Screen</a>.</li>
                <li>Ensure the app is in "Testing" or "Production" mode.</li>
                <li><strong>IMPORTANT:</strong> If in Testing mode, you MUST scroll down to <strong>"Test Users"</strong> and add your email address.</li>
                <li>Without this, you will get an "App not verified" or "Access denied" error.</li>
              </ul>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                After saving, wait 5 minutes before trying to login again.
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-2xl border-white/5">
            <h2 className="text-xl font-semibold mb-4">Add Content</h2>
            <label className="block text-sm text-slate-400 mb-2">Paste Drive or Direct Links (One per line)</label>
            <textarea
              value={rawLinks}
              onChange={(e) => setRawLinks(e.target.value)}
              className="w-full h-48 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 transition-all"
              placeholder="https://drive.google.com/file/d/...\nhttps://t.me/example_bot/link..."
            />
            <button 
              onClick={addLinksToQueue}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors border border-slate-700 shadow-lg active:translate-y-0.5"
            >
              Add to Queue
            </button>
          </div>

          <div className="glass p-6 rounded-2xl border-white/5 bg-slate-900/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
               <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               Usage Tips
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
              <li>Google Drive links must be "Public" or "Anyone with link".</li>
              <li>For Telegram files, use a "File to Link" bot to get a direct URL.</li>
              <li>Resumable uploads allow for files up to 128GB.</li>
              <li>Keep this tab open until all uploads show "COMPLETED".</li>
            </ul>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Upload Queue ({queue.length})</h2>
            <div className="flex gap-3">
              <button 
                onClick={() => setQueue([])}
                className="text-sm text-slate-400 hover:text-white transition-colors"
                disabled={isProcessing}
              >
                Clear All
              </button>
              <button 
                onClick={processQueue}
                disabled={isProcessing || queue.length === 0}
                className={`px-8 py-2 rounded-xl font-bold transition-all shadow-lg ${
                  isProcessing 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 active:scale-95 shadow-blue-500/20'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Start Bulk Upload'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queue.length === 0 ? (
              <div className="col-span-full py-20 text-center glass rounded-2xl text-slate-500 border-dashed border-slate-800">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <p>Your queue is empty.</p>
                <p className="text-xs mt-2">Paste links in the sidebar to get started.</p>
              </div>
            ) : (
              queue.map(video => (
                <VideoCard 
                  key={video.id} 
                  video={video} 
                  onUpdate={updateVideo} 
                  onRemove={removeVideo}
                  isProcessing={isProcessing}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="mt-20 pt-8 border-t border-slate-900 text-center text-slate-500 text-[10px] uppercase tracking-widest">
        <p className="mb-2">TubeStream Automator &copy; {new Date().getFullYear()}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <span>JavaScript Origin: {currentOrigin}</span>
          <span className="hidden sm:inline">•</span>
          <span>OAuth Mode: Implicit Popup</span>
          <span className="hidden sm:inline">•</span>
          <span>Scopes: YouTube.Upload + Drive.Read</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
