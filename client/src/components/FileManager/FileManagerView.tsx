import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  FolderPlus,
  Upload,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  Edit,
  ArrowUp,
  ChevronRight,
  HardDrive,
  Home,
  FileText,
  Film,
  FolderGit2,
  Save,
  X
} from 'lucide-react';
import { FileItem, Bookmark } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const FileManagerView: React.FC = () => {
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // File Preview / Edit Modal
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New Folder Prompt Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadDirectory = async (path?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getFiles(path);
      setCurrentPath(res.current_path);
      setParentPath(res.parent_path);
      setItems(res.items);
      setBookmarks(res.bookmarks);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const handleItemClick = (item: FileItem) => {
    if (item.is_dir) {
      loadDirectory(item.path);
    } else {
      handleOpenFile(item.path);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      const res = await api.previewFile(filePath);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setPreviewFile({
        path: res.path || filePath,
        name: res.name || 'file',
        content: res.content || ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to open file');
    }
  };

  const handleSaveFile = async () => {
    if (!previewFile) return;
    setIsSaving(true);
    try {
      await api.saveFile(previewFile.path, previewFile.content);
      toast.success('File saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(currentPath, newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadDirectory(currentPath);
      toast.success('Folder created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const handleDeleteItem = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
      const res = await api.deleteFile(path);
      if (res.error) toast.error(res.error);
      else {
        loadDirectory(currentPath);
        toast.success('Item deleted');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.uploadFile(currentPath, file);
      loadDirectory(currentPath);
      toast.success(`Uploaded ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    }
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  const getBookmarkIcon = (iconName: string) => {
    switch (iconName) {
      case 'home': return <Home className="w-4 h-4 text-lantern-400" />;
      case 'users': return <Folder className="w-4 h-4 text-amber-400" />;
      case 'file-text': return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'film': return <Film className="w-4 h-4 text-purple-400" />;
      case 'folder-code': return <FolderGit2 className="w-4 h-4 text-emerald-400" />;
      default: return <HardDrive className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header & Quick Bookmarks */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Server File Manager</h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse directories, edit configuration files, and manage your media library storage.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-lantern-400" />
              <span>New Folder</span>
            </button>

            <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-lantern-500 hover:bg-lantern-400 text-obsidian-950 text-xs font-bold shadow-lantern cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => loadDirectory(currentPath)}
              className="p-2 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bookmarks bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {bookmarks.map((b, i) => (
            <button
              key={i}
              onClick={() => loadDirectory(b.path)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-obsidian-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors whitespace-nowrap"
            >
              {getBookmarkIcon(b.icon)}
              <span>{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="glass-panel px-4 py-2.5 rounded-xl border-slate-800/80 flex items-center space-x-2 text-xs font-mono overflow-x-auto scrollbar-none">
        <button
          onClick={() => loadDirectory('/')}
          className="text-lantern-400 hover:underline font-bold"
        >
          /
        </button>
        {pathParts.map((part, index) => {
          const pathToPart = '/' + pathParts.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={pathToPart}>
              <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <button
                onClick={() => loadDirectory(pathToPart)}
                className="text-slate-300 hover:text-white hover:underline whitespace-nowrap"
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Files Table / List */}
      <div className="glass-panel rounded-2xl border-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading files...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {/* Up to Parent Directory */}
            {parentPath && (
              <div
                onClick={() => loadDirectory(parentPath)}
                className="p-3 px-5 flex items-center space-x-3 text-xs text-slate-400 hover:bg-slate-800/40 cursor-pointer font-mono"
              >
                <ArrowUp className="w-4 h-4 text-slate-400" />
                <span>.. (Parent Directory)</span>
              </div>
            )}

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">Directory is empty</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  className="p-3 px-5 flex items-center justify-between hover:bg-slate-800/40 transition-colors cursor-pointer text-xs group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {item.is_dir ? (
                      <Folder className="w-4 h-4 text-lantern-400 flex-shrink-0 fill-lantern-400/20" />
                    ) : (
                      <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-slate-200 group-hover:text-white truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-6 text-slate-400 font-mono text-[11px] flex-shrink-0">
                    <span className="hidden sm:inline text-slate-500">{item.modified_human}</span>
                    <span className="w-16 text-right">{item.size_human}</span>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.is_dir && (
                        <a
                          href={api.getDownloadUrl(item.path)}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={(e) => handleDeleteItem(item.path, e)}
                        className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Text File Editor Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-obsidian-950 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl flex flex-col h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-sm font-bold text-white">{previewFile.name}</span>
                <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                  ({previewFile.path})
                </span>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={previewFile.content}
              onChange={(e) => setPreviewFile({ ...previewFile, content: e.target.value })}
              className="flex-1 w-full bg-obsidian-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-lantern-500 resize-none"
              spellCheck={false}
            />

            <div className="flex items-center justify-between pt-2">
              <a
                href={api.getDownloadUrl(previewFile.path)}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSaveFile}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-lantern-500 hover:bg-lantern-400 text-obsidian-950 text-xs font-bold shadow-lantern"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateFolder} className="bg-obsidian-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Create New Folder</h3>
            <input
              type="text"
              autoFocus
              required
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-lantern-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-lantern-500 text-obsidian-950 text-xs font-bold shadow-lantern"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
