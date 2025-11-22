
import React, { useState, useEffect, useRef } from 'react';
import { lookupTerm, playTTS, generateStoryFromWords, chatAboutTerm } from './services/geminiService';
import { WordEntry, ViewMode, ChatMessage, StoryResponse, TranslatedTerm, Conjugation, StaticVerb } from './types';
import { COMMON_VERBS } from './data/verbList';
import { 
  SearchIcon, BookIcon, BrainIcon, VolumeIcon, 
  SaveIcon, SparklesIcon, ArrowRightIcon, RefreshIcon, 
  MessageCircleIcon, XIcon, SendIcon 
} from './components/Icons';

// --- Subcomponents ---

// 1. Audio Button
const AudioButton = ({ text, small = false, light = false }: { text: string, small?: boolean, light?: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) return;
    setPlaying(true);
    await playTTS(text);
    setPlaying(false);
  };

  return (
    <button 
      onClick={handlePlay} 
      className={`${small ? 'p-1' : 'p-2'} rounded-full ${light ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-colors flex-shrink-0`}
      disabled={playing}
    >
      <VolumeIcon />
    </button>
  );
};

// 2. Conjugation Table
const ConjugationSection = ({ conjugations }: { conjugations: Conjugation[] }) => {
  if (!conjugations || conjugations.length === 0) return null;

  return (
    <div className="mt-6">
       <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
        <span className="text-lg">⚡</span> 动词变形
       </h3>
       <div className="overflow-x-auto no-scrollbar pb-4">
         <div className="flex gap-4 w-max">
           {conjugations.map((item, idx) => (
             <div key={idx} className="w-64 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 font-bold text-blue-800 text-sm text-center">
                  {item.tense}
                </div>
                <div className="p-3 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-400 text-xs text-right pr-2">Eu</span>
                    <span className="font-medium text-gray-800">{item.forms.eu}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-400 text-xs text-right pr-2">Tu</span>
                    <span className="font-medium text-gray-800">{item.forms.tu}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-400 text-xs text-right pr-2">Ele/Você</span>
                    <span className="font-medium text-gray-800">{item.forms.ele}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-400 text-xs text-right pr-2">Nós</span>
                    <span className="font-medium text-gray-800">{item.forms.nos}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-400 text-xs text-right pr-2">Eles/Vocês</span>
                    <span className="font-medium text-gray-800">{item.forms.eles}</span>
                  </div>
                </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

// 3. Chat Overlay
const ChatOverlay = ({ term, onClose }: { term: WordEntry, onClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const response = await chatAboutTerm(history, userMsg.text, term);
      setMessages(prev => [...prev, { role: 'model', text: response || "Sorry, I couldn't answer that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to the brain." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-bold">Chatting about "{term.term}"</h3>
          <button onClick={onClose}><XIcon /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
            Hi! I'm your Portuguese tutor. Ask me anything about <b>{term.term}</b>!
          </div>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-gray-400 text-center">AI is typing...</div>}
        </div>

        <div className="p-3 border-t bg-white flex gap-2">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button onClick={handleSend} disabled={loading} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewMode>(ViewMode.SEARCH);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<WordEntry | null>(null);
  const [notebook, setNotebook] = useState<WordEntry[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  
  // Notebook View State
  const [notebookTab, setNotebookTab] = useState<'SAVED' | 'VERBS'>('SAVED');
  const [verbListFilter, setVerbListFilter] = useState('');

  // Flashcard State
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcSource, setFcSource] = useState<'NOTEBOOK' | 'VERBS'>('NOTEBOOK');
  const [verbFilter, setVerbFilter] = useState<'ALL' | 'AR' | 'ER' | 'IR'>('ALL');

  useEffect(() => {
    const saved = localStorage.getItem('samba_notebook');
    if (saved) setNotebook(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('samba_notebook', JSON.stringify(notebook));
  }, [notebook]);

  // Moved useEffect here to fix Hook rule violation
  useEffect(() => {
    setFcIndex(0);
    setFcFlipped(false);
  }, [fcSource, verbFilter]);

  const handleSearch = async (term: string = searchTerm) => {
    if (!term.trim()) return;
    setLoading(true);
    setStoryData(null);
    setView(ViewMode.SEARCH);
    // If navigating from verb list, ensure we update the search box text too
    setSearchTerm(term); 
    
    try {
      const entry = await lookupTerm(term);
      setCurrentEntry(entry);
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please check your API key or try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = () => {
    if (!currentEntry) return;
    const exists = notebook.find(n => n.term === currentEntry.term);
    if (exists) {
      setNotebook(prev => prev.filter(n => n.term !== currentEntry.term));
    } else {
      setNotebook(prev => [currentEntry, ...prev]);
    }
  };

  const handleGenerateStory = async () => {
    if (notebook.length < 3) {
      alert("Save at least 3 words to generate a story!");
      return;
    }
    setLoadingStory(true);
    const words = notebook.slice(0, 10).map(w => w.term);
    try {
      const story = await generateStoryFromWords(words);
      setStoryData(story);
    } catch (e) {
      alert("Failed to generate story");
    } finally {
      setLoadingStory(false);
    }
  };

  const renderDerivatives = (items: (string | TranslatedTerm)[], colorClass: string) => {
    return items.map((item, i) => {
      if (typeof item === 'string') {
        return <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">{item}</span>;
      }
      return (
        <span key={i} className={`px-2 py-1 bg-white rounded-md border border-gray-200 flex flex-col leading-tight`}>
          <span className={`text-xs font-bold ${colorClass}`}>{item.word}</span>
          <span className="text-[10px] text-gray-400">{item.cn}</span>
        </span>
      );
    });
  };

  const renderSearchView = () => (
    <div className="w-full max-w-md mx-auto pb-24">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-[#FDFDFD] p-4">
        <div className="relative shadow-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入单词、短语或句子..."
            className="w-full p-4 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-lg"
          />
          <button 
            onClick={() => handleSearch()} 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {loading ? <RefreshIcon /> : <SearchIcon />}
          </button>
        </div>
      </div>

      {/* Result Content */}
      {currentEntry && !loading && (
        <div className="p-4 space-y-4 animate-fade-in">
          
          {/* Header Card */}
          <div className="rounded-t-xl overflow-hidden shadow-sm border border-blue-700/10">
             <div className="bg-blue-700 p-6 text-white relative">
                <div className="absolute top-4 right-4">
                   <button onClick={toggleSave} className="p-2 rounded-full hover:bg-white/10">
                    <SaveIcon filled={!!notebook.find(n => n.term === currentEntry.term)} />
                  </button>
                </div>
                <h1 className="text-3xl font-bold capitalize">{currentEntry.term}</h1>
                {currentEntry.definition_en && (
                   <p className="text-blue-200 text-lg mt-1 font-medium">{currentEntry.definition_en}</p>
                )}
             </div>
             
             <div className="bg-white p-5 space-y-6">
                {/* Definition */}
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">
                    <span className="text-blue-600">□</span> 核心含义
                  </h3>
                  <p className="text-gray-700 text-lg leading-relaxed pl-6">
                    {currentEntry.definition}
                  </p>
                </div>

                {/* Pronunciation */}
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">
                    <VolumeIcon /> 发音
                  </h3>
                  <div className="pl-6 flex items-center gap-4">
                    <span className="text-gray-500 font-mono text-lg">IPA: /{currentEntry.ipa}/</span>
                    <AudioButton text={currentEntry.term} small />
                  </div>
                </div>

                {/* Examples */}
                <div>
                   <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    <span className="text-blue-600">📝</span> 例句
                  </h3>
                  <div className="space-y-3 pl-2">
                    {currentEntry.examples.map((ex, idx) => (
                      <div key={idx} className="bg-blue-50/50 p-3 rounded-lg border-l-4 border-blue-300">
                         <div className="flex justify-between items-start">
                            <p className="text-blue-900 italic font-medium">"{ex.pt}"</p>
                            <AudioButton text={ex.pt} small />
                         </div>
                         <p className="text-gray-500 text-sm mt-1">({ex.cn})</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Synonyms Table */}
                {currentEntry.synonyms && currentEntry.synonyms.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                       <RefreshIcon /> 同义词对比
                    </h3>
                    <div className="border rounded-lg overflow-hidden text-sm">
                      <div className="grid grid-cols-3 bg-blue-700 text-white font-bold p-2">
                        <div className="col-span-1">同义词</div>
                        <div className="col-span-2">区别</div>
                      </div>
                      {currentEntry.synonyms.map((syn, i) => (
                        <div key={i} className="grid grid-cols-3 border-t p-2 bg-white hover:bg-gray-50">
                          <div className="col-span-1 font-medium text-gray-800">{syn.word}</div>
                          <div className="col-span-2 text-gray-600">{syn.distinction}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conjugation Table */}
                {currentEntry.conjugations && <ConjugationSection conjugations={currentEntry.conjugations} />}

                 {/* Etymology */}
                 <div>
                   <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    <span className="text-lg">🏛️</span> 拉丁语词源
                   </h3>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-sm">
                       <div className="flex gap-2 items-baseline">
                          <span className="font-serif italic text-lg text-gray-700">{currentEntry.etymology.root}</span>
                          <span className="text-gray-500">({currentEntry.etymology.root_cn})</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <span className="block text-xs font-bold text-blue-600 uppercase mb-1">葡语衍生</span>
                            <div className="flex flex-wrap gap-2">
                              {renderDerivatives(currentEntry.etymology.pt_derivatives, 'text-blue-700')}
                            </div>
                         </div>
                         <div>
                            <span className="block text-xs font-bold text-gray-500 uppercase mb-1">英语衍生</span>
                            <div className="flex flex-wrap gap-2">
                              {renderDerivatives(currentEntry.etymology.en_derivatives, 'text-gray-700')}
                            </div>
                         </div>
                       </div>
                   </div>
                 </div>
                 
                 {/* Casual/Tips */}
                 <div>
                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">
                      <SparklesIcon /> 小贴士
                    </h3>
                    <div className="bg-yellow-50 text-yellow-900 p-4 rounded-xl text-sm border border-yellow-100">
                       {currentEntry.casual_explanation}
                    </div>
                 </div>

             </div>
          </div>

          {/* Chat Trigger */}
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-blue-50 transition-colors"
          >
            <MessageCircleIcon />
            有问题？问问 AI 助教
          </button>

        </div>
      )}

      {!currentEntry && !loading && (
        <div className="flex flex-col items-center justify-center mt-32 text-center px-6 opacity-60">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl mb-4">
            <BookIcon />
          </div>
          <h2 className="text-xl font-bold text-gray-800">SambaLingo Dictionary</h2>
          <p className="text-gray-500 mt-2 text-sm">Type a word to see the detailed analysis.</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center mt-32">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      )}
    </div>
  );

  const renderNotebookView = () => {
    const filteredVerbs = COMMON_VERBS.filter(v => 
      v.word.toLowerCase().includes(verbListFilter.toLowerCase()) ||
      v.cn.includes(verbListFilter)
    );

    return (
      <div className="w-full max-w-md mx-auto pb-24 p-4 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">我的单词本</h2>
        
        {/* Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button 
             onClick={() => setNotebookTab('SAVED')}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${notebookTab === 'SAVED' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
           >
             收藏单词 ({notebook.length})
           </button>
           <button 
             onClick={() => setNotebookTab('VERBS')}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${notebookTab === 'VERBS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
           >
             500 常用动词
           </button>
        </div>

        {notebookTab === 'SAVED' ? (
          <>
            {/* Story Mode Generator */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <SparklesIcon /> 编故事模式
                  </h3>
                  <p className="text-purple-100 text-xs mt-1 opacity-80">AI 会把你的单词串成一个小故事。</p>
                </div>
              </div>
              
              {!storyData ? (
                 <button 
                   onClick={handleGenerateStory}
                   disabled={loadingStory || notebook.length < 3}
                   className="mt-4 w-full py-2 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/20 disabled:opacity-50"
                 >
                   {loadingStory ? '正在生成...' : '开始生成故事'}
                 </button>
              ) : (
                <div className="mt-4 bg-black/20 p-4 rounded-xl animate-fade-in border border-white/10">
                   <p className="text-lg font-serif italic mb-3 leading-relaxed">{storyData.pt_story}</p>
                   <div className="flex justify-end mb-3">
                      <AudioButton text={storyData.pt_story} small light />
                   </div>
                   <p className="text-sm text-purple-100 border-t border-white/20 pt-3">{storyData.cn_translation}</p>
                   <button 
                     onClick={() => setStoryData(null)}
                     className="mt-3 text-xs underline text-purple-200 hover:text-white"
                   >
                     清除
                   </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {notebook.length === 0 ? (
                <p className="text-center text-gray-400 mt-10 text-sm">暂无收藏单词</p>
              ) : (
                notebook.map((entry) => (
                  <div 
                    key={entry.id} 
                    onClick={() => { setCurrentEntry(entry); setView(ViewMode.SEARCH); }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group"
                  >
                    <div>
                      <span className="font-bold text-blue-700 text-lg group-hover:text-blue-600">{entry.term}</span>
                      <span className="ml-2 text-gray-500 text-sm">{entry.definition}</span>
                    </div>
                    <ArrowRightIcon />
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Verbs Filter */}
            <input
              type="text"
              value={verbListFilter}
              onChange={(e) => setVerbListFilter(e.target.value)}
              placeholder="筛选动词..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-2">
              {filteredVerbs.map((verb, i) => (
                <div 
                  key={i}
                  onClick={() => handleSearch(verb.word)}
                  className="bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-300 cursor-pointer hover:shadow-sm transition-all group"
                >
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                       <span className="font-bold text-gray-800">{verb.word}</span>
                       <span className="text-gray-500 text-sm">- {verb.cn}</span>
                     </div>
                     <span className="text-xs text-blue-100 bg-blue-50 px-2 py-1 rounded group-hover:text-blue-600 transition-colors">
                       查看详情 & 例句
                     </span>
                  </div>
                </div>
              ))}
              {filteredVerbs.length === 0 && (
                <p className="text-center text-gray-400 mt-4 text-sm">未找到匹配动词</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFlashcards = () => {
    // Source Logic
    const getCards = () => {
      if (fcSource === 'NOTEBOOK') return notebook;
      return COMMON_VERBS.filter(v => verbFilter === 'ALL' || v.type === verbFilter.toLowerCase());
    };
    
    const cards = getCards();
    const currentCard = cards[fcIndex];
    const cardExamples = currentCard ? ('examples' in currentCard ? currentCard.examples : currentCard.examples) : undefined;

    return (
      <div className="w-full max-w-md mx-auto h-[85vh] flex flex-col p-6 pb-24">
        {/* Flashcard Header & Toggle */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">学习模式</h2>
            <span className="text-sm font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {cards.length > 0 ? fcIndex + 1 : 0} / {cards.length}
            </span>
          </div>

          {/* Source Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button 
               onClick={() => setFcSource('NOTEBOOK')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${fcSource === 'NOTEBOOK' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
             >
               生词本
             </button>
             <button 
               onClick={() => setFcSource('VERBS')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${fcSource === 'VERBS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
             >
               500 常用动词
             </button>
          </div>

          {/* Verb Filter */}
          {fcSource === 'VERBS' && (
            <div className="flex gap-2 justify-center">
              {['ALL', 'AR', 'ER', 'IR'].map((f) => (
                 <button
                   key={f}
                   onClick={() => setVerbFilter(f as any)}
                   className={`px-3 py-1 rounded-full text-xs font-bold border ${verbFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}
                 >
                   {f}
                 </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        {cards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
            <BrainIcon />
            <p className="mt-4 text-gray-500">
              {fcSource === 'NOTEBOOK' ? '生词本是空的！' : '没有找到该类动词'}
            </p>
            {fcSource === 'NOTEBOOK' && <button onClick={() => setView(ViewMode.SEARCH)} className="mt-2 text-blue-500 font-bold">去搜索添加</button>}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            {/* Flip Card Container */}
            <div 
              className="relative w-full h-80 perspective-1000 cursor-pointer group mb-6"
              onClick={() => setFcFlipped(!fcFlipped)}
            >
              <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${fcFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front */}
                <div className="absolute w-full h-full bg-white rounded-3xl shadow-xl border border-gray-200 backface-hidden flex flex-col items-center justify-center p-8">
                  {fcSource === 'VERBS' && (
                    <span className="absolute top-4 right-4 text-xs font-bold text-blue-300 border border-blue-100 px-2 py-1 rounded uppercase">
                      {(currentCard as StaticVerb).type}
                    </span>
                  )}
                  <div className="w-20 h-20 mb-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-3xl font-bold">
                     {('term' in currentCard ? currentCard.term : currentCard.word).charAt(0).toUpperCase()}
                  </div>
                  
                  <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-4">{'term' in currentCard ? currentCard.term : currentCard.word}</h1>
                  <p className="text-blue-400 text-sm font-medium">点击翻转</p>
                </div>

                {/* Back */}
                <div className="absolute w-full h-full bg-blue-600 rounded-3xl shadow-xl rotate-y-180 backface-hidden flex flex-col justify-center p-8 text-white">
                   
                   <h3 className="text-2xl font-bold mb-2 text-center">{'definition' in currentCard ? currentCard.definition : currentCard.cn}</h3>
                   
                   {'definition_en' in currentCard && <p className="text-blue-200 text-sm mb-4 text-center">{currentCard.definition_en}</p>}
                   
                   {/* Unified Examples Rendering */}
                   {cardExamples && cardExamples.length > 0 && (
                     <>
                       <div className="w-full h-px bg-white/20 my-4"></div>
                       
                       <div className="mb-2 text-center">
                         <p className="font-medium text-lg mt-1 leading-snug">"{cardExamples[0].pt}"</p>
                         <p className="text-sm text-blue-100 mt-1 opacity-80">{cardExamples[0].cn}</p>
                       </div>
                       
                       {cardExamples[1] && (
                         <div className="mb-2 text-center mt-2 hidden sm:block">
                           <p className="font-medium text-lg mt-1 leading-snug">"{cardExamples[1].pt}"</p>
                           <p className="text-sm text-blue-100 mt-1 opacity-80">{cardExamples[1].cn}</p>
                         </div>
                       )}
                     </>
                   )}

                   {fcSource === 'VERBS' && (
                     <div className="text-center mt-4">
                        <p className="text-sm text-blue-200 italic">点击喇叭听发音</p>
                     </div>
                   )}

                   <div className="mt-auto flex justify-center pt-4">
                      <button 
                        onClick={(e) => {e.stopPropagation(); playTTS('term' in currentCard ? currentCard.term : currentCard.word);}}
                        className="p-3 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-sm"
                      >
                        <VolumeIcon />
                      </button>
                   </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6">
              <button 
                onClick={() => { setFcFlipped(false); setFcIndex(i => i > 0 ? i - 1 : cards.length - 1); }}
                className="px-6 py-3 bg-white border border-gray-200 shadow-sm rounded-full hover:bg-gray-50 text-gray-600 font-medium"
              >
                上一个
              </button>
              <button 
                onClick={() => { setFcFlipped(false); setFcIndex(i => i < cards.length - 1 ? i + 1 : 0); }}
                className="px-6 py-3 bg-blue-600 shadow-lg shadow-blue-200 rounded-full hover:bg-blue-700 text-white font-bold"
              >
                下一个
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  // --- Layout ---

  return (
    <div className="min-h-[100dvh] bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">
      
      <main>
        {view === ViewMode.SEARCH && renderSearchView()}
        {view === ViewMode.NOTEBOOK && renderNotebookView()}
        {view === ViewMode.FLASHCARDS && renderFlashcards()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-40 h-20 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setView(ViewMode.SEARCH)}
          className={`flex flex-col items-center gap-1 w-16 ${view === ViewMode.SEARCH ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <SearchIcon />
          <span className="text-[10px] font-bold uppercase tracking-wide">搜索</span>
        </button>
        
        <button 
          onClick={() => setView(ViewMode.NOTEBOOK)}
          className={`flex flex-col items-center gap-1 w-16 ${view === ViewMode.NOTEBOOK ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BookIcon />
          <span className="text-[10px] font-bold uppercase tracking-wide">笔记本</span>
        </button>

        <button 
          onClick={() => setView(ViewMode.FLASHCARDS)}
          className={`flex flex-col items-center gap-1 w-16 ${view === ViewMode.FLASHCARDS ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BrainIcon />
          <span className="text-[10px] font-bold uppercase tracking-wide">学习</span>
        </button>
      </nav>

      {/* Chat Overlay */}
      {isChatOpen && currentEntry && (
        <ChatOverlay term={currentEntry} onClose={() => setIsChatOpen(false)} />
      )}
      
      {/* Safe area padding for bottom nav */}
      <div className="h-20"></div> 
    </div>
  );
}