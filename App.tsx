import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Search, Sparkles, AlertCircle, FileText, Image as ImageIcon, Camera, Trash2, Link as LinkIcon, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { analyzeContent } from './services/geminiService';
import { AnalysisState } from './types';
import ResultsDisplay from './components/ResultsDisplay';

const LOADING_STEPS = [
  "Scanning content structure...",
  "Extracting factual claims...",
  "Cross-referencing reputable sources...",
  "Analyzing visual evidence...",
  "Synthesizing final verdict..."
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [state, setState] = useState<AnalysisState>({ status: 'idle', data: null });
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      }, 3000); // Slower steps to match realistic API latency
    }
    return () => clearInterval(interval);
  }, [state.status]);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAll = () => {
    setInputText('');
    removeImage();
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
    
    // Handle Files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelect(file);
        return;
      }
    }

    // Handle Text/URL Drag
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setState({ status: 'analyzing', data: null });

    try {
      let base64Image: string | undefined;
      if (selectedImage) {
        base64Image = await fileToBase64(selectedImage);
      }

      const result = await analyzeContent(inputText, base64Image);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Search className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-serif font-bold tracking-tight text-slate-800">
              Instant <span className="text-blue-600">Fact-Check</span> Lens
            </h1>
          </div>
          <div className="text-xs font-medium text-slate-400 border border-slate-200 px-2 py-1 rounded-full bg-slate-50">
            Powered by Gemini 3 Pro
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Input Section - Show when idle OR when error (to allow retry) */}
        {(state.status === 'idle' || state.status === 'error') && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                Verify content in seconds.
              </h2>
              <p className="text-slate-500 text-lg">
                Drag & drop a screenshot, paste a URL, or enter a rumor. Our AI agent extracts claims and cross-references live evidence.
              </p>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx(
                "bg-white rounded-2xl shadow-xl shadow-slate-200/50 border overflow-hidden transition-all duration-200 relative",
                isDragging ? "border-blue-500 ring-4 ring-blue-500/10 scale-[1.01]" : "border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20"
              )}
            >
              {/* Drop Overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-blue-50/90 z-10 flex flex-col items-center justify-center text-blue-600 animate-fade-in backdrop-blur-sm">
                  <div className="bg-white p-6 rounded-full shadow-2xl mb-4">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight">Drop to analyze</span>
                  <span className="text-blue-600/80 mt-2 font-medium">Supports Images, Text files, and URLs</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                   <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Input Content</div>
                   {(inputText || selectedImage) && (
                     <button
                        type="button"
                        onClick={clearAll}
                        className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-slate-100"
                     >
                       <Trash2 className="w-3 h-3" /> Clear All
                     </button>
                   )}
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste text, a URL (e.g., https://example.com/news), or drag & drop an image/screenshot here..."
                  className="w-full min-h-[120px] text-lg placeholder:text-slate-300 border-none resize-none focus:ring-0 text-slate-700 p-0"
                />
                
                {imagePreview && (
                  <div className="mt-4 relative inline-block group animate-fade-in">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-32 rounded-lg border border-slate-200 shadow-sm object-cover" 
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-slate-200 shadow-md text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileInputChange}
                    accept="image/*"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="hidden xs:inline">Image</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={startCamera}
                    className="cursor-pointer flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="hidden xs:inline">Camera</span>
                  </button>

                  <span className="text-slate-300 hidden sm:inline">|</span>

                  <div className="flex items-center gap-2 text-slate-500 text-sm px-2">
                      <LinkIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">URL supported</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inputText && !selectedImage}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Check Facts
                </button>
              </div>
            </form>
            
            {state.status === 'error' && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3 animate-fade-in shadow-sm">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Analysis Failed</h4>
                  <p className="text-sm opacity-90">{state.error}</p>
                </div>
                <button 
                  onClick={() => setState({ status: 'idle', data: null, error: undefined })} 
                  className="text-red-700 hover:bg-red-100 p-1 rounded"
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
               <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />
               </div>
             </div>
             
             <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">Investigating Claims</h3>
             <p className="text-slate-500 mb-8 text-center">Our agent is scouring the web and analyzing visual evidence...</p>

             {/* Detailed Progress Bar */}
             <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
             
             <div className="w-full space-y-4">
               {LOADING_STEPS.map((step, idx) => {
                 const isActive = idx === loadingStepIndex;
                 const isCompleted = idx < loadingStepIndex;
                 
                 return (
                   <div 
                    key={idx} 
                    className={clsx(
                      "flex items-center gap-4 p-3 rounded-xl transition-all duration-500 border",
                      isActive ? "bg-white border-blue-100 shadow-sm scale-105" : 
                      isCompleted ? "bg-slate-50/50 border-transparent opacity-60" : "bg-transparent border-transparent opacity-40"
                    )}
                   >
                     <div className="flex-shrink-0">
                       {isCompleted ? (
                         <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                         </div>
                       ) : isActive ? (
                         <div className="w-6 h-6 flex items-center justify-center relative">
                            <div className="w-full h-full border-2 border-blue-600 rounded-full border-t-transparent animate-spin absolute"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                         </div>
                       ) : (
                         <div className="w-6 h-6 flex items-center justify-center text-slate-300">
                           <Circle className="w-4 h-4" />
                         </div>
                       )}
                     </div>
                     <span className={clsx(
                       "text-sm font-medium",
                       isActive ? "text-slate-800" : "text-slate-500"
                     )}>{step}</span>
                     
                     {isActive && (
                       <ArrowRight className="w-4 h-4 text-blue-400 ml-auto animate-pulse" />
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {/* Results View */}
        {state.status === 'complete' && state.data && (
           <div className="animate-fade-in">
               <div className="flex justify-between items-center mb-6">
                 <button 
                    onClick={() => { setState({ status: 'idle', data: null }); }}
                    className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors group"
                  >
                    <span className="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center group-hover:border-blue-200">
                        &larr;
                    </span>
                    Analyze New Content
                 </button>
               </div>
               <ResultsDisplay data={state.data} />
           </div>
        )}

      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-white/10">
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
                </div>
             </div>
             
             <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-10">
                <button 
                  onClick={stopCamera} 
                  className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-all backdrop-blur-md"
                  aria-label="Cancel"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={capturePhoto} 
                  className="bg-white text-black p-1 rounded-full shadow-lg shadow-white/10 transition-all transform hover:scale-105 active:scale-95"
                  aria-label="Capture Photo"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
                    <div className="w-14 h-14 bg-white rounded-full"></div>
                  </div>
                </button>

                <div className="w-14"></div> {/* Spacer to balance layout */}
             </div>
          </div>
          <p className="text-slate-400 mt-6 text-sm font-medium animate-pulse">Position content within grid</p>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

    </div>
  );
};

export default App;