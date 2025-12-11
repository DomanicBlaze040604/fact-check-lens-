import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, Search, Sparkles, AlertCircle, Image as ImageIcon, 
  Camera, Trash2, Link as LinkIcon, CheckCircle2, Circle, ArrowRight, 
  History, Zap, Layers, Mic, Volume2, FileText, Palette
} from 'lucide-react';
import clsx from 'clsx';
import { analyzeContent } from './services/geminiService';
import { extractTextFromPdf } from './services/pdfService';
import { AnalysisState, FactCheckResponse, Verdict } from './types';
import ResultsDisplay from './components/ResultsDisplay';
import VerdictBadge from './components/VerdictBadge';

const LOADING_STEPS = [
  "Scanning content structure...",
  "Extracting factual claims...",
  "Cross-referencing reputable sources...",
  "Analyzing visual evidence...",
  "Synthesizing final verdict..."
];

const QUICK_PROMPTS = [
  "Do vaccines cause infertility?",
  "Is the moon landing fake?",
  "Does drinking water help weight loss?"
];

interface HistoryItem {
  id: string;
  query: string;
  date: number;
  verdict: Verdict;
  confidence: number;
}

type Theme = 'rasta' | 'ocean' | 'royal';

const THEMES: { id: Theme; name: string; color: string }[] = [
  { id: 'rasta', name: 'Truth', color: '#10B981' },
  { id: 'ocean', name: 'Trust', color: '#2563EB' },
  { id: 'royal', name: 'Vibe', color: '#9333EA' },
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [state, setState] = useState<AnalysisState>({ status: 'idle', data: null });
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<'standard' | 'deep'>('standard');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('rasta');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem('factCheckHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText((prev) => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach stream to video element when camera is shown
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  // Loading animation logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.status === 'analyzing') {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, analysisMode === 'standard' ? 800 : 3000); // Faster loading steps for standard mode
    }
    return () => clearInterval(interval);
  }, [state.status, analysisMode]);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          alert("Voice input is not supported in this browser.");
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          setIsListening(true);
          recognitionRef.current.start();
      }
  };

  const addToHistory = (query: string, result: FactCheckResponse) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      query: query.length > 60 ? query.substring(0, 60) + '...' : query,
      date: Date.now(),
      verdict: result.overall_verdict,
      confidence: result.overall_confidence
    };
    
    const newHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(newHistory);
    localStorage.setItem('factCheckHistory', JSON.stringify(newHistory));
  };

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSelectedPdf(null); // Clear PDF if image is selected
  };

  const handlePdfSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
        alert("Please select a valid PDF file.");
        return;
    }
    setSelectedPdf(file);
    setSelectedImage(null); // Clear image if PDF selected
    setImagePreview(null);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const onPdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handlePdfSelect(e.target.files[0]);
    }
  };

  const removeMedia = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const clearAll = () => {
    setInputText('');
    removeMedia();
    setState({ status: 'idle', data: null });
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelect(file);
        return;
      }
      if (file.type === 'application/pdf') {
        handlePdfSelect(file);
        return;
      }
    }

    const droppedText = e.dataTransfer.getData("text/plain");
    if (droppedText) {
      setInputText(droppedText);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            handleImageSelect(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage && !selectedPdf) return;

    setState({ status: 'analyzing', data: null });

    try {
      let finalInputText = inputText;
      let base64Image: string | undefined;

      // Process PDF
      if (selectedPdf) {
          try {
             // We reuse the loading visual, but might be nice to show "Reading PDF"
             const pdfText = await extractTextFromPdf(selectedPdf);
             finalInputText = (finalInputText ? finalInputText + "\n\n" : "") + "PDF CONTENT:\n" + pdfText;
          } catch (pdfErr: any) {
              throw new Error("Failed to read PDF file: " + pdfErr.message);
          }
      }

      if (selectedImage) {
        base64Image = await fileToBase64(selectedImage);
      }

      const result = await analyzeContent(finalInputText, base64Image, analysisMode);
      addToHistory(selectedPdf ? selectedPdf.name : (inputText || (selectedImage ? 'Image Analysis' : 'Unknown')), result);
      setState({ status: 'complete', data: result });
    } catch (err: any) {
      console.error(err);
      setState({ 
        status: 'error', 
        data: null, 
        error: err.message || "An unexpected error occurred. Please try again." 
      });
    }
  };

  const progress = Math.min(((loadingStepIndex + 1) / LOADING_STEPS.length) * 100, 100);

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-brand-yellow selection:text-brand-dark transition-colors duration-500">
      
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-brand-green/10 shadow-sm transition-colors duration-500">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setState({ status: 'idle', data: null })}>
            {/* Custom Logo for new theme */}
            <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-brand-yellow rounded-full opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-brand-green to-brand-dark w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors duration-500">
                    <CheckCircle2 className="text-white w-5 h-5" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-brand-red w-4 h-4 rounded-full border-2 border-white transition-colors duration-500"></div>
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold tracking-tight text-brand-dark leading-none transition-colors duration-500">
                Instant<span className="text-brand-green transition-colors duration-500">Fact</span>
              </h1>
              <span className="text-[10px] font-bold text-brand-red uppercase tracking-widest transition-colors duration-500">Lens</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Theme Switcher */}
             <div className="relative">
                <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Change Theme"
                >
                    <Palette className="w-5 h-5" />
                </button>
                {showThemeMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 min-w-[150px] animate-fade-in z-50">
                        {THEMES.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => { setCurrentTheme(theme.id); setShowThemeMenu(false); }}
                                className={clsx(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 last:mb-0",
                                    currentTheme === theme.id ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: theme.color }}></div>
                                {theme.name}
                            </button>
                        ))}
                    </div>
                )}
             </div>

             <button 
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  "p-2 rounded-lg transition-colors relative border border-transparent",
                  showHistory ? "bg-brand-yellow/20 text-brand-dark border-brand-yellow/50" : "text-slate-500 hover:bg-slate-100"
                )}
                title="History"
             >
                <History className="w-5 h-5" />
                {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full border border-white"></span>}
             </button>
             <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-brand-dark bg-brand-yellow/10 border border-brand-yellow/20 px-3 py-1.5 rounded-full shadow-sm transition-colors duration-500">
               <Zap className="w-3 h-3 text-brand-yellow fill-brand-yellow transition-colors duration-500" />
               <span>Fast Mode</span>
             </div>
          </div>
        </div>
      </header>

      {/* History Drawer/Dropdown */}
      {showHistory && (
         <div className="max-w-4xl mx-auto px-4 relative z-30">
            <div className="absolute right-4 top-2 w-80 bg-white rounded-xl shadow-xl border border-brand-yellow/20 p-4 animate-fade-in origin-top-right">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-sm font-bold text-brand-dark">Recent Checks</h3>
                 <button onClick={() => setHistory([])} className="text-xs text-brand-red hover:underline font-semibold">Clear</button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent history.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                   {history.map(item => (
                     <div key={item.id} className="p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-brand-green/10 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <VerdictBadge verdict={item.verdict} size="sm" />
                          <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 font-medium">{item.query}</p>
                     </div>
                   ))}
                </div>
              )}
            </div>
         </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 relative">
        
        {/* Input Section */}
        {(state.status === 'idle' || state.status === 'error') && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <h2 className="text-4xl font-serif font-bold text-brand-dark mb-4 tracking-tight transition-colors duration-500">
                Verify claims <span className="text-brand-green transition-colors duration-500">instantly</span>.
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Analyze text, images, and now PDF documents with high-speed AI.
              </p>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx(
                "glass-panel rounded-3xl shadow-2xl shadow-brand-green/5 overflow-hidden transition-all duration-300 relative group",
                isDragging ? "border-brand-green ring-4 ring-brand-green/10 scale-[1.01]" : "hover:border-brand-green/30"
              )}
            >
              {/* Drop Overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-brand-green animate-fade-in backdrop-blur-sm">
                  <div className="bg-brand-light p-6 rounded-full shadow-inner mb-4">
                    <Upload className="w-10 h-10 text-brand-green" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Drop to Analyze</span>
                  <span className="text-sm font-medium mt-2 text-slate-500">Supports Images & PDFs</span>
                </div>
              )}

              {/* Main Input Area */}
              <div className="p-6 sm:p-8 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste a suspicious claim, a news URL, or drag and drop an image/PDF..."
                  className="w-full min-h-[140px] text-lg sm:text-xl placeholder:text-slate-300 border-none resize-none focus:ring-0 text-slate-800 p-0 bg-transparent"
                />

                {/* Voice Input Button */}
                 <button
                    type="button"
                    onClick={toggleListening}
                    className={clsx(
                        "absolute top-6 right-6 p-2 rounded-full transition-all duration-300",
                        isListening ? "bg-brand-red text-white animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-brand-green/10 hover:text-brand-green"
                    )}
                    title="Voice Input"
                 >
                    <Mic className="w-5 h-5" />
                 </button>
                
                {/* Media Preview (Image or PDF) */}
                {(imagePreview || selectedPdf) && (
                  <div className="mt-6 relative inline-block group/img animate-fade-in">
                    {imagePreview ? (
                        <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="h-40 rounded-xl border border-slate-200 shadow-md object-cover" 
                        />
                    ) : (
                        <div className="h-40 w-32 rounded-xl border border-slate-200 shadow-md bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                            <FileText className="w-10 h-10 mb-2 text-brand-red" />
                            <span className="text-xs font-medium break-all line-clamp-2">{selectedPdf?.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1 uppercase">PDF Doc</span>
                        </div>
                    )}

                    <button
                      type="button"
                      onClick={removeMedia}
                      className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 border border-slate-200 shadow-md text-slate-400 hover:text-brand-red transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-brand-dark/80 text-white text-[10px] rounded backdrop-blur-sm font-medium transition-colors duration-500">
                      {imagePreview ? 'Image attached' : 'PDF attached'}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="bg-white/50 backdrop-blur-md px-6 py-4 border-t border-brand-green/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Left Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                  {/* File Inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileInputChange}
                    accept="image/*"
                    className="hidden"
                    id="file-upload"
                  />
                  <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={onPdfInputChange}
                    accept="application/pdf"
                    className="hidden"
                    id="pdf-upload"
                  />

                  <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex items-center justify-center w-10 h-10 text-slate-500 hover:text-brand-green hover:bg-brand-light rounded-md transition-all"
                        title="Upload Image"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </label>
                    <div className="w-px bg-slate-100 my-1 mx-0.5"></div>
                    <label
                        htmlFor="pdf-upload"
                        className="cursor-pointer flex items-center justify-center w-10 h-10 text-slate-500 hover:text-brand-red hover:bg-red-50 rounded-md transition-all"
                        title="Upload PDF"
                    >
                        <FileText className="w-5 h-5" />
                    </label>
                    <div className="w-px bg-slate-100 my-1 mx-0.5"></div>
                    <button
                        type="button"
                        onClick={startCamera}
                        className="cursor-pointer flex items-center justify-center w-10 h-10 text-slate-500 hover:text-brand-green hover:bg-brand-light rounded-md transition-all"
                        title="Use Camera"
                    >
                        <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm h-12">
                     <button
                       type="button"
                       onClick={() => setAnalysisMode('standard')}
                       className={clsx(
                         "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all h-full",
                         analysisMode === 'standard' ? "bg-brand-light text-brand-green shadow-sm" : "text-slate-400 hover:bg-slate-50"
                       )}
                     >
                       <Zap className="w-3.5 h-3.5" /> Fast
                     </button>
                     <button
                       type="button"
                       onClick={() => setAnalysisMode('deep')}
                       className={clsx(
                         "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all h-full",
                         analysisMode === 'deep' ? "bg-brand-yellow/10 text-brand-yellow shadow-sm" : "text-slate-400 hover:bg-slate-50"
                       )}
                     >
                       <Layers className="w-3.5 h-3.5" /> Deep
                     </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!inputText && !selectedImage && !selectedPdf}
                  className={clsx(
                    "w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95 duration-500",
                    !inputText && !selectedImage && !selectedPdf
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-brand-green hover:bg-brand-dark/80 text-white shadow-brand-green/30"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {analysisMode === 'deep' ? 'Analyze Deeply' : 'Check Now'}
                </button>
              </div>
            </form>

            {/* Quick Prompts */}
            {!inputText && !selectedImage && !selectedPdf && (
              <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-in delay-100">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(prompt)}
                    className="px-4 py-2 bg-white/60 hover:bg-brand-light border border-slate-200 hover:border-brand-green text-slate-600 text-sm rounded-full transition-all shadow-sm hover:shadow hover:text-brand-green font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            
            {state.status === 'error' && (
              <div className="mt-6 p-4 bg-red-50 text-brand-red rounded-xl border border-red-100 flex items-start gap-3 animate-fade-in shadow-sm max-w-2xl mx-auto">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1">Analysis Failed</h4>
                  <p className="text-sm opacity-90">{state.error}</p>
                </div>
                <button 
                  onClick={() => setState({ status: 'idle', data: null, error: undefined })} 
                  className="text-brand-red hover:bg-red-100 p-1 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Loading State */}
        {state.status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in max-w-xl mx-auto">
             
             {/* Main Spinner & Progress */}
             <div className="relative w-24 h-24 mb-10">
               <div className="absolute inset-0 bg-brand-light rounded-full animate-pulse transition-colors duration-500"></div>
               <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-brand-green rounded-full border-t-transparent animate-spin transition-colors duration-500"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-8 h-8 text-brand-green transition-colors duration-500" />
               </div>
             </div>
             
             <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2 transition-colors duration-500">
               {analysisMode === 'deep' ? 'Conducting Deep Dive...' : 'Rapid Verification...'}
             </h3>
             <p className="text-slate-500 mb-8 text-center max-w-xs mx-auto">
                {analysisMode === 'deep' ? 'Analyzing historical context & scientific consensus.' : 'Scanning global sources for immediate evidence.'}
             </p>

             {/* Detailed Progress Bar */}
             <div className="w-full bg-slate-200/50 rounded-full h-1.5 mb-8 overflow-hidden">
                <div 
                  className="bg-brand-green h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
             
             <div className="w-full space-y-3">
               {LOADING_STEPS.map((step, idx) => {
                 const isActive = idx === loadingStepIndex;
                 const isCompleted = idx < loadingStepIndex;
                 
                 return (
                   <div 
                    key={idx} 
                    className={clsx(
                      "flex items-center gap-4 p-3 rounded-xl transition-all duration-500",
                      isActive ? "bg-white border border-brand-green/30 shadow-md scale-105 z-10" : 
                      isCompleted ? "opacity-40 grayscale" : "opacity-30"
                    )}
                   >
                     <div className="flex-shrink-0">
                       {isCompleted ? (
                         <div className="w-6 h-6 bg-green-100 text-brand-green rounded-full flex items-center justify-center transition-colors duration-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                         </div>
                       ) : isActive ? (
                         <div className="w-6 h-6 flex items-center justify-center relative">
                            <div className="w-full h-full border-2 border-brand-yellow rounded-full border-t-transparent animate-spin absolute transition-colors duration-500"></div>
                         </div>
                       ) : (
                         <div className="w-6 h-6 flex items-center justify-center text-slate-300">
                           <Circle className="w-3.5 h-3.5" />
                         </div>
                       )}
                     </div>
                     <span className={clsx(
                       "text-sm font-medium",
                       isActive ? "text-brand-dark" : "text-slate-500"
                     )}>{step}</span>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {/* Results View */}
        {state.status === 'complete' && state.data && (
           <div className="animate-fade-in">
               <div className="flex justify-between items-center mb-8">
                 <button 
                    onClick={() => { setState({ status: 'idle', data: null }); }}
                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-green transition-colors group bg-white px-4 py-2 rounded-full border border-slate-200 hover:border-brand-green shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    New Search
                 </button>
               </div>
               <ResultsDisplay data={state.data} />
           </div>
        )}

      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
             <div className="bg-black relative aspect-[3/4] md:aspect-video w-full">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover" 
                />
                
                {/* Camera Overlay Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-30">
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white"></div>
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white"></div>
                  <div className="absolute inset-0 border-4 border-brand-green/50"></div>
                </div>
             </div>
             
             <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-center">
                <button 
                  onClick={stopCamera} 
                  className="text-white/70 hover:text-brand-red p-2 transition-colors font-medium"
                >
                  Cancel
                </button>
                
                <button 
                  onClick={capturePhoto} 
                  className="group relative"
                  aria-label="Capture Photo"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-transform group-active:scale-95 bg-brand-green/20">
                    <div className="w-14 h-14 bg-white rounded-full group-hover:bg-brand-green transition-colors"></div>
                  </div>
                </button>

                <div className="w-12"></div>
             </div>
          </div>
          <p className="text-white/60 mt-6 text-sm font-medium animate-pulse">Position content within grid</p>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

    </div>
  );
};

export default App;