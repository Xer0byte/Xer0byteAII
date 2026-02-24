import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Mic, Image as ImageIcon, Folder, Clock, Settings, X, Plus, Send, Book } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ParticleBackground = ({ theme }: { theme: 'dark' | 'light' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let animationFrameId: number;

    const mouse = { x: null as number | null, y: null as number | null, down: false };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseDown = () => (mouse.down = true);
    const handleMouseUp = () => (mouse.down = false);
    const handleMouseOut = () => { mouse.x = null; mouse.y = null; };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseout', handleMouseOut);

    class Node {
      x: number; y: number; ox: number; oy: number; vx: number; vy: number; r: number;
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.ox = this.x;
        this.oy = this.y;
        this.vx = 0;
        this.vy = 0;
        this.r = Math.random() * 2.0 + 0.7;
      }
      update() {
        if (mouse.x !== null && mouse.y !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let d = Math.hypot(dx, dy);
          if (d < 260) {
            let f = (260 - d) / 260;
            let p = mouse.down ? f * 16 : f * 1.2;
            this.vx -= dx * p * 0.18;
            this.vy -= dy * p * 0.18;
          }
        }
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.x += (this.ox - this.x) * 0.005;
        this.y += (this.oy - this.y) * 0.005;
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
        ctx.fill();
      }
    }

    const nodes = Array.from({ length: 80 }, () => new Node());

    const animate = () => {
      if (!ctx) return;
      ctx.fillStyle = theme === 'dark' ? '#000000' : '#f0f0f0';
      ctx.fillRect(0, 0, w, h);
      
      nodes.forEach(n => {
        n.update();
        n.draw();
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[i].x - nodes[j].x;
          let dy = nodes[i].y - nodes[j].y;
          let d = Math.hypot(dx, dy);
          if (d < 160) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = theme === 'dark' ? 'rgba(180,180,180,0.12)' : 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" />;
};

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<'home' | 'chat' | 'history' | 'imagine' | 'voice' | 'projects' | 'grokpedia'>('home');
  const [messages, setMessages] = useState<{id?: number, role: 'user' | 'ai', text: string}[]>([]);
  const [conversations, setConversations] = useState<{id: string, title: string, updated_at: string}[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<{data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projects, setProjects] = useState<{id: string, name: string, description: string, content: string}[]>([]);
  const [tasks, setTasks] = useState<{id: string, title: string, completed: boolean}[]>([]);
  
  const [user, setUser] = useState<{id: string, name: string, email: string, avatarColor: string} | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [modals, setModals] = useState({
    signIn: false,
    signUp: false,
    settings: false,
    manageAccount: false,
    userMenu: false,
    tasks: false,
    createProject: false
  });

  const [settings, setSettingsState] = useState({
    wrapCode: false,
    autoScroll: true,
    sidebarEditor: false,
    notifyThinking: true,
    cmdEnter: false,
    richText: true,
    autoVideo: false,
    improveModel: false,
    personalize: true,
    linkSharing: true,
    nsfw: false,
    responseStyle: 'custom'
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettingsState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (settings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, settings.autoScroll]);

  useEffect(() => {
    const storedUser = localStorage.getItem('grokUser');
    const storedToken = localStorage.getItem('grokToken');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('grokUser');
        localStorage.removeItem('grokToken');
      }
    }
  }, []);

  const apiFetch = async (url: string, options: any = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('grokUser');
      localStorage.removeItem('grokToken');
      setModals(prev => ({ ...prev, signIn: true }));
    }
    return response;
  };

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !token) {
        setConversations([]);
        return;
      }
      try {
        const res = await apiFetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0 && !currentConversationId) {
            setCurrentConversationId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };
    fetchConversations();
  }, [user, token]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || !token) return;
      try {
        const res = await apiFetch('/api/projects');
        if (res.ok) setProjects(await res.json());
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    const fetchTasks = async () => {
      if (!user || !token) return;
      try {
        const res = await apiFetch('/api/tasks');
        if (res.ok) setTasks(await res.json());
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };
    if (user && token) {
      fetchProjects();
      fetchTasks();
    }
  }, [user, token]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || !token || !currentConversationId) {
        setMessages([]);
        setIsFetching(false);
        return;
      }
      try {
        const res = await apiFetch(`/api/messages?conversationId=${currentConversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchMessages();
  }, [user, token, currentConversationId]);

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() && !selectedFile) return;
    
    if (!user || !token) {
      setModals(prev => ({ ...prev, signIn: true }));
      return;
    }

    if (view !== 'chat') {
      setView('chat');
    }
    
    let activeConvId = currentConversationId;
    
    // Create new conversation if none exists
    if (!activeConvId) {
      try {
        const res = await apiFetch('/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ title: text ? text.substring(0, 30) + "..." : "Image Upload" })
        });
        const data = await res.json();
        activeConvId = data.id;
        setCurrentConversationId(data.id);
        setConversations(prev => [{id: data.id, title: data.title, updated_at: new Date().toISOString()}, ...prev]);
      } catch (error) {
        console.error("Failed to create conversation", error);
      }
    }

    const userMsg = { role: 'user' as const, text: text || "[Image attached]" };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    const currentFile = selectedFile;
    setSelectedFile(null);
    setIsThinking(true);

    try {
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          conversationId: activeConvId, 
          text, 
          history: messages,
          image: currentFile
        })
      });

      const data = await response.json();
      if (response.ok) {
        const aiMsg = { role: 'ai' as const, text: data.text };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Oops, something went wrong. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!inputText.trim()) return;
    if (!user || !token) {
      setModals(prev => ({ ...prev, signIn: true }));
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
      const response = await apiFetch('/api/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt: inputText })
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedImage(data.imageUrl);
      } else {
        alert(data.error || "Failed to generate image.");
      }
    } catch (error) {
      console.error("Image generation error:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setView('chat');
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to delete all conversations?")) {
      try {
        await apiFetch('/api/messages', { method: 'DELETE' });
        setMessages([]);
        setConversations([]);
        setCurrentConversationId(null);
        setView('home');
        setModals(prev => ({ ...prev, settings: false }));
      } catch (error) {
        console.error("Failed to delete messages:", error);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authForm.name, email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('grokUser', JSON.stringify(data.user));
        localStorage.setItem('grokToken', data.token);
        setModals(prev => ({ ...prev, signUp: false }));
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        setAuthError(data.error || 'Signup failed');
      }
    } catch (err) {
      setAuthError('Network error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('grokUser', JSON.stringify(data.user));
        localStorage.setItem('grokToken', data.token);
        setModals(prev => ({ ...prev, signIn: false }));
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Network error');
    }
  };

  const mockLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('grokUser');
    localStorage.removeItem('grokToken');
    setModals(prev => ({ ...prev, userMenu: false, manageAccount: false }));
    setView('home');
    setMessages([]);
    setConversations([]);
    setCurrentConversationId(null);
    chatRef.current = null;
  };

  const [projectForm, setProjectForm] = useState({ name: '', description: '', content: '' });
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectForm)
      });
      if (res.ok) {
        const newProject = await res.json();
        setProjects(prev => [newProject, ...prev]);
        setModals(prev => ({ ...prev, createProject: false }));
        setProjectForm({ name: '', description: '', content: '' });
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const [taskTitle, setTaskTitle] = useState('');
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskTitle.trim()) return;
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle })
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [newTask, ...prev]);
        setTaskTitle('');
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !completed })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t));
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSend(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedFile({
        data: base64.split(',')[1],
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flex h-screen relative overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black'}`}>
      <ParticleBackground theme={theme} />
      
      {/* Sidebar */}
      <aside className={`w-[280px] flex flex-col p-4 z-10 border-r backdrop-blur-md ${theme === 'dark' ? 'bg-black/94 border-[#222]' : 'bg-white/94 border-[#ddd]'}`}>
        <div className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${theme === 'dark' ? 'bg-[#161616] text-[#888] focus-within:bg-[#222] focus-within:text-white' : 'bg-[#f5f5f5] text-[#555] focus-within:bg-[#e0e0e0] focus-within:text-black'}`}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full"
          />
          <span className="ml-auto text-xs opacity-50">Ctrl+K</span>
        </div>
        
        <div className="mt-4 space-y-1">
          <div onClick={() => setView('chat')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'chat' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <MessageSquare size={20} />
            <span>Chat</span>
          </div>
          <div onClick={() => setView('voice')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'voice' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <Mic size={20} />
            <span>Voice</span>
          </div>
          <div onClick={() => setView('imagine')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'imagine' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <ImageIcon size={20} />
            <span>Imagine</span>
          </div>
          <div onClick={() => setView('projects')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'projects' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <Folder size={20} />
            <span>Projects</span>
          </div>
          <div onClick={() => setView('history')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'history' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <Clock size={20} />
            <span>History</span>
          </div>
          <div onClick={() => setView('grokpedia')} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer text-[15px] transition-all ${view === 'grokpedia' ? (theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-[#e0e0e0] text-black') : (theme === 'dark' ? 'text-[#ddd] hover:bg-[#1f1f1f] hover:text-white' : 'text-[#333] hover:bg-[#e0e0e0] hover:text-black')}`}>
            <Book size={20} />
            <span>Grokpedia</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col items-center justify-center">
        {/* Top Right Auth Buttons */}
        <div className="absolute top-5 right-6 z-20 flex gap-3">
          {!user ? (
            <>
              <button onClick={() => setModals({...modals, signIn: true})} className={`px-4 py-2 rounded-full text-sm border transition-all ${theme === 'dark' ? 'border-[#444] text-[#aaa] hover:border-[#777] hover:text-white bg-transparent' : 'border-[#ccc] text-[#555] hover:border-[#999] hover:text-black bg-transparent'}`}>Sign in</button>
              <button onClick={() => setModals({...modals, signUp: true})} className={`px-4 py-2 rounded-full text-sm border transition-all ${theme === 'dark' ? 'border-[#444] text-[#aaa] hover:border-[#777] hover:text-white bg-transparent' : 'border-[#ccc] text-[#555] hover:border-[#999] hover:text-black bg-transparent'}`}>Sign up</button>
            </>
          ) : null}
        </div>

        {view === 'home' && (
          <div className="text-center max-w-[800px] w-full px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className={`text-[140px] font-black tracking-tighter mb-10 ${theme === 'dark' ? 'text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]' : 'text-black drop-shadow-[0_0_40px_rgba(0,0,0,0.1)]'}`}>Grok</h1>
            <p className={`text-[26px] mb-14 ${theme === 'dark' ? 'text-[#bbb]' : 'text-[#555]'}`}>What's on your mind?</p>
            
            <div className="w-full max-w-3xl mx-auto mb-10">
              <div className={`flex items-center rounded-full p-1.5 h-16 border transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] focus-within:border-[#555] focus-within:ring-4 focus-within:ring-white/10' : 'bg-[#f5f5f5] border-[#ddd] focus-within:border-[#999] focus-within:ring-4 focus-within:ring-black/10'}`}>
                <div onClick={() => fileInputRef.current?.click()} className="pl-4 pr-2 text-[#666] cursor-pointer hover:text-white transition-colors">
                  <Plus size={20} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                <input 
                  type="text" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={selectedFile ? "Image attached. Add a message..." : "What's on your mind?"}
                  className={`flex-1 bg-transparent border-none outline-none text-[17px] px-2 ${theme === 'dark' ? 'text-white placeholder-[#666]' : 'text-black placeholder-[#999]'}`}
                />
                <div className="flex items-center gap-2 pr-2">
                  <button onClick={() => { setView('voice'); startListening(); }} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-[#ddd]'}`}>
                    <Mic size={20} />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() && !selectedFile}
                    className={`p-2 rounded-full flex items-center justify-center transition-colors ${inputText.trim() || selectedFile ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : (theme === 'dark' ? 'bg-[#333] text-[#666]' : 'bg-[#ddd] text-[#999]')}`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`mx-auto rounded-2xl p-6 max-w-[680px] w-full flex items-center gap-5 transition-transform hover:scale-[1.02] border ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#ddd]'}`}>
              <div className="text-3xl">𝕏</div>
              <div className="text-left flex-1">
                <div className="font-semibold text-lg">Connect your X account</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-[#aaa]' : 'text-[#666]'}`}>Unlock early features and personalized content.</div>
              </div>
              <button className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>Connect</button>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="flex flex-col h-full w-full max-w-4xl mx-auto relative">
            <div className="flex-1 overflow-y-auto p-8 pb-32 space-y-8">
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-3xl text-[16px] leading-relaxed ${
                    msg.role === 'user' 
                      ? (theme === 'dark' ? 'bg-[#222] text-white' : 'bg-[#e0e0e0] text-black')
                      : (theme === 'dark' ? 'bg-[#111] text-[#ddd]' : 'bg-[#f0f0f0] text-black')
                  }`}>
                    {msg.role === 'ai' ? (
                      <div className="markdown-body">
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex w-full justify-start">
                  <div className={`max-w-[80%] p-4 rounded-3xl text-[16px] leading-relaxed flex items-center gap-2 ${theme === 'dark' ? 'bg-[#111] text-[#ddd]' : 'bg-[#f0f0f0] text-black'}`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t ${theme === 'dark' ? 'from-black via-black/90 to-transparent' : 'from-[#f0f0f0] via-[#f0f0f0]/90 to-transparent'}`}>
              <div className={`flex items-center rounded-full p-1.5 h-16 border transition-all w-full max-w-3xl mx-auto ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] focus-within:border-[#555] focus-within:ring-4 focus-within:ring-white/10' : 'bg-[#f5f5f5] border-[#ddd] focus-within:border-[#999] focus-within:ring-4 focus-within:ring-black/10'}`}>
                <div onClick={() => fileInputRef.current?.click()} className="pl-4 pr-2 text-[#666] cursor-pointer hover:text-white transition-colors">
                  <Plus size={20} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                <input 
                  type="text" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={selectedFile ? "Image attached. Add a message..." : "What's on your mind?"}
                  className={`flex-1 bg-transparent border-none outline-none text-[17px] px-2 ${theme === 'dark' ? 'text-white placeholder-[#666]' : 'text-black placeholder-[#999]'}`}
                />
                <div className="flex items-center gap-2 pr-2">
                  <button onClick={() => { setView('voice'); startListening(); }} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-[#ddd]'}`}>
                    <Mic size={20} />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={(!inputText.trim() && !selectedFile) || isThinking}
                    className={`p-2 rounded-full flex items-center justify-center transition-colors ${(inputText.trim() || selectedFile) && !isThinking ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : (theme === 'dark' ? 'bg-[#333] text-[#666]' : 'bg-[#ddd] text-[#999]')}`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="w-full max-w-4xl mx-auto p-8 h-full overflow-y-auto">
            <h2 className="text-3xl font-bold mb-8">History</h2>
            {conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="text-center opacity-50 mt-20">No past conversations found.</div>
            ) : (
              <div className="space-y-4">
                {conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
                  <div 
                    key={conv.id} 
                    onClick={() => { setCurrentConversationId(conv.id); setView('chat'); }}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] hover:border-[#555]' : 'bg-white border-[#ddd] hover:border-[#999]'}`}
                  >
                    <div className="font-medium text-lg mb-1">{conv.title}</div>
                    <div className="text-sm opacity-50">{new Date(conv.updated_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'imagine' && (
          <div className="w-full max-w-4xl mx-auto p-8 h-full flex flex-col items-center justify-center relative">
            <h2 className="text-4xl font-bold mb-4">Imagine</h2>
            <p className="text-lg opacity-70 mb-12 text-center max-w-2xl">Describe an image you want to generate, and Grok will bring it to life.</p>
            
            {generatedImage ? (
              <div className="mb-12 relative group rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img src={generatedImage} alt="Generated" className="max-w-full max-h-[50vh] object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = generatedImage;
                    a.download = 'grok-imagine.png';
                    a.click();
                  }} className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200">Download</button>
                </div>
              </div>
            ) : isGeneratingImage ? (
              <div className="mb-12 flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-[#00ff9d] border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-lg opacity-80 animate-pulse">Generating your masterpiece...</div>
              </div>
            ) : null}

            <div className={`flex items-center rounded-full p-1.5 h-16 border transition-all w-full max-w-3xl ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] focus-within:border-[#555] focus-within:ring-4 focus-within:ring-white/10' : 'bg-[#f5f5f5] border-[#ddd] focus-within:border-[#999] focus-within:ring-4 focus-within:ring-black/10'}`}>
              <div className="pl-4 pr-2 text-[#666]">
                <ImageIcon size={20} />
              </div>
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                placeholder="A futuristic city with flying cars..."
                className={`flex-1 bg-transparent border-none outline-none text-[17px] px-2 ${theme === 'dark' ? 'text-white placeholder-[#666]' : 'text-black placeholder-[#999]'}`}
              />
              <div className="flex items-center pr-2">
                <button 
                  onClick={handleGenerateImage}
                  disabled={!inputText.trim() || isGeneratingImage}
                  className={`px-6 py-2.5 rounded-full font-medium transition-colors ${inputText.trim() && !isGeneratingImage ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : (theme === 'dark' ? 'bg-[#333] text-[#666]' : 'bg-[#ddd] text-[#999]')}`}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'voice' && (
          <div className="w-full max-w-4xl mx-auto p-8 h-full flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
              {isListening && (
                <>
                  <div className="absolute inset-0 bg-[#00ff9d]/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute inset-4 bg-[#00ff9d]/40 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                </>
              )}
              <div onClick={isListening ? () => {} : startListening} className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,255,157,0.5)] cursor-pointer hover:scale-105 transition-transform ${isListening ? 'bg-[#ff4444]' : 'bg-[#00ff9d]'}`}>
                <Mic size={40} className="text-black" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">{isListening ? 'Listening...' : 'Tap to speak'}</h2>
            <p className="text-lg opacity-70 text-center max-w-md">
              {inputText || "Speak your mind. Grok is listening and ready to respond."}
            </p>
            <button onClick={() => { setView('chat'); setIsListening(false); }} className={`mt-12 px-6 py-3 rounded-xl border transition-colors ${theme === 'dark' ? 'border-[#444] hover:bg-[#222]' : 'border-[#ccc] hover:bg-[#e0e0e0]'}`}>
              Cancel
            </button>
          </div>
        )}

        {view === 'projects' && (
          <div className="w-full max-w-4xl mx-auto p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Projects</h2>
              <button 
                onClick={() => setModals({...modals, createProject: true})}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                <Plus size={18} />
                New Project
              </button>
            </div>
            
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                <Folder size={64} className="mb-6" />
                <p className="text-lg text-center max-w-md">Your saved code snippets, documents, and artifacts will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(project => (
                  <div 
                    key={project.id}
                    className={`p-6 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] hover:border-[#555]' : 'bg-white border-[#ddd] hover:border-[#999]'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Folder size={20} className="text-[#00ff9d]" />
                      <h3 className="font-bold text-lg">{project.name}</h3>
                    </div>
                    <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-[#aaa]' : 'text-[#666]'}`}>{project.description}</p>
                    <div className="flex justify-end">
                      <button className={`text-sm font-medium ${theme === 'dark' ? 'text-[#00ff9d]' : 'text-[#006633]'}`}>View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'grokpedia' && (
          <div className="w-full max-w-4xl mx-auto p-8 h-full flex flex-col items-center justify-center">
            <Book size={64} className="mb-6 opacity-50" />
            <h2 className="text-3xl font-bold mb-4">Grokpedia</h2>
            <p className="text-lg opacity-70 text-center max-w-md mb-8">The ultimate source of knowledge, curated by Grok.</p>
            <div className={`flex items-center rounded-full p-1.5 h-16 border transition-all w-full max-w-2xl ${theme === 'dark' ? 'bg-[#161616] border-[#2a2a2a] focus-within:border-[#555] focus-within:ring-4 focus-within:ring-white/10' : 'bg-[#f5f5f5] border-[#ddd] focus-within:border-[#999] focus-within:ring-4 focus-within:ring-black/10'}`}>
              <div className="pl-4 pr-2 text-[#666]">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Search Grokpedia..."
                onKeyDown={e => e.key === 'Enter' && handleSend((e.target as HTMLInputElement).value)}
                className={`flex-1 bg-transparent border-none outline-none text-[17px] px-2 ${theme === 'dark' ? 'text-white placeholder-[#666]' : 'text-black placeholder-[#999]'}`}
              />
            </div>
          </div>
        )}

        {/* Bottom Left User & Settings */}
        <div className="absolute bottom-6 left-6 flex items-center gap-3 z-20">
          <div className="relative">
            <div 
              onClick={() => setModals({...modals, userMenu: !modals.userMenu})}
              className="w-11 h-11 rounded-full cursor-pointer flex items-center justify-center text-white font-bold text-lg"
              style={{ background: user ? user.avatarColor : '#444' }}
            >
              {user ? user.name.charAt(0) : 'U'}
            </div>
            
            {/* User Menu Dropdown */}
            {modals.userMenu && (
              <div className={`absolute bottom-14 left-0 w-48 rounded-xl border shadow-2xl py-2 ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-black'}`}>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`} onClick={() => { setModals({...modals, userMenu: false, settings: true}); }}>Settings</div>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`} onClick={() => { setModals({...modals, userMenu: false, tasks: true}); }}>Tasks</div>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`}>Files</div>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`}>Grokpedia</div>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`}>Help</div>
                <div className={`my-1 border-t ${theme === 'dark' ? 'border-[#333]' : 'border-[#ddd]'}`}></div>
                <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`}>Upgrade plan</div>
                {user && (
                  <div className={`px-4 py-2 cursor-pointer hover:bg-black/10 text-red-500 ${theme === 'dark' ? 'hover:bg-white/10' : ''}`} onClick={mockLogout}>Sign Out</div>
                )}
              </div>
            )}
          </div>
          
          <button onClick={() => setModals({...modals, settings: true})} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'text-[#888] hover:bg-[#222] hover:text-white' : 'text-[#555] hover:bg-[#e0e0e0] hover:text-black'}`}>
            <Settings size={18} />
          </button>
        </div>
      </main>
      
      {/* Modals */}
      
      {/* Tasks Modal */}
      {modals.tasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setModals({...modals, tasks: false}) }}>
          <div className={`w-[90%] max-w-[500px] max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-black'}`}>
            <div className={`flex justify-between items-center p-4 px-6 border-b ${theme === 'dark' ? 'border-[#333]' : 'border-[#ddd]'}`}>
              <h2 className="text-xl font-semibold">Tasks</h2>
              <button onClick={() => setModals({...modals, tasks: false})} className="hover:opacity-70"><X size={24} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={handleCreateTask} className="mb-6 flex gap-2">
                <input 
                  type="text" 
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className={`flex-1 px-4 py-2 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#333] focus:border-[#00ff9d]' : 'bg-white border-[#ddd] focus:border-black'}`}
                />
                <button type="submit" className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-[#00ff9d] text-black' : 'bg-black text-white'}`}>
                  <Plus size={20} />
                </button>
              </form>
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center opacity-50 py-10">No tasks yet.</div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#161616] border-[#222]' : 'bg-white border-[#eee]'}`}>
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => handleToggleTask(task.id, task.completed)}
                        className="w-5 h-5 accent-[#00ff9d]"
                      />
                      <span className={`flex-1 ${task.completed ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {modals.createProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setModals({...modals, createProject: false}) }}>
          <div className={`w-[90%] max-w-[600px] rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-black'}`}>
            <div className={`flex justify-between items-center p-4 px-6 border-b ${theme === 'dark' ? 'border-[#333]' : 'border-[#ddd]'}`}>
              <h2 className="text-xl font-semibold">New Project</h2>
              <button onClick={() => setModals({...modals, createProject: false})} className="hover:opacity-70"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Project Name</label>
                <input 
                  required
                  type="text" 
                  value={projectForm.name}
                  onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#333] focus:border-[#00ff9d]' : 'bg-white border-[#ddd] focus:border-black'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Description</label>
                <input 
                  type="text" 
                  value={projectForm.description}
                  onChange={e => setProjectForm({...projectForm, description: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#161616] border-[#333] focus:border-[#00ff9d]' : 'bg-white border-[#ddd] focus:border-black'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Content / Code</label>
                <textarea 
                  rows={6}
                  value={projectForm.content}
                  onChange={e => setProjectForm({...projectForm, content: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border outline-none transition-all font-mono text-sm ${theme === 'dark' ? 'bg-[#161616] border-[#333] focus:border-[#00ff9d]' : 'bg-white border-[#ddd] focus:border-black'}`}
                />
              </div>
              <button type="submit" className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-[#00ff9d] text-black hover:bg-[#00cc7e]' : 'bg-black text-white hover:bg-gray-800'}`}>
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modals.settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setModals({...modals, settings: false}) }}>
          <div className={`w-[90%] max-w-[720px] max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-black'}`}>
            <div className={`flex justify-between items-center p-4 px-6 border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-[#333] bg-[#111]' : 'border-[#ddd] bg-[#f5f5f5]'}`}>
              <h2 className="text-xl font-semibold">Settings</h2>
              <button onClick={() => setModals({...modals, settings: false})} className="hover:opacity-70"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Account Section */}
              <section>
                <h3 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-[#00ff9d]' : 'text-[#006633]'}`}>Account</h3>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: user ? user.avatarColor : '#555' }}>
                      {user ? user.name.charAt(0) : 'U'}
                    </div>
                    <div>
                      <div className="font-semibold">{user ? user.name : 'Not logged in'}</div>
                      <div className="text-sm opacity-60">{user ? user.email : ''}</div>
                    </div>
                  </div>
                  <button onClick={() => setModals({...modals, settings: false, manageAccount: true})} className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#222] border-[#444] hover:bg-[#333]' : 'bg-[#e0e0e0] border-[#ccc] hover:bg-[#d0d0d0]'}`}>Manage</button>
                </div>
              </section>
              
              {/* Appearance Section */}
              <section>
                <h3 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-[#00ff9d]' : 'text-[#006633]'}`}>Appearance</h3>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Theme</span>
                  <div className="flex gap-2">
                    <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-[#00ff9d] text-black border-transparent' : 'bg-[#222] border border-[#444]'}`}>Light</button>
                    <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-[#00ff9d] text-black border-transparent' : 'bg-[#e0e0e0] border border-[#ccc]'}`}>Dark</button>
                  </div>
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Wrap long lines for code blocks by default</span>
                  <div onClick={() => toggleSetting('wrapCode')} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${settings.wrapCode ? 'bg-[#00ff9d]' : (theme === 'dark' ? 'bg-[#333]' : 'bg-[#ccc]')}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.wrapCode ? 'left-[22px]' : 'left-0.5'}`}></div>
                  </div>
                </div>
              </section>

              {/* Behavior Section */}
              <section>
                <h3 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-[#00ff9d]' : 'text-[#006633]'}`}>Behavior</h3>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Enable Auto Scroll</span>
                  <div onClick={() => toggleSetting('autoScroll')} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${settings.autoScroll ? 'bg-[#00ff9d]' : (theme === 'dark' ? 'bg-[#333]' : 'bg-[#ccc]')}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.autoScroll ? 'left-[22px]' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Enable Sidebar Editor for Code and Documents</span>
                  <div onClick={() => toggleSetting('sidebarEditor')} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${settings.sidebarEditor ? 'bg-[#00ff9d]' : (theme === 'dark' ? 'bg-[#333]' : 'bg-[#ccc]')}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.sidebarEditor ? 'left-[22px]' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Notify when Grok finishes thinking</span>
                  <div onClick={() => toggleSetting('notifyThinking')} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${settings.notifyThinking ? 'bg-[#00ff9d]' : (theme === 'dark' ? 'bg-[#333]' : 'bg-[#ccc]')}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.notifyThinking ? 'left-[22px]' : 'left-0.5'}`}></div>
                  </div>
                </div>
              </section>

              {/* Data Controls Section */}
              <section>
                <h3 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-[#00ff9d]' : 'text-[#006633]'}`}>Data Controls</h3>
                <div className={`flex justify-between items-center py-3 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#ddd]'}`}>
                  <span>Delete All Conversations</span>
                  <button onClick={handleDeleteAll} className="px-4 py-2 rounded-lg bg-[#ff4444] text-white hover:bg-[#ff3333] border-none font-medium">Delete</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {(modals.signIn || modals.signUp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setModals({...modals, signIn: false, signUp: false}) }}>
          <div className={`w-[90%] max-w-[480px] rounded-2xl border shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-black'}`}>
            <div className={`flex justify-between items-center p-4 px-6 border-b ${theme === 'dark' ? 'border-[#333]' : 'border-[#ddd]'}`}>
              <h2 className="text-xl font-semibold">{modals.signIn ? 'Sign in' : 'Sign up'}</h2>
              <button onClick={() => {
                setModals({...modals, signIn: false, signUp: false});
                setAuthError('');
                setAuthForm({ name: '', email: '', password: '' });
              }} className="hover:opacity-70"><X size={24} /></button>
            </div>
            <div className="p-6">
              {authError && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-500 text-sm">{authError}</div>}
              
              <form onSubmit={modals.signIn ? handleLogin : handleSignUp} className="space-y-4">
                {modals.signUp && (
                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Name</label>
                    <input 
                      type="text" 
                      required
                      value={authForm.name}
                      onChange={e => setAuthForm({...authForm, name: e.target.value})}
                      className={`w-full p-3 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#222] border-[#444] focus:border-[#00ff9d]' : 'bg-white border-[#ccc] focus:border-[#006633]'}`}
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-80">Email</label>
                  <input 
                    type="email" 
                    required
                    value={authForm.email}
                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                    className={`w-full p-3 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#222] border-[#444] focus:border-[#00ff9d]' : 'bg-white border-[#ccc] focus:border-[#006633]'}`}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-80">Password</label>
                  <input 
                    type="password" 
                    required
                    value={authForm.password}
                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                    className={`w-full p-3 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-[#222] border-[#444] focus:border-[#00ff9d]' : 'bg-white border-[#ccc] focus:border-[#006633]'}`}
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className={`w-full py-3 rounded-xl font-medium mt-2 transition-all ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                  {modals.signIn ? 'Sign In' : 'Sign Up'}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-[#333]' : 'bg-[#ddd]'}`}></div>
                <div className="text-sm opacity-50">or continue with</div>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-[#333]' : 'bg-[#ddd]'}`}></div>
              </div>

              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => alert('Google OAuth requires configuration')} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-[#444] hover:bg-[#222]' : 'border-[#ccc] hover:bg-[#e0e0e0]'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                </button>
                <button type="button" onClick={() => alert('Apple OAuth requires configuration')} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-[#444] hover:bg-[#222]' : 'border-[#ccc] hover:bg-[#e0e0e0]'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.83 2.32-3.43 2.14-2.81 7.02.63 8.46-.78 1.83-1.72 3.35-3.11 4.23zM12.03 7.25c-.15-3.47 3.2-6.32 6.19-6.25.26 3.65-3.66 6.55-6.19 6.25z"/></svg>
                </button>
                <button type="button" onClick={() => alert('Twitter OAuth requires configuration')} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-[#444] hover:bg-[#222]' : 'border-[#ccc] hover:bg-[#e0e0e0]'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </button>
              </div>
              
              <div className="mt-6 text-center text-sm opacity-70">
                {modals.signIn ? (
                  <>Don't have an account? <button type="button" onClick={() => { setModals({...modals, signIn: false, signUp: true}); setAuthError(''); }} className="underline hover:text-[#00ff9d]">Sign up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => { setModals({...modals, signUp: false, signIn: true}); setAuthError(''); }} className="underline hover:text-[#00ff9d]">Sign in</button></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Account Modal */}
      {modals.manageAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={(e) => { if(e.target === e.currentTarget) setModals({...modals, manageAccount: false}) }}>
          <div className={`w-[90%] max-w-[520px] rounded-2xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-[#f8f8f8] border-[#ccc] text-black'}`}>
            <div className={`flex justify-between items-center p-4 px-6 border-b ${theme === 'dark' ? 'border-[#333]' : 'border-[#ddd]'}`}>
              <h2 className="text-xl font-semibold">Manage Account</h2>
              <button onClick={() => setModals({...modals, manageAccount: false})} className="hover:opacity-70"><X size={24} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: user ? user.avatarColor : '#555' }}>
                  {user ? user.name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="text-2xl font-semibold">{user ? user.name : 'Not logged in'}</div>
                  <div className={`text-[15px] ${theme === 'dark' ? 'text-[#aaa]' : 'text-[#555]'}`}>{user ? user.email : ''}</div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className={`flex justify-between items-center py-3.5 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#eee]'}`}>
                  <span>Change Profile Picture</span>
                  <button className={`px-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-[#e0e0e0] border-[#ccc]'}`}>Upload</button>
                </div>
                <div className={`flex justify-between items-center py-3.5 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#eee]'}`}>
                  <span>Update Name</span>
                  <button className={`px-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-[#e0e0e0] border-[#ccc]'}`}>Edit</button>
                </div>
                <div className={`flex justify-between items-center py-3.5 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#eee]'}`}>
                  <span>Update Email</span>
                  <button className={`px-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-[#e0e0e0] border-[#ccc]'}`}>Edit</button>
                </div>
                <div className={`flex justify-between items-center py-3.5 border-b ${theme === 'dark' ? 'border-[#222]' : 'border-[#eee]'}`}>
                  <span>Change Password</span>
                  <button className={`px-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-[#e0e0e0] border-[#ccc]'}`}>Reset</button>
                </div>
                <div className={`flex justify-between items-center py-4 mt-4 border-t ${theme === 'dark' ? 'border-[#444]' : 'border-[#ddd]'}`}>
                  <span>Sign out from all devices</span>
                  <button onClick={mockLogout} className="px-4 py-1.5 rounded-lg bg-[#ff4444]/20 text-[#ff4444] hover:bg-[#ff4444]/30">Sign out everywhere</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
