import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Stethoscope, AlertCircle, Loader2, Search, Calendar, Filter, X, ChevronDown, ChevronUp, ArrowDown, ArrowUp } from 'lucide-react';
import Markdown from 'react-markdown';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

import { GoogleGenAI } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยแพทย์และเภสัชกรส่วนตัวของคุณ ผมได้อ่านข้อมูลสุขภาพ ผลตรวจเลือด และรายการยาปัจจุบันของคุณเรียบร้อยแล้ว วันนี้มีอาการอะไรให้ผมช่วยดูแล หรืออยากให้ผมวิเคราะห์ผลตรวจสุขภาพให้ฟังไหมครับ?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [error, setError] = useState('');
  const [shouldScroll, setShouldScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasInitializedDates, setHasInitializedDates] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Also scroll the main content area if it's the one with the scrollbar
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToFilters = () => {
    if (!showFilters) {
      setShowFilters(true);
      // Wait for state update to render filters
      setTimeout(() => {
        filterRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      filterRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderWithHighlight = (children: any, query: string) => {
    if (!query.trim()) return children;
    
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return <Highlight text={child} query={query} />;
      }
      return child;
    });
  };

  useEffect(() => {
    if (shouldScroll && !isFetchingHistory) {
      scrollToBottom();
      setShouldScroll(false);
    }
  }, [messages, shouldScroll, isFetchingHistory]);

  const fetchHistory = async () => {
    setIsFetchingHistory(true);
    try {
      const params = new URLSearchParams();
      
      if (!hasInitializedDates) {
        params.append('initial', 'true');
      } else {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/chat/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        
        if (!hasInitializedDates) {
          if (data.defaultStartDate) setStartDate(data.defaultStartDate);
          if (data.defaultEndDate) setEndDate(data.defaultEndDate);
          setHasInitializedDates(true);
        }

        const greeting: Message = { 
          role: 'model', 
          text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยแพทย์และเภสัชกรส่วนตัวของคุณ ผมได้อ่านข้อมูลสุขภาพ ผลตรวจเลือด และรายการยาปัจจุบันของคุณเรียบร้อยแล้ว วันนี้มีอาการอะไรให้ผมช่วยดูแล หรืออยากให้ผมวิเคราะห์ผลตรวจสุขภาพให้ฟังไหมครับ?' 
        };
        if (data.messages && data.messages.length > 0) {
          setMessages([greeting, ...data.messages]);
        } else {
          setMessages([greeting]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, startDate, endDate, hasInitializedDates]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    
    // Add user message to UI
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage, timestamp: now }];
    setShouldScroll(true);
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Format messages for Gemini API
      let apiMessages = newMessages
        // 1. Remove the hardcoded greeting to avoid sending it to the API
        .filter((msg, idx) => !(idx === 0 && msg.role === 'model' && msg.text.includes('สวัสดีครับ ผมคือ AI')))
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

      // 2. Keep only last 20 messages to save tokens
      apiMessages = apiMessages.slice(-20);

      // 3. Gemini API strictly requires the first message to be from 'user'
      while (apiMessages.length > 0 && apiMessages[0].role === 'model') {
        apiMessages.shift();
      }

      // 4. Ensure strict alternation (user, model, user, model)
      const alternatingMessages: any[] = [];
      let expectedRole = 'user';
      for (const msg of apiMessages) {
        if (msg.role === expectedRole) {
          alternatingMessages.push({
            role: msg.role,
            parts: [{ text: msg.parts[0].text }]
          });
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        } else {
          // If we got 'user' but expected 'model', or got 'model' but expected 'user'
          // We just append the text to the last message in the array
          if (alternatingMessages.length > 0) {
            alternatingMessages[alternatingMessages.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
          }
        }
      }

      // 5. The last message MUST be from 'user' for generateContent
      if (alternatingMessages.length > 0 && alternatingMessages[alternatingMessages.length - 1].role === 'model') {
        alternatingMessages.pop();
      }

      // Fetch health context from backend
      const contextRes = await fetch('/api/chat/context');
      let healthContext = "No health data available.";
      if (contextRes.ok) {
        const contextData = await contextRes.json();
        healthContext = contextData.healthContext || healthContext;
      }

      const systemInstruction = `
        คุณคือแพทย์ผู้เชี่ยวชาญ (Expert Medical Doctor) และเภสัชกรคลินิก (Clinical Pharmacist)
        หน้าที่ของคุณคือให้คำปรึกษา แนะนำ และวิเคราะห์ข้อมูลสุขภาพของผู้ป่วย
        
        ข้อมูลสุขภาพปัจจุบันของผู้ป่วย (ดึงมาจากระบบติดตามสุขภาพ):
        ${healthContext}

        คำแนะนำในการตอบ:
        1. วิเคราะห์ผลตรวจเลือด (Lab Results) ล่าสุด อธิบายความหมายของค่าต่างๆ ว่าปกติหรือไม่ และมีแนวโน้มอย่างไร
        2. ประเมินสุขภาพโดยรวมจากค่าความดันโลหิต น้ำตาลในเลือด (Vitals)
        3. ให้คำแนะนำเรื่องการใช้ยา ผลข้างเคียง ข้อควรระวัง หรือปฏิกิริยาระหว่างยา (Drug Interactions) จากรายการยาที่ผู้ป่วยใช้อยู่
        4. นำข้อมูลกิจกรรมและกิจวัตรประจำวัน (Activities) มาประเมินร่วมกับปัญหาสุขภาพ เพื่อให้คำแนะนำด้านการปรับเปลี่ยนพฤติกรรม (Lifestyle Modification) ที่เหมาะสม
        5. นำประวัติสุขภาพครอบครัว (Family Medical History) มาประเมินความเสี่ยงของโรคทางพันธุกรรม หรือโรคที่อาจเกิดขึ้นในอนาคต พร้อมแนะนำการตรวจคัดกรองที่เหมาะสม
        6. ตอบคำถามด้วยความเห็นอกเห็นใจ เป็นมืออาชีพ และใช้ภาษาที่เข้าใจง่าย (ภาษาไทย)
        7. **คำเตือนสำคัญ:** ต้องระบุเสมอว่าคุณเป็นเพียง AI ผู้ช่วยทางการแพทย์ และผู้ป่วยควรปรึกษาแพทย์เจ้าของไข้เพื่อการวินิจฉัยและการรักษาที่ถูกต้อง
      `;

      // Call Gemini API directly from frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: alternatingMessages,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const modelText = response.text || '';

      // Log the chat to backend
      const logRes = await fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, modelMessage: modelText })
      });
      
      let timestamp = now;
      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData.timestamp) timestamp = logData.timestamp;
      }
      
      // Add model response to UI
      setShouldScroll(true);
      setMessages(prev => [...prev, { role: 'model', text: modelText, timestamp }]);
    } catch (err: any) {
      setError(err.message || 'An error occurred while communicating with the AI.');
      // Remove the user message if it failed, or just show error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] max-h-[800px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">AI Medical & Pharmacy Assistant</h2>
            <p className="text-xs text-slate-500">Expert analysis based on your personal health data</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1.5",
              showFilters ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            ตัวกรองประวัติ
          </button>
          <button
            onClick={() => {
              setMessages([
                { 
                  role: 'model', 
                  text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยแพทย์และเภสัชกรส่วนตัวของคุณ ผมได้อ่านข้อมูลสุขภาพ ผลตรวจเลือด และรายการยาปัจจุบันของคุณเรียบร้อยแล้ว วันนี้มีอาการอะไรให้ผมช่วยดูแล หรืออยากให้ผมวิเคราะห์ผลตรวจสุขภาพให้ฟังไหมครับ?' 
                }
              ]);
              setError('');
            }}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            เริ่มแชตใหม่
          </button>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
            className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          >
<option value="gemini-3-flash-preview">Gemini 3 Flash Preview  (Default)</option>
<option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
<option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
<option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
<option value="gemini-flash-latest">Gemini Flash Latest</option>
<option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
<option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
          </select>
        </div>
      </div>

      {/* Filters Area */}
      {showFilters && (
        <div ref={filterRef} className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-end sm:items-center text-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 w-full sm:w-auto"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ค้นหาประวัติการแชต..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 w-full"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {(startDate || endDate || searchQuery) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setHasInitializedDates(false);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                title="ล้างตัวกรองทั้งหมด"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 min-h-[300px]">
        {isFetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-sm">กำลังโหลดประวัติการแชต...</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={clsx(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-indigo-600 text-white"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={clsx(
                  "p-4 rounded-2xl",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">
                      <Highlight text={msg.text} query={searchQuery} />
                    </p>
                  ) : (
                    <div className="markdown-body text-sm prose prose-slate prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800 max-w-none">
                      <Markdown
                        components={{
                          p: ({ children }) => <p>{renderWithHighlight(children, searchQuery)}</p>,
                          li: ({ children }) => <li>{renderWithHighlight(children, searchQuery)}</li>,
                          h1: ({ children }) => <h1>{renderWithHighlight(children, searchQuery)}</h1>,
                          h2: ({ children }) => <h2>{renderWithHighlight(children, searchQuery)}</h2>,
                          h3: ({ children }) => <h3>{renderWithHighlight(children, searchQuery)}</h3>,
                          strong: ({ children }) => <strong>{renderWithHighlight(children, searchQuery)}</strong>,
                          em: ({ children }) => <em>{renderWithHighlight(children, searchQuery)}</em>,
                        }}
                      >
                        {msg.text}
                      </Markdown>
                    </div>
                  )}
                  {msg.timestamp && (
                    <div className={clsx(
                      "text-[10px] mt-2 opacity-70",
                      msg.role === 'user' ? "text-indigo-100 text-right" : "text-slate-400"
                    )}>
                      {new Date(msg.timestamp).toLocaleString('th-TH', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-sm text-slate-500">Analyzing your health data...</span>
                </div>
              </div>
            )}
          </>
        )}
        
        {error && (
          <div className="mx-auto max-w-md p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div id="chat-bottom" ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your lab results, medications, or health trends..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-3">
          AI can make mistakes. Always consult your doctor for medical advice.
        </p>
      </div>
    </div>
  );
}
