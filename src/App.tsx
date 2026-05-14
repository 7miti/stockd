/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  History, 
  X, 
  Check, 
  Download, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Share2,
  AlertCircle,
  Loader2,
  Scan,
  Edit2,
  ArrowLeft,
  Copy,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractShoeData, ShoeLabelData } from './lib/gemini';
import { performLocalOCR, parseShoeDataLocally } from './lib/localOcr';
import { cn } from './lib/utils';

// Types
interface ScanHistoryItem extends ShoeLabelData {
  id: string;
  timestamp: number;
}

const AppLogo = () => (
  <div className="flex flex-col items-center">
    <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mb-4 shadow-xl">
      <span className="text-white text-5xl font-black italic tracking-tighter">SD</span>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<'home' | 'scanner' | 'result' | 'history'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [currentScan, setCurrentScan] = useState<ShoeLabelData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<ShoeLabelData> | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'raw'>('overview');
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const webcamRef = useRef<Webcam>(null);

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shoe_scans');
    if (saved) {
      try {
        setScans(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('shoe_scans', JSON.stringify(scans));
  }, [scans]);

  const handleCapture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setIsScanning(true);
    setError(null);

    try {
      if (isLocalMode) {
        // UNLIMITED LOCAL OCR
        const text = await performLocalOCR(imageSrc);
        const data = parseShoeDataLocally(text);
        setCurrentScan(data);
        setEditingItem(data);
      } else {
        // SMART AI OCR (Geniuses has limits)
        const base64 = imageSrc.split(',')[1];
        const data = await extractShoeData(base64);
        setCurrentScan(data);
        setEditingItem(data);
      }
      setView('result');
    } catch (err) {
      console.error(err);
      setError("Failed to extract data. Please try again with a clearer image.");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const saveScan = () => {
    if (!editingItem) return;
    
    const newScan: ScanHistoryItem = {
      ...(editingItem as ShoeLabelData),
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    
    setScans(prev => [newScan, ...prev]);
    setView('home');
    setCurrentScan(null);
    setEditingItem(null);
  };

  const deleteScan = (id: string) => {
    setScans(prev => prev.filter(s => s.id !== id));
  };

  const exportToExcel = () => {
    if (!scans.length) return;

    const headers = ['Product Name', 'Brand', 'EU Size', 'US Size', 'UK Size', 'Color', 'SKU', 'Type', 'Date'];
    
    const rows = scans.map(s => [
      `"${(s.productName || '').replace(/"/g, '""')}"`,
      `"${(s.brand || '').replace(/"/g, '""')}"`,
      `"${(s.euSize || '').replace(/"/g, '""')}"`,
      `"${(s.usSize || '').replace(/"/g, '""')}"`,
      `"${(s.ukSize || '').replace(/"/g, '""')}"`,
      `"${(s.color || '').replace(/"/g, '""')}"`,
      `"${(s.sku || '').replace(/"/g, '""')}"`,
      `"${(s.shoeType || 'N/A').replace(/"/g, '""')}"`,
      `"${new Date(s.timestamp).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'shoe_scans.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (!scans.length) return;
    const header = "Product Name\tBrand\tEU Size\tUS Size\tUK Size\tColor\tSKU\n";
    const body = scans.map(s => 
      `${s.productName}\t${s.brand}\t${s.euSize}\t${s.usSize}\t${s.ukSize}\t${s.color}\t${s.sku}`
    ).join('\n');
    
    navigator.clipboard.writeText(header + body);
    alert("History copied to clipboard!");
  };

  const filteredScans = scans.filter(scan => 
    (scan.productName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (scan.brand?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (scan.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-black">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AppLogo />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-black tracking-tighter mt-2 italic uppercase"
        >
          STOCK DISCREPANCY
        </motion.h1>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ delay: 1, duration: 1 }}
          className="h-1 bg-black mt-6 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white text-black rounded-sm flex items-center justify-center font-black italic text-xs">
            SD
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Stock Discrepancy</h1>
        </div>
        {view !== 'home' && (
          <button 
            onClick={() => setView('home')}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-4">
                <div className="h-64 bg-neutral-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-neutral-800 hover:border-blue-500/50 transition-colors group cursor-pointer"
                  onClick={() => setView('scanner')}
                >
                  <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Scan New Label</h2>
                  <p className="text-neutral-400 text-sm">Capture or upload a photo of a shoe box or tag for instant data extraction</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-neutral-400" />
                    Recent Scans
                  </h3>
                  {scans.length > 0 && (
                    <button 
                      onClick={() => setView('history')}
                      className="text-sm text-blue-500 font-medium hover:underline"
                    >
                      View All
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {scans.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 border border-neutral-800 rounded-2xl bg-neutral-900/50">
                      <p>No scans yet. Start scanning!</p>
                    </div>
                  ) : (
                    scans.slice(0, 3).map((scan) => (
                      <div 
                        key={scan.id} 
                        className="p-4 bg-neutral-900 rounded-2xl flex items-center justify-between group hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400 font-bold">
                            {scan.brand?.[0] || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold">{scan.productName}</p>
                            <p className="text-xs text-neutral-500">{scan.brand} • {new Date(scan.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-200 transition-colors" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {scans.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl font-medium hover:bg-neutral-800 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Excel
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl font-medium hover:bg-neutral-800 transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                    Copy
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'scanner' && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-[calc(100vh-80px)] bg-black"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="h-full w-full object-cover"
                  disablePictureInPicture={true}
                  forceScreenshotSourceSize={false}
                  imageSmoothing={true}
                  mirrored={false}
                  onUserMedia={() => {}}
                  onUserMediaError={() => {}}
                  screenshotQuality={1}
                  minScreenshotHeight={720}
                  minScreenshotWidth={1280}
                />
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 border-[3rem] border-black/40">
                <div className="w-full h-full border-2 border-white/50 rounded-2xl relative">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  
                  {isScanning && (
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                    />
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="absolute top-20 left-0 right-0 flex justify-center px-6 z-20">
                <div className="bg-neutral-900/80 backdrop-blur-md p-1 rounded-full border border-neutral-700 flex">
                  <button 
                    onClick={() => setIsLocalMode(false)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      !isLocalMode ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    Cloud AI (Smart)
                  </button>
                  <button 
                    onClick={() => setIsLocalMode(true)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      isLocalMode ? "bg-green-600 text-white" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    Local (Unlimited)
                  </button>
                </div>
              </div>

              <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 px-6">
                <p className="text-white text-sm font-medium bg-black/60 backdrop-blur-md px-4 py-2 rounded-full">
                  Align label within the frame
                </p>
                
                <div className="flex items-center gap-8">
                  <button 
                    onClick={() => setView('home')}
                    className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  
                  <button 
                    onClick={handleCapture}
                    disabled={isScanning}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[6px] border-white/30 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <Loader2 className="w-10 h-10 text-neutral-900 animate-spin" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-950 rounded-full" />
                    )}
                  </button>
                  
                  <div className="p-4 w-14" /> {/* Spacer */}
                </div>
              </div>
              
              {error && (
                <div className="absolute top-12 left-6 right-6 p-4 bg-red-500/90 backdrop-blur-md rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'result' && editingItem && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Extraction Results</h2>
                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Check className="w-3 h-3" />
                  Verified by AI
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Product Name</label>
                    <input 
                      type="text" 
                      value={editingItem.productName || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Brand</label>
                    <input 
                      type="text" 
                      value={editingItem.brand || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">SKU / Code</label>
                    <input 
                      type="text" 
                      value={editingItem.sku || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold border-b border-neutral-800 pb-2">Size Matrix</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">EU Size</label>
                      <input 
                        type="text" 
                        value={editingItem.euSize || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev, euSize: e.target.value }))}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="N/A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">US Size</label>
                      <input 
                        type="text" 
                        value={editingItem.usSize || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev, usSize: e.target.value }))}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="N/A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">UK Size</label>
                      <input 
                        type="text" 
                        value={editingItem.ukSize || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev, ukSize: e.target.value }))}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="N/A"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Color</label>
                    <input 
                      type="text" 
                      value={editingItem.color || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Type</label>
                    <input 
                      type="text" 
                      value={editingItem.shoeType || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, shoeType: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                      placeholder="Running, etc."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setView('scanner')}
                  className="flex-1 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Retake
                </button>
                <button 
                  onClick={saveScan}
                  className="flex-[2] p-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Save to History
                </button>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">History</h2>
                <div className="flex gap-2">
                  <button onClick={exportToExcel} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg">
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={copyToClipboard} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input 
                  type="text"
                  placeholder="Search products, brands, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Size (EU/US)</th>
                      <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredScans.map((scan) => (
                      <tr key={scan.id} className="group hover:bg-neutral-900/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm">{scan.productName}</p>
                          <p className="text-[10px] text-neutral-500 uppercase">{scan.brand}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-neutral-400">
                          {scan.sku || '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-neutral-400">
                          {scan.euSize || '-'}/{scan.usSize || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => deleteScan(scan.id)}
                            className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scans.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                          History is empty
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <button 
                onClick={() => setView('home')}
                className="w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button (only on home) */}
      {view === 'home' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setView('scanner')}
          className="absolute bottom-10 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 active:bg-blue-700 z-10"
        >
          <Camera className="w-8 h-8" />
        </motion.button>
      )}
    </div>
  );
}

