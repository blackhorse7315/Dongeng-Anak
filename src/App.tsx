import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Plus, Library as LibraryIcon, Volume2, Share2, Trash2, ArrowLeft, ArrowRight, Loader2, Pause } from 'lucide-react';
import { aiService } from './services/aiService';
import { Story } from './types';

// Storage Key
const STORAGE_KEY = 'cerita_ajaib_books';

export default function App() {
  const [view, setView] = useState<'home' | 'create' | 'reader' | 'library'>('home');
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Load stories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setStories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load stories", e);
      }
    }
  }, []);

  // Save stories to localStorage
  useEffect(() => {
    if (stories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    }
  }, [stories]);

  const handleGenerate = async () => {
    if (!titleInput.trim()) return;
    setIsGenerating(true);
    setCurrentPage(0);
    
    try {
      // 1. Generate Story Structure (Text & Prompts)
      const pages = await aiService.generateStory(titleInput);
      
      // 2. Initial state with no images yet
      const initialStory: Story = {
        id: crypto.randomUUID(),
        title: titleInput,
        pages: pages.map(p => ({ ...p, imageUrl: undefined })),
        author: 'Petualang Cilik',
        createdAt: Date.now(),
      };

      // 3. Generate the FIRST image immediately to show the reader
      const firstImageUrl = await aiService.generateImage(pages[0].imagePrompt);
      initialStory.pages[0].imageUrl = firstImageUrl;
      
      setCurrentStory(initialStory);
      setStories(prev => [initialStory, ...prev]);
      setView('reader');
      setIsGenerating(false); // Stop main loader once reader is shown
      setTitleInput('');

      // 4. Generate remaining images in background
      pages.slice(1).forEach(async (page, index) => {
        try {
          const imageUrl = await aiService.generateImage(page.imagePrompt);
          setStories(prevStories => {
            const updated = prevStories.map(s => {
              if (s.id === initialStory.id) {
                const newPages = [...s.pages];
                newPages[index + 1].imageUrl = imageUrl;
                return { ...s, pages: newPages };
              }
              return s;
            });
            return updated;
          });
          
          // Also update current view if it's the same story
          setCurrentStory(prev => {
            if (prev?.id === initialStory.id) {
              const newPages = [...prev.pages];
              newPages[index + 1].imageUrl = imageUrl;
              return { ...prev, pages: newPages };
            }
            return prev;
          });
        } catch (err) {
          console.error("Delayed image generation failed", err);
        }
      });

    } catch (error) {
      alert("Oops! Sihir pengarang cerita sedang beristirahat. Coba lagi ya!");
      setIsGenerating(false);
    }
  };

  const handleReadAloud = async (text: string) => {
    if (playing) {
      const audio = document.getElementById('narrator') as HTMLAudioElement;
      audio?.pause();
      setPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const url = await aiService.generateNarration(text);
      setAudioUrl(url);
      setPlaying(true);
    } catch (error) {
      console.error("Narrator failed", error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const deleteStory = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Hapus cerita ini?")) {
      setStories(stories.filter(s => s.id !== id));
    }
  };

  const shareStory = (story: Story, e: any) => {
    e.stopPropagation();
    const shareText = `Baca cerita "${story.title}" buatan AI Cerita Ajaib!`;
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: shareText,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Pesan Berbagi disalin ke papan klip!");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] font-sans text-[#4A3728] selection:bg-orange-200">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-orange-400 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView('home')}
          >
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-200">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase italic text-orange-600">Cerita Ajaib</h1>
          </motion.div>
          <div className="flex gap-2">
             <button 
              id="btn-library"
              onClick={() => setView('library')}
              className="px-4 py-2 bg-white border-2 border-orange-200 rounded-full text-sm font-bold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <LibraryIcon size={18} /> Koleksi
            </button>
            <button 
              id="btn-new"
              onClick={() => setView('create')}
              className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 flex items-center gap-2"
            >
              <Plus size={18} /> Cerita Baru
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <h2 className="text-5xl font-black mb-6 leading-tight">
                Setiap Judul Adalah<br />
                <span className="text-orange-500 italic">Pintu Petualangan Baru</span>
              </h2>
              <p className="text-lg opacity-70 mb-10 max-w-md mx-auto italic">
                Tulis satu judul pendek, dan lihat bagaimana AI merangkai kata dan warna menjadi sebuah mahakarya bagi si kecil.
              </p>
              <button 
                id="btn-start"
                onClick={() => setView('create')}
                className="px-8 py-4 bg-orange-500 text-white rounded-2xl text-xl font-bold hover:scale-105 transition-transform shadow-xl shadow-orange-200"
              >
                Mulai Petualangan
              </button>
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-orange-100 max-w-xl mx-auto"
            >
              <h3 className="text-2xl font-black mb-2">Ingin membuat cerita apa hari ini?</h3>
              <p className="mb-8 opacity-60 text-sm">Contoh: "Kucing Terbang ke Bulan" atau "Hutan Permen Ajaib"</p>
              
              <div className="space-y-6">
                <input 
                  id="title-input"
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Ketik judul ceritamu di sini..."
                  className="w-full px-6 py-4 bg-orange-50 border-2 border-transparent focus:border-orange-300 rounded-2xl outline-none text-lg font-medium transition-all text-[#4A3728]"
                  disabled={isGenerating}
                />
                
                <button 
                  id="btn-generate"
                  onClick={handleGenerate}
                  disabled={isGenerating || !titleInput.trim()}
                  className="w-full py-5 bg-orange-500 text-white rounded-2xl text-xl font-black hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-100"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" /> Merangkai Sihir...
                    </>
                  ) : (
                    <>Beri Kejutan!</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'reader' && currentStory && (
            <motion.div 
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-white p-2"
            >
              <div className="relative aspect-[4/3] bg-orange-50 overflow-hidden rounded-[32px]">
                <AnimatePresence mode="wait">
                  {currentStory.pages[currentPage].imageUrl ? (
                    <motion.img 
                      key={currentPage}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.6 }}
                      src={currentStory.pages[currentPage].imageUrl} 
                      alt="Story Illustration"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <motion.div 
                      key="loading-img"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full flex flex-col items-center justify-center gap-4 bg-orange-50"
                    >
                      <Loader2 className="w-12 h-12 text-orange-400 animate-spin" />
                      <p className="text-orange-400 font-bold animate-pulse">Melukis Keajaiban...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Overlay Controls */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                  <div className="bg-black/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                    Halaman {currentPage + 1} / {currentStory.pages.length}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      id="btn-voice"
                      onClick={() => handleReadAloud(currentStory.pages[currentPage].text)}
                      disabled={isAudioLoading}
                      className="p-3 bg-white text-orange-500 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                    >
                      {isAudioLoading ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Volume2 />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-10">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={currentPage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-2xl font-medium leading-relaxed mb-12 min-h-[140px] text-center"
                  >
                    "{currentStory.pages[currentPage].text}"
                  </motion.p>
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center gap-2 font-bold opacity-50 hover:opacity-100 disabled:opacity-20 transition-opacity"
                  >
                    <ArrowLeft size={24} /> Sebelumnya
                  </button>
                  
                  <div className="flex gap-1">
                    {currentStory.pages.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'w-8 bg-orange-500' : 'bg-orange-200'}`} 
                      />
                    ))}
                  </div>

                  {currentPage === currentStory.pages.length - 1 ? (
                     <button 
                      onClick={() => setView('library')}
                      className="px-6 py-3 bg-orange-100 text-orange-700 rounded-2xl font-bold hover:bg-orange-200 transition-colors"
                    >
                      Selesai Membaca
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentPage(Math.min(currentStory.pages.length - 1, currentPage + 1))}
                      className="flex items-center gap-2 font-bold text-orange-600 hover:gap-3 transition-all"
                    >
                      Selanjutnya <ArrowRight size={24} />
                    </button>
                  )}
                </div>
              </div>
              
              {audioUrl && (
                <audio 
                  id="narrator"
                  src={audioUrl}
                  autoPlay={playing}
                  className="hidden"
                  onEnded={() => setPlaying(false)}
                />
              )}
            </motion.div>
          )}

          {view === 'library' && (
            <motion.div 
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black">Koleksi Ceritaku</h2>
                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">{stories.length} Cerita</span>
              </div>
              
              {stories.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-orange-200">
                  <p className="text-lg italic opacity-50">Belum ada cerita ajaib. Ayo buat satu!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stories.map(story => (
                    <motion.div 
                      key={story.id}
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        setCurrentStory(story);
                        setCurrentPage(0);
                        setView('reader');
                      }}
                      className="group bg-white p-4 rounded-3xl shadow-md border-2 border-transparent hover:border-orange-200 cursor-pointer transition-all"
                    >
                      <div className="aspect-video rounded-2xl overflow-hidden bg-orange-50 mb-4 relative">
                        <img 
                          src={story.pages[0].imageUrl} 
                          alt="Cover" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <p className="text-white text-xs font-bold uppercase tracking-widest">Klik untuk Membaca</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-lg leading-tight mb-1 truncate">{story.title}</h4>
                          <p className="text-xs opacity-50 uppercase tracking-tighter">{new Date(story.createdAt).toLocaleDateString('id-ID')}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => shareStory(story, e)}
                            className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg"
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => deleteStory(story.id, e)}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Meta */}
      <footer className="max-w-4xl mx-auto px-4 py-12 text-center opacity-30 text-xs uppercase tracking-[0.2em] font-bold">
        Dibangun dengan Sihir AI Cerita Ajaib &bull; 2024
      </footer>
    </div>
  );
}

