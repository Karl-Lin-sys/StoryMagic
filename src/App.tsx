import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ChevronLeft, ChevronRight, Volume2, Loader2, RefreshCw } from 'lucide-react';
import { StoryPage } from './types';

const StoryBook: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateStory = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPages([]);
    setCurrentPage(0);

    try {
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      
      if (data.story) {
        setPages(data.story);
        // Start generating the first image immediately
        generateImage(0, data.story[0].imagePrompt);
      }
    } catch (error) {
      console.error('Error generating story:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (index: number, imagePrompt: string) => {
    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = await response.json();
      
      setPages(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], imageUrl: data.imageUrl };
        }
        return next;
      });
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const playAudio = async () => {
    const page = pages[currentPage];
    if (!page) return;

    if (page.audioData) {
      if (audioRef.current) {
        audioRef.current.src = `data:audio/wav;base64,${page.audioData}`;
        audioRef.current.play();
      }
      return;
    }

    setAudioLoading(true);
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: page.text }),
      });
      const data = await response.json();
      
      if (data.audio) {
        setPages(prev => {
          const next = [...prev];
          next[currentPage] = { ...next[currentPage], audioData: data.audio };
          return next;
        });
        
        if (audioRef.current) {
          audioRef.current.src = `data:audio/wav;base64,${data.audio}`;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setAudioLoading(false);
    }
  };

  // Pre-generate images for next pages
  useEffect(() => {
    if (pages.length > 0) {
      const nextIdx = currentPage + 1;
      if (nextIdx < pages.length && !pages[nextIdx].imageUrl) {
        generateImage(nextIdx, pages[nextIdx].imagePrompt);
      }
    }
  }, [currentPage, pages]);

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-4 border-yellow-400"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Sparkles className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4 font-sans">StoryMagic</h1>
          <p className="text-gray-600 mb-6 font-medium">What kind of adventure should we go on today?</p>
          
          <div className="relative mb-6">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A brave puppy in space..."
              className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 focus:border-yellow-400 focus:ring-0 outline-none text-lg transition-all"
              onKeyDown={(e) => e.key === 'Enter' && generateStory()}
            />
          </div>

          <button
            onClick={generateStory}
            disabled={loading || !prompt.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <BookOpen className="w-6 h-6" />
                Create My Story!
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  const currentPageData = pages[currentPage];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <audio ref={audioRef} hidden />
      
      <div className="mb-6 flex justify-between items-center">
        <button 
          onClick={() => { setPages([]); setPrompt(''); }}
          className="flex items-center gap-2 text-gray-500 hover:text-yellow-500 font-bold transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Start New Story
        </button>
        <div className="bg-yellow-100 px-4 py-2 rounded-full text-yellow-700 font-bold">
          Page {currentPage + 1} of {pages.length}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-white min-h-[600px] flex flex-col">
        <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {currentPageData.imageUrl ? (
              <motion.img
                key={currentPageData.imageUrl}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                src={currentPageData.imageUrl}
                alt="Story illustration"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 font-medium">Drawing a picture for you...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 flex-1 flex flex-col justify-between">
          <motion.p
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-sans leading-relaxed text-gray-800 text-center mb-8"
          >
            {currentPageData.text}
          </motion.p>

          <div className="flex justify-between items-center gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-4 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-all shadow-md"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <button
              onClick={playAudio}
              disabled={audioLoading}
              className="flex items-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {audioLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
              Read to Me
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
              disabled={currentPage === pages.length - 1}
              className="p-4 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 disabled:opacity-0 transition-all shadow-lg"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
      
      {currentPage === pages.length - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <p className="text-xl text-gray-500 font-medium italic">The End!</p>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-indigo-50 font-sans selection:bg-yellow-200">
      <header className="p-6 text-center">
        <h1 className="text-2xl font-black text-indigo-900 tracking-tighter flex items-center justify-center gap-2">
          <BookOpen className="w-8 h-8 text-yellow-400" />
          STORYMAGIC
        </h1>
      </header>
      
      <main className="container mx-auto pb-20">
        <StoryBook />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center pointer-events-none">
        <p className="text-indigo-300 text-sm font-medium">Created with Magic AI</p>
      </footer>
    </div>
  );
}
