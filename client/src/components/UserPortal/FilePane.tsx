import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File as FileIcon,
  Upload,
  Download,
  Trash2,
  Eye,
  Plus,
  ArrowUp,
  ChevronRight,
  Search,
  RefreshCw,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  FileCode,
  Archive,
  Check,
  X,
  Play,
  Share2,
  HardDrive,
  LayoutGrid,
  List,
  Edit2,
  Copy,
  FolderPlus,
  ExternalLink,
  Users
} from 'lucide-react';
import { FileItem, Bookmark } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface FilePaneProps {
  initialPath?: string;
  onPlayVideo?: (videoPath: string, title: string) => void;
}

export const FilePane: React.FC<FilePaneProps> = ({ initialPath, onPlayVideo }) => {
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drag & drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ active: boolean; message: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Folder Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [newRenameName, setNewRenameName] = useState('');

  // Copy link feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Image Lightbox / Text Preview Modal
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'text' | 'audio'; path: string; name: string; content?: string } | null>(null);

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
    loadDirectory(initialPath || '~/.lantern/family_shared');
  }, [initialPath]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadStatus({ active: true, message: `Uploading ${files.length} item(s)...` });
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus({ active: true, message: `Uploading ${file.name} (${i + 1}/${files.length})...` });
        await api.uploadFile(currentPath, file);
      }
      setUploadStatus({ active: true, message: 'Upload complete! Storage updated.' });
      setTimeout(() => setUploadStatus(null), 2500);
      await loadDirectory(currentPath);
    } catch (err: any) {
      setUploadStatus({ active: true, message: err.message || 'Failed to upload file', isError: true });
      setTimeout(() => setUploadStatus(null), 4500);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(currentPath, newFolderName.trim());
      setShowNewFolderModal(false);
      setNewFolderName('');
      await loadDirectory(currentPath);
      toast.success('Folder created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !newRenameName.trim()) return;
    try {
      await api.renameFile(renameItem.path, newRenameName.trim());
      setShowRenameModal(false);
      setRenameItem(null);
      setNewRenameName('');
      await loadDirectory(currentPath);
      toast.success('Item renamed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename item');
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await api.deleteFile(item.path);
      await loadDirectory(currentPath);
      toast.success(`Deleted ${item.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  const handleCopyLink = (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    const fullUrl = window.location.origin + api.getDownloadUrl(item.path);
    navigator.clipboard.writeText(fullUrl);
    setCopiedPath(item.path);
    setTimeout(() => setCopiedPath(null), 2200);
  };

  const handleItemClick = (item: FileItem) => {
    if (item.is_dir) {
      loadDirectory(item.path);
      return;
    }

    const ext = item.extension.toLowerCase();
    const isVideo = ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext);
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
    const isAudio = ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext);

    if (isVideo && onPlayVideo) {
      onPlayVideo(item.path, item.name);
    } else if (isImage) {
      setPreviewMedia({
        type: 'image',
        path: api.getDownloadUrl(item.path),
        name: item.name
      });
    } else if (isAudio) {
      setPreviewMedia({
        type: 'audio',
        path: api.getDownloadUrl(item.path),
        name: item.name
      });
    } else {
      // Text or general preview
      api.previewFile(item.path)
        .then(res => {
          if (res.content) {
            setPreviewMedia({
              type: 'text',
              path: item.path,
              name: item.name,
              content: res.content
            });
          } else {
            // Trigger browser download directly
            window.open(api.getDownloadUrl(item.path), '_blank');
          }
        })
        .catch(() => {
          window.open(api.getDownloadUrl(item.path), '_blank');
        });
    }
  };

  const getFileIcon = (ext: string) => {
    ext = ext.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return { icon: ImageIcon, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    }
    if (['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext)) {
      return { icon: Film, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
    }
    if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) {
      return { icon: Music, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) {
      return { icon: FileText, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'c', 'sh'].includes(ext)) {
      return { icon: FileCode, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' };
    }
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) {
      return { icon: Archive, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    }
    return { icon: FileIcon, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
  };

  // Filter items by search input
  const filteredItems = items.filter(it =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Parse path breadcrumbs
  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
      }}
      className="space-y-6 relative"
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Drag Over Overlay Visual */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-amber-500/15 backdrop-blur-md border-2 border-dashed border-amber-500 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in shadow-2xl">
          <Upload className="w-14 h-14 text-amber-500 animate-bounce mb-3" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Drop files to save into Lantern Cloud</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono font-semibold max-w-md">
            Destination: {currentPath}
          </p>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white/85 dark:bg-obsidian-900/85 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                <Folder className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Family Cloud & Files
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Direct upload, download, and streaming for everyone at home.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar: Upload, New Folder, View Mode, Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-obsidian-850 hover:bg-slate-200 dark:hover:bg-obsidian-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95"
              title="Create New Folder"
            >
              <FolderPlus className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">New Folder</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lantern transition-all active:scale-95"
              title="Upload File"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>

            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center bg-slate-100 dark:bg-obsidian-850 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-obsidian-750 text-amber-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-obsidian-750 text-amber-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => loadDirectory(currentPath)}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-obsidian-850 hover:bg-slate-200 dark:hover:bg-obsidian-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Family Shortcuts / Bookmarks */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 pt-1">
          {bookmarks.map((bm) => (
            <button
              key={bm.path}
              onClick={() => loadDirectory(bm.path)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border ${
                currentPath === bm.path
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm scale-105'
                  : 'bg-slate-100/80 dark:bg-obsidian-850/80 hover:bg-slate-200 dark:hover:bg-obsidian-800 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>
                {bm.name === 'Family Shared' ? <Users className="w-3.5 h-3.5 text-purple-400" /> :
                 bm.name === 'Videos' ? <Film className="w-3.5 h-3.5 text-pink-400" /> :
                 bm.name === 'Downloads' ? <Download className="w-3.5 h-3.5 text-cyan-400" /> :
                 bm.name === 'Documents' ? <FileText className="w-3.5 h-3.5 text-blue-400" /> :
                 <Folder className="w-3.5 h-3.5 text-amber-400" />}
              </span>
              <span>{bm.name}</span>
            </button>
          ))}
        </div>

        {/* Breadcrumbs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-xs overflow-x-auto no-scrollbar py-1">
            {parentPath && (
              <button
                onClick={() => loadDirectory(parentPath)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-obsidian-800 text-slate-500 hover:text-amber-500 transition-colors mr-1 flex items-center space-x-1 font-semibold"
                title="Up one folder"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Up</span>
              </button>
            )}

            <button
              onClick={() => loadDirectory('/')}
              className="font-bold text-slate-400 hover:text-amber-500 transition-colors px-1"
            >
              /
            </button>

            {pathParts.map((part, index) => {
              const fullSegment = '/' + pathParts.slice(0, index + 1).join('/');
              const isLast = index === pathParts.length - 1;
              return (
                <React.Fragment key={fullSegment}>
                  <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <button
                    onClick={() => loadDirectory(fullSegment)}
                    className={`font-mono text-xs truncate max-w-[130px] transition-colors px-1.5 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-obsidian-800 ${
                      isLast
                        ? 'font-bold text-slate-900 dark:text-white bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 hover:text-amber-500'
                    }`}
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Search Filter Input */}
          <div className="relative min-w-[220px] sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items in this folder..."
              className="w-full bg-slate-100/80 dark:bg-obsidian-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Upload Notification Pill */}
      {uploadStatus && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all shadow-md animate-in fade-in duration-200 ${
          uploadStatus.isError
            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            <span>{uploadStatus.message}</span>
          </div>
          <button onClick={() => setUploadStatus(null)} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Copied Link Toast */}
      {copiedPath && (
        <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lantern animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>File download link copied to clipboard!</span>
          </div>
          <button onClick={() => setCopiedPath(null)} className="p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* MAIN FILES VIEW (GRID OR LIST) */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-obsidian-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
            <Folder className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'No files match your search' : 'Folder is empty'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Drag and drop files from your phone or laptop, or click Upload to save media to your family cloud.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Upload to this folder</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const isDir = item.is_dir;
            const extMeta = getFileIcon(item.extension);
            const IconComponent = isDir ? Folder : extMeta.icon;
            const isVideo = ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(item.extension.toLowerCase());
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.extension.toLowerCase());

            return (
              <div
                key={item.path}
                onClick={() => handleItemClick(item)}
                className={`group p-3.5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative hover:scale-[1.02] shadow-sm hover:shadow-xl ${
                  isDir
                    ? 'bg-amber-500/5 dark:bg-obsidian-900/90 border-amber-500/20 dark:border-slate-800 hover:border-amber-500/50'
                    : 'bg-white/80 dark:bg-obsidian-900/80 backdrop-blur-xl border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50'
                }`}
              >
                {/* Top Icon & Direct Download Pill */}
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                    isDir
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                      : extMeta.color
                  }`}>
                    <IconComponent className="w-5 h-5 fill-current" />
                  </div>

                  {/* 1-Click Direct Download Button */}
                  {!isDir && (
                    <a
                      href={api.getDownloadUrl(item.path)}
                      download={item.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 transition-colors shadow-sm active:scale-90"
                      title="Download file directly"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* File Details */}
                <div className="space-y-1">
                  <h4
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500 transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{item.size_human}</span>
                    {isDir ? (
                      <span className="font-semibold text-amber-500">Folder</span>
                    ) : (
                      <span className="uppercase">{item.extension || 'File'}</span>
                    )}
                  </div>
                </div>

                {/* Hover Toolbar: Preview, Rename, Copy Link, Delete */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  {isVideo ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-purple-500">
                      <Play className="w-3 h-3 fill-current" />
                      <span>Stream</span>
                    </span>
                  ) : isImage ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-blue-500">
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </span>
                  ) : isDir ? (
                    <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
                      <span>Open</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">{item.modified_human.split(' ')[0]}</span>
                  )}

                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isDir && (
                      <button
                        onClick={(e) => handleCopyLink(e, item)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-obsidian-800 text-slate-400 hover:text-amber-500 transition-colors"
                        title="Copy file link"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameItem(item);
                        setNewRenameName(item.name);
                        setShowRenameModal(true);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-obsidian-800 text-slate-400 hover:text-amber-500 transition-colors"
                      title="Rename item"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteItem(e, item)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all"
                      title="Delete item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (DETAILED TABLE) */
        <div className="bg-white/80 dark:bg-obsidian-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50 dark:bg-obsidian-950/40">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Type</th>
                  <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => {
                  const isDir = item.is_dir;
                  const extMeta = getFileIcon(item.extension);
                  const IconComponent = isDir ? Folder : extMeta.icon;

                  return (
                    <tr
                      key={item.path}
                      onClick={() => handleItemClick(item)}
                      className="hover:bg-slate-50/80 dark:hover:bg-obsidian-850/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                            isDir ? 'bg-amber-500/15 border-amber-500/30 text-amber-500' : extMeta.color
                          }`}>
                            <IconComponent className="w-4 h-4 fill-current" />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors truncate max-w-[200px] sm:max-w-xs">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {item.size_human}
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-obsidian-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase">
                          {isDir ? 'Folder' : item.extension || 'File'}
                        </span>
                      </td>

                      <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                        {item.modified_human}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          {!isDir && (
                            <a
                              href={api.getDownloadUrl(item.path)}
                              download={item.name}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-amber-500 hover:text-slate-950 text-slate-500 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {!isDir && (
                            <button
                              onClick={(e) => handleCopyLink(e, item)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-amber-500 hover:text-slate-950 text-slate-500 transition-colors"
                              title="Copy link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setRenameItem(item);
                              setNewRenameName(item.name);
                              setShowRenameModal(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-750 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteItem(e, item)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Folder className="w-5 h-5 text-amber-500 fill-current" />
                <span>Create New Folder</span>
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Summer Vacation, Tax Receipts, Homework"
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lantern transition-all"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME ITEM MODAL */}
      {showRenameModal && renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <span>Rename {renameItem.is_dir ? 'Folder' : 'File'}</span>
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newRenameName}
                  onChange={(e) => setNewRenameName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lantern transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW / LIGHTBOX MODAL */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4 text-white relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold truncate max-w-[80%]">{previewMedia.name}</span>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center min-h-[240px] max-h-[70vh] overflow-auto">
              {previewMedia.type === 'image' && (
                <img
                  src={previewMedia.path}
                  alt={previewMedia.name}
                  className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-lg"
                />
              )}

              {previewMedia.type === 'audio' && (
                <div className="w-full max-w-md p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                    <Music className="w-8 h-8 stroke-[1.75]" />
                  </div>
                  <audio controls autoPlay src={previewMedia.path} className="w-full mt-2" />
                </div>
              )}

              {previewMedia.type === 'text' && (
                <pre className="w-full max-h-[60vh] bg-slate-900 p-4 rounded-2xl font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap border border-slate-800">
                  {previewMedia.content || 'File is empty'}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-mono">Location: {previewMedia.path}</span>
              <a
                href={previewMedia.path}
                download={previewMedia.name}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
