import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Activity, CheckCircle2, AlertCircle, Save, X, Plus, Edit2, Search, Calendar, Filter, Clock, Trash2, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

export default function Activities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [uploadStartDate, setUploadStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadEndDate, setUploadEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Manual Entry & Edit State
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const defaultActivity = {
    ActivityName: '',
    Duration: '',
    Frequency: '',
    Details: '',
    Purpose: '',
    StartDate: new Date().toISOString().split('T')[0],
    EndDate: '',
    Notes: ''
  };
  const [manualActivity, setManualActivity] = useState(defaultActivity);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortOption, setSortOption] = useState('default');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/data/Activities');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch activities', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setExtractedData(null);
    setShowManualForm(false);
    setEditingActivity(null);

    try {
      const { analyzeImage } = await import('../utils/gemini');
      const prompt = `
        Analyze this image related to health activities, exercise, or daily routines (e.g., smartwatch screenshot, fitness app, sleep tracker). Extract the data into a JSON array of objects.
        IMPORTANT: This image might be a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen. Focus STRICTLY on extracting the activity details from the main content area.
        If there are multiple activities, return an object for each one.
        Each object should have the following keys:
        - ActivityName: The name of the activity (e.g., "ปั่นจักรยาน", "นอนหลับ", "วิ่ง").
        - Duration: The duration per session (e.g., "30 นาที", "8 ชั่วโมง").
        - Frequency: How often it is done (e.g., "3 ครั้ง/สัปดาห์", "ทุกวัน").
        - Details: Details about the activity (e.g., "วิ่งโซน 2", "หลับลึก 2 ชั่วโมง").
        - Purpose: The purpose of the activity (e.g., "ลดน้ำหนัก", "พักผ่อน").
        - StartDate: The date the activity started (if available, format YYYY-MM-DD). If not available, leave empty.
        - EndDate: The date the activity ended or stopped (if available, format YYYY-MM-DD). If not available, leave empty.
        - Notes: Any additional notes.
        
        Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
      `;
      
      let data = await analyzeImage(file, prompt, selectedModel);
      if (!Array.isArray(data)) {
        data = [data];
      }
      
      // Ensure StartDate is populated
      const enrichedData = data.map((item: any) => ({
        ...item,
        StartDate: item.StartDate || item.startDate || uploadStartDate,
        EndDate: item.EndDate || item.endDate || uploadEndDate,
        Notes: item.Notes || item.notes || ''
      }));
      setExtractedData(enrichedData);
      
      // Log usage to backend
      fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'analyze-activity', modelMessage: 'success' })
      }).catch(console.error);
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedData) return;
    setSaving(true);
    
    const formattedData = extractedData.map(item => ({
      ActivityName: item.ActivityName || item.activityName || '',
      Duration: item.Duration || item.duration || '',
      Frequency: item.Frequency || item.frequency || '',
      Details: item.Details || item.details || '',
      Purpose: item.Purpose || item.purpose || '',
      StartDate: item.StartDate || '',
      EndDate: item.EndDate || '',
      Notes: item.Notes || ''
    }));

    await saveToServer(formattedData);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingActivity) {
      // Update existing
      try {
        const res = await fetch(`/api/data/Activities/${editingActivity._rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manualActivity)
        });
        if (res.ok) {
          setEditingActivity(null);
          setShowManualForm(false);
          setManualActivity(defaultActivity);
          fetchActivities();
        } else {
          throw new Error('Failed to update');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    } else {
      // Create new
      const formattedData = [manualActivity];
      await saveToServer(formattedData);
    }
  };

  const handleDelete = async () => {
    if (!editingActivity) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/data/Activities/${editingActivity._rowIndex}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEditingActivity(null);
        setShowManualForm(false);
        setManualActivity(defaultActivity);
        setConfirmDelete(false);
        fetchActivities();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveToServer = async (dataToSave: any[]) => {
    try {
      const res = await fetch('/api/data/Activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (res.ok) {
        setExtractedData(null);
        setShowManualForm(false);
        setManualActivity(defaultActivity);
        fetchActivities();
      } else {
        throw new Error('Failed to save');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExtractedChange = (index: number, field: string, value: string) => {
    if (!extractedData) return;
    const newData = [...extractedData];
    newData[index] = { ...newData[index], [field]: value };
    setExtractedData(newData);
  };

  const openEditModal = (activity: any) => {
    setEditingActivity(activity);
    setConfirmDelete(false);
    setManualActivity({
      ActivityName: activity.ActivityName || '',
      Duration: activity.Duration || '',
      Frequency: activity.Frequency || '',
      Details: activity.Details || '',
      Purpose: activity.Purpose || '',
      StartDate: activity.StartDate || '',
      EndDate: activity.EndDate || '',
      Notes: activity.Notes || ''
    });
    setShowManualForm(true);
    setExtractedData(null);
  };

  // Calculate duration string
  const getDuration = (start: string, end: string) => {
    if (!start) return '-';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-';
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '1 วัน';
    if (diffDays < 30) return `${diffDays} วัน`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือน ${diffDays % 30} วัน`;
    return `${Math.floor(diffDays / 365)} ปี ${Math.floor((diffDays % 365) / 30)} เดือน`;
  };

  // Filtering logic
  const filteredActivities = useMemo(() => {
    let result = activities.filter(activity => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (activity.ActivityName || '').toLowerCase().includes(query) ||
          (activity.Purpose || '').toLowerCase().includes(query) ||
          (activity.Details || '').toLowerCase().includes(query) ||
          (activity.Notes || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date Range filter
      if (filterStartDate || filterEndDate) {
        const activityStart = activity.StartDate ? new Date(activity.StartDate) : new Date(0);
        const activityEnd = activity.EndDate ? new Date(activity.EndDate) : new Date(9999, 11, 31);
        
        const filterStart = filterStartDate ? new Date(filterStartDate) : new Date(0);
        const filterEnd = filterEndDate ? new Date(filterEndDate) : new Date(9999, 11, 31);
        
        // Check if the activity period overlaps with the filter period
        if (activityStart > filterEnd || activityEnd < filterStart) {
          return false;
        }
      }

      return true;
    });

    // Sorting logic
    if (sortOption !== 'default') {
      result = [...result].sort((a, b) => {
        if (sortOption === 'name_asc') {
          return (a.ActivityName || '').localeCompare(b.ActivityName || '', 'th');
        } else if (sortOption === 'start_desc') {
          const dateA = a.StartDate ? new Date(a.StartDate).getTime() : 0;
          const dateB = b.StartDate ? new Date(b.StartDate).getTime() : 0;
          return dateB - dateA;
        } else if (sortOption === 'start_asc') {
          const dateA = a.StartDate ? new Date(a.StartDate).getTime() : Infinity;
          const dateB = b.StartDate ? new Date(b.StartDate).getTime() : Infinity;
          return dateA - dateB;
        } else if (sortOption === 'end_desc') {
          const dateA = a.EndDate ? new Date(a.EndDate).getTime() : 0;
          const dateB = b.EndDate ? new Date(b.EndDate).getTime() : 0;
          return dateB - dateA;
        } else if (sortOption === 'end_asc') {
          const dateA = a.EndDate ? new Date(a.EndDate).getTime() : Infinity;
          const dateB = b.EndDate ? new Date(b.EndDate).getTime() : Infinity;
          return dateA - dateB;
        }
        return 0;
      });
    }

    return result;
  }, [activities, searchQuery, filterStartDate, filterEndDate, sortOption]);

  const activeActivities = filteredActivities.filter(activity => !activity.EndDate || new Date(activity.EndDate) >= new Date(new Date().setHours(0,0,0,0)));
  const pastActivities = filteredActivities.filter(activity => activity.EndDate && new Date(activity.EndDate) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">กิจวัตรและกิจกรรม (Activities)</h1>
          <p className="text-slate-500 mt-2">บันทึกกิจวัตรที่มีผลกับสุขภาพ เช่น การออกกำลังกาย การนอนหลับ การพักผ่อน</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={uploading || saving}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          >
            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
            <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
            <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
            <option value="gemini-flash-latest">Gemini Flash Latest</option>
            <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash  (Default)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
          </select>
        </div>
      </header>

      {/* Action Buttons & Upload Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">วันที่เริ่มกิจกรรม (ค่าเริ่มต้น):</label>
              <input 
                type="date" 
                value={uploadStartDate}
                onChange={(e) => setUploadStartDate(e.target.value)}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">วันที่หยุดกิจกรรม (ค่าเริ่มต้น):</label>
              <input 
                type="date" 
                value={uploadEndDate}
                onChange={(e) => setUploadEndDate(e.target.value)}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="flex-1 relative group cursor-pointer hover:bg-slate-50 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">สแกนข้อมูลกิจกรรม (AI)</h3>
                <p className="text-sm text-slate-500">อัปโหลดรูปภาพจากแอปสุขภาพเพื่อดึงข้อมูลอัตโนมัติ</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { 
              setEditingActivity(null);
              setManualActivity(defaultActivity);
              setShowManualForm(true); 
              setExtractedData(null); 
              setError(''); 
            }}
            className="flex-1 p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">เพิ่มข้อมูลกิจกรรมด้วยตัวเอง</h3>
              <p className="text-sm text-slate-500">กรอกรายละเอียดกิจกรรมด้วยตนเอง</p>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Manual Entry / Edit Form Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden ring-1 ring-emerald-50 w-full max-w-2xl my-auto">
            <div className="p-6 border-b border-emerald-50 bg-emerald-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingActivity ? <Edit2 className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                <h2 className="text-lg font-semibold text-slate-900">{editingActivity ? 'แก้ไขข้อมูลกิจกรรม' : 'เพิ่มข้อมูลกิจกรรม'}</h2>
              </div>
              <button 
                onClick={() => { setShowManualForm(false); setEditingActivity(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveManual} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อกิจกรรม *</label>
                <input 
                  type="text" 
                  required
                  value={manualActivity.ActivityName}
                  onChange={e => setManualActivity({...manualActivity, ActivityName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น ปั่นจักรยาน, นอนหลับ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลาที่ทำแต่ละครั้ง</label>
                <input 
                  type="text" 
                  value={manualActivity.Duration}
                  onChange={e => setManualActivity({...manualActivity, Duration: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น 30 นาที, 8 ชั่วโมง"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ความถี่</label>
                <input 
                  type="text" 
                  value={manualActivity.Frequency}
                  onChange={e => setManualActivity({...manualActivity, Frequency: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น 3 ครั้ง/สัปดาห์, ทุกวัน"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วัตถุประสงค์</label>
                <input 
                  type="text" 
                  value={manualActivity.Purpose}
                  onChange={e => setManualActivity({...manualActivity, Purpose: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น ลดน้ำหนัก, พักผ่อน"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดกิจกรรม</label>
                <input 
                  type="text" 
                  value={manualActivity.Details}
                  onChange={e => setManualActivity({...manualActivity, Details: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น ปั่นจักรยานจนเหงื่อออก หายใจหอบ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่เริ่มทำกิจกรรม</label>
                <input 
                  type="date" 
                  value={manualActivity.StartDate}
                  onChange={e => setManualActivity({...manualActivity, StartDate: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่หยุดทำกิจกรรม (เว้นว่างถ้ายังทำอยู่)</label>
                <input 
                  type="date" 
                  value={manualActivity.EndDate}
                  onChange={e => setManualActivity({...manualActivity, EndDate: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                <textarea 
                  value={manualActivity.Notes}
                  onChange={e => setManualActivity({...manualActivity, Notes: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[80px]"
                  placeholder="เช่น รู้สึกสดชื่นขึ้น, ปวดเมื่อยกล้ามเนื้อ"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between gap-3">
              {editingActivity ? (
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50",
                    confirmDelete ? "text-white bg-red-600 hover:bg-red-700" : "text-red-600 bg-red-50 hover:bg-red-100"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {confirmDelete ? 'ยืนยันการลบ?' : 'ลบรายการ'}
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { 
                    if (confirmDelete) {
                      setConfirmDelete(false);
                    } else {
                      setShowManualForm(false); 
                      setEditingActivity(null); 
                      setConfirmDelete(false);
                    }
                  }}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden ring-1 ring-indigo-50">
          <div className="p-6 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">ตรวจสอบข้อมูลที่สแกนได้</h2>
            </div>
            <button 
              onClick={() => setExtractedData(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {extractedData.map((item, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อกิจกรรม</label>
                  <input 
                    type="text" 
                    value={item.ActivityName || item.activityName || ''}
                    onChange={(e) => handleExtractedChange(i, 'ActivityName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ระยะเวลา</label>
                  <input 
                    type="text" 
                    value={item.Duration || item.duration || ''}
                    onChange={(e) => handleExtractedChange(i, 'Duration', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ความถี่</label>
                  <input 
                    type="text" 
                    value={item.Frequency || item.frequency || ''}
                    onChange={(e) => handleExtractedChange(i, 'Frequency', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">วัตถุประสงค์</label>
                  <input 
                    type="text" 
                    value={item.Purpose || item.purpose || ''}
                    onChange={(e) => handleExtractedChange(i, 'Purpose', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียดกิจกรรม</label>
                  <input 
                    type="text" 
                    value={item.Details || item.details || ''}
                    onChange={(e) => handleExtractedChange(i, 'Details', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">วันที่เริ่มทำกิจกรรม</label>
                  <input 
                    type="date" 
                    value={item.StartDate || ''}
                    onChange={(e) => handleExtractedChange(i, 'StartDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">วันที่หยุดทำกิจกรรม</label>
                  <input 
                    type="date" 
                    value={item.EndDate || ''}
                    onChange={(e) => handleExtractedChange(i, 'EndDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">หมายเหตุ</label>
                  <input 
                    type="text" 
                    value={item.Notes || item.notes || ''}
                    onChange={(e) => handleExtractedChange(i, 'Notes', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveExtracted}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'ยืนยันและบันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-wrap">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">ตัวกรอง:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={e => setFilterStartDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full sm:w-auto"
          />
          <span className="text-slate-400">-</span>
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={e => setFilterEndDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full sm:w-auto"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full sm:w-auto bg-white"
          >
            <option value="default">เรียงตามลำดับที่เพิ่ม</option>
            <option value="name_asc">ชื่อกิจกรรม (ก-ฮ, A-Z)</option>
            <option value="start_desc">วันเริ่มกิจกรรม (ใหม่สุดก่อน)</option>
            <option value="start_asc">วันเริ่มกิจกรรม (เก่าสุดก่อน)</option>
            <option value="end_desc">วันหยุดกิจกรรม (ใหม่สุดก่อน)</option>
            <option value="end_asc">วันหยุดกิจกรรม (เก่าสุดก่อน)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อกิจกรรม, วัตถุประสงค์, รายละเอียด..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full"
            />
          </div>
          {(filterStartDate || filterEndDate || searchQuery || sortOption !== 'default') && (
            <button 
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setSearchQuery(''); setSortOption('default'); }}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Active Activities Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">กิจกรรมที่ทำอยู่ปัจจุบัน (Active)</h2>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
            {activeActivities.length} รายการ
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">ชื่อกิจกรรม / วัตถุประสงค์</th>
                <th className="px-6 py-4">ระยะเวลา / ความถี่</th>
                <th className="px-6 py-4 min-w-[220px]">ระยะเวลาที่ทำ</th>
                <th className="px-6 py-4 min-w-[250px]">รายละเอียด / หมายเหตุ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : activeActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่พบรายการกิจกรรมที่ทำอยู่</td>
                </tr>
              ) : (
                activeActivities.map((a: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        <Highlight text={a.ActivityName} query={searchQuery} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        <Highlight text={a.Purpose} query={searchQuery} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                        <Highlight text={a.Duration} query={searchQuery} />
                      </span>
                      <div className="text-slate-700">
                        <Highlight text={a.Frequency} query={searchQuery} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">เริ่ม: {a.StartDate || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 mt-1 font-medium text-xs">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">ทำมาแล้ว: {getDuration(a.StartDate, '')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 min-w-[250px] whitespace-pre-wrap">
                      <div className="font-medium text-slate-700 mb-1">
                        <Highlight text={a.Details || ''} query={searchQuery} />
                      </div>
                      <Highlight text={a.Notes || ''} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(a)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Past Activities Table */}
      {pastActivities.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">กิจกรรมในอดีต (Past)</h2>
            </div>
            <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-full">
              {pastActivities.length} รายการ
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ชื่อกิจกรรม / วัตถุประสงค์</th>
                  <th className="px-6 py-4">ระยะเวลา / ความถี่</th>
                  <th className="px-6 py-4 min-w-[220px]">ช่วงเวลาที่ทำ</th>
                  <th className="px-6 py-4 min-w-[250px]">รายละเอียด / หมายเหตุ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastActivities.map((a: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">
                        <Highlight text={a.ActivityName} query={searchQuery} />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        <Highlight text={a.Purpose} query={searchQuery} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 mb-1">
                        <Highlight text={a.Duration} query={searchQuery} />
                      </span>
                      <div className="text-slate-500">
                        <Highlight text={a.Frequency} query={searchQuery} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">{a.StartDate || '-'} ถึง {a.EndDate || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 mt-1 font-medium text-xs">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">รวมเวลา: {getDuration(a.StartDate, a.EndDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 min-w-[250px] whitespace-pre-wrap">
                      <div className="font-medium text-slate-500 mb-1">
                        <Highlight text={a.Details || ''} query={searchQuery} />
                      </div>
                      <Highlight text={a.Notes || ''} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(a)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
