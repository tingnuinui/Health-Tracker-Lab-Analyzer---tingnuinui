import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CalendarHeart, Plus, Save, X, Activity, Stethoscope, Syringe, AlertTriangle, Upload, Image as ImageIcon, Loader2, Search, Calendar, Filter, Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

export default function HealthEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultEvent = {
    Date: new Date().toISOString().split('T')[0],
    Type: 'Illness',
    Description: '',
    Notes: ''
  };

  const [newEvent, setNewEvent] = useState(defaultEvent);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  const eventTypes = [
    { value: 'Illness', label: 'Illness / Disease (การเจ็บป่วย/โรค)', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'Symptom', label: 'Symptom (อาการผิดปกติ)', icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'Diagnosis', label: 'Diagnosis (การวินิจฉัยโรค)', icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { value: 'Surgery/Procedure', label: 'Surgery / Procedure (ผ่าตัด/หัตถการ)', icon: Syringe, color: 'text-rose-600', bg: 'bg-rose-100' },
    { value: 'Other', label: 'Other (อื่นๆ)', icon: CalendarHeart, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/data/HealthEvents');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (editingEvent) {
        // Update existing
        const res = await fetch(`/api/data/HealthEvents/${editingEvent._rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
        if (res.ok) {
          setIsModalOpen(false);
          setEditingEvent(null);
          setNewEvent(defaultEvent);
          fetchEvents();
        } else {
          throw new Error('Failed to update event');
        }
      } else {
        // Create new
        const res = await fetch('/api/data/HealthEvents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([newEvent])
        });
        
        if (res.ok) {
          setIsModalOpen(false);
          setNewEvent(defaultEvent);
          fetchEvents();
        } else {
          throw new Error('Failed to save event');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/data/HealthEvents/${editingEvent._rowIndex}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setConfirmDelete(null);
        setEditingEvent(null);
        setNewEvent(defaultEvent);
        setIsModalOpen(false);
        fetchEvents();
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (event: any) => {
    setEditingEvent(event);
    setNewEvent({
      Date: event.Date || '',
      Type: event.Type || 'Illness',
      Description: event.Description || '',
      Notes: event.Notes || ''
    });
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setNewEvent(defaultEvent);
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setNewEvent(defaultEvent);
    setConfirmDelete(null);
    setError('');
  };

  // Filtering & Sorting Logic
  const filteredEvents = useMemo(() => {
    let result = events.filter(e => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (e.Description || '').toLowerCase().includes(query) ||
          (e.Notes || '').toLowerCase().includes(query) ||
          (e.Type || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date Range filter
      if (filterStartDate || filterEndDate) {
        const eventDate = e.Date ? new Date(e.Date) : null;
        if (!eventDate) return false;

        if (filterStartDate && eventDate < new Date(filterStartDate)) return false;
        if (filterEndDate && eventDate > new Date(filterEndDate)) return false;
      }

      return true;
    });

    // Sorting logic
    result = [...result].sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.Date).getTime() - new Date(a.Date).getTime();
      } else if (sortOption === 'date_asc') {
        return new Date(a.Date).getTime() - new Date(b.Date).getTime();
      } else if (sortOption === 'type_asc') {
        return (a.Type || '').localeCompare(b.Type || '', 'th');
      } else if (sortOption === 'type_desc') {
        return (b.Type || '').localeCompare(a.Type || '', 'th');
      }
      return 0;
    });

    return result;
  }, [events, searchQuery, filterStartDate, filterEndDate, sortOption]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError('');

    try {
      const { analyzeImage } = await import('../utils/gemini');
      const prompt = `
        Analyze this medical document, doctor's note, or imaging result (e.g., MRI, X-Ray, Ultrasound). Extract the data into a JSON object.
        IMPORTANT: This image might be a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen. Focus STRICTLY on extracting the medical event details from the main content area.
        The object should have the following keys:
        - Date: The date of the test or event (format YYYY-MM-DD). If not found, leave empty.
        - Type: Categorize the event into one of these exact strings: "Illness", "Symptom", "Diagnosis", "Surgery/Procedure", "Other". (For imaging like MRI/X-Ray, use "Diagnosis" or "Other").
        - Description: A short, concise title for the event (e.g., "MRI Brain Results", "Chest X-Ray", "Doctor's Appointment").
        - Notes: A detailed summary or translation of the findings, impressions, or doctor's notes. Translate complex medical terms into easy-to-understand Thai if possible.
        
        Return ONLY the JSON object. Do not include markdown formatting like \`\`\`json.
      `;
      
      const data = await analyzeImage(file, prompt, selectedModel);
      
      // Update form with extracted data
      setNewEvent(prev => ({
        ...prev,
        Date: data.Date || prev.Date,
        Type: data.Type || prev.Type,
        Description: data.Description || prev.Description,
        Notes: data.Notes || prev.Notes
      }));
      
      // Log usage to backend
      fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'analyze-event', modelMessage: 'success' })
      }).catch(console.error);
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getTypeConfig = (typeValue: string) => {
    return eventTypes.find(t => t.value === typeValue) || eventTypes[4];
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Health Events</h1>
          <p className="text-slate-500 mt-2">Record medical history, symptoms, surgeries, and illnesses.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </header>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-2xl my-auto">
            <div className={clsx(
              "p-6 border-b border-slate-100 flex items-center justify-between",
              editingEvent ? "bg-amber-50/50" : "bg-indigo-50/30"
            )}>
              <div className="flex items-center gap-3">
                {editingEvent ? <Edit2 className="w-5 h-5 text-amber-600" /> : <CalendarHeart className="w-5 h-5 text-indigo-600" />}
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingEvent ? 'Edit Health Event' : 'Record New Health Event'}
                </h2>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* AI Image Upload Section */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Auto-fill from Medical Document
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">
                      Upload a photo of your doctor's note, MRI, or X-Ray report to automatically extract details.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 bg-white border border-indigo-200 text-indigo-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={analyzing}
                    >
<option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
<option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
<option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
<option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
<option value="gemini-flash-latest">Gemini Flash Latest</option>
<option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
<option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
                    </select>
                    <div className="relative w-full sm:w-auto">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={analyzing}
                      />
                      <button
                        type="button"
                        disabled={analyzing}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.Date}
                    onChange={e => setNewEvent({...newEvent, Date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Type *</label>
                  <select 
                    value={newEvent.Type}
                    onChange={e => setNewEvent({...newEvent, Type: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.Description}
                    onChange={e => setNewEvent({...newEvent, Description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="e.g., เปลี่ยนข้อเข่าเทียม, ติดโควิด, หน้ามืดเวียนหัว"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                  <textarea 
                    value={newEvent.Notes}
                    onChange={e => setNewEvent({...newEvent, Notes: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[100px]"
                    placeholder="รายละเอียดเพิ่มเติม เช่น อาการเป็นอย่างไร, รักษาที่ไหน, หมอแนะนำว่าอย่างไร..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center gap-3">
                {editingEvent ? (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirmDelete === editingEvent._rowIndex) {
                        handleDelete();
                      } else {
                        setConfirmDelete(editingEvent._rowIndex);
                      }
                    }}
                    disabled={saving}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50",
                      confirmDelete === editingEvent._rowIndex ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    {confirmDelete === editingEvent._rowIndex ? 'Confirm Delete?' : 'Delete Event'}
                  </button>
                ) : (
                  <div></div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-2.5 text-white font-medium rounded-xl transition-colors disabled:opacity-50",
                      editingEvent ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Save Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarHeart className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Health History</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="bg-transparent border-none p-0 text-xs focus:ring-0 outline-none text-slate-600 w-28"
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="bg-transparent border-none p-0 text-xs focus:ring-0 outline-none text-slate-600 w-28"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select 
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="bg-transparent border-none p-0 text-xs focus:ring-0 outline-none text-slate-600 font-medium"
              >
                <option value="date_desc">วันที่ (ใหม่-เก่า)</option>
                <option value="date_asc">วันที่ (เก่า-ใหม่)</option>
                <option value="type_asc">ประเภท (ก-ฮ, A-Z)</option>
                <option value="type_desc">ประเภท (ฮ-ก, Z-A)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ค้นหา Health Events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-48"
              />
            </div>

            {(filterStartDate || filterEndDate || searchQuery || sortOption !== 'date_desc') && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setSearchQuery(''); setSortOption('date_desc'); }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                title="ล้างตัวกรอง"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading history...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarHeart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No health events found.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
              {filteredEvents.map((event: any, i) => {
                const typeConfig = getTypeConfig(event.Type);
                const Icon = typeConfig.icon;
                
                return (
                  <div key={i} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className={clsx(
                      "absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white",
                      typeConfig.bg, typeConfig.color
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className={clsx(
                      "bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-colors group",
                      editingEvent?._rowIndex === event._rowIndex && "bg-amber-50/30 border-amber-200"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-900 text-lg">
                            <Highlight text={event.Description} query={searchQuery} />
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 w-fit">
                            {new Date(event.Date).toLocaleDateString('en-GB', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </span>
                          <button 
                            onClick={() => startEdit(event)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-600 hover:text-indigo-700 bg-white rounded-full border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-md", typeConfig.bg, typeConfig.color)}>
                          <Highlight text={event.Type} query={searchQuery} />
                        </span>
                      </div>
                      {event.Notes && (
                        <p className="text-slate-600 text-sm whitespace-pre-wrap mt-3 pt-3 border-t border-slate-200/60">
                          <Highlight text={event.Notes} query={searchQuery} />
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
