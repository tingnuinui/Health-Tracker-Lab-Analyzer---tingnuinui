import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Save, X, Plus, Edit2, Search, Trash2, Users, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

export default function FamilyHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Manual Entry & Edit State
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const defaultRecord = {
    Relation: '',
    Condition: '',
    AgeOfOnset: '',
    CurrentStatus: '',
    Notes: ''
  };
  const [manualRecord, setManualRecord] = useState(defaultRecord);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('default');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/data/FamilyHistory');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch family history', error);
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
    setEditingRecord(null);

    try {
      const { analyzeImage } = await import('../utils/gemini');
      const prompt = `
        Analyze this image containing family medical history (e.g., a written family tree, medical form, or notes). Extract the data into a JSON array of objects.
        If there are multiple family members or conditions, return an object for each one.
        Each object should have the following keys:
        - Relation: The relationship to the patient (e.g., "พ่อ", "แม่", "ปู่", "ตา", "พี่ชาย").
        - Condition: The medical condition or disease (e.g., "เบาหวาน", "ความดันโลหิตสูง", "มะเร็งลำไส้").
        - AgeOfOnset: The age when the condition started or was diagnosed (if available, e.g., "50", "ประมาณ 60 ปี"). Leave empty if not available.
        - CurrentStatus: The current status of the family member (e.g., "รักษาอยู่", "เสียชีวิตแล้ว", "ปกติ"). Leave empty if not available.
        - Notes: Any additional notes or details.
        
        Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
      `;
      
      let data = await analyzeImage(file, prompt, selectedModel);
      if (!Array.isArray(data)) {
        data = [data];
      }
      
      const enrichedData = data.map((item: any) => ({
        ...item,
        Relation: item.Relation || item.relation || '',
        Condition: item.Condition || item.condition || '',
        AgeOfOnset: item.AgeOfOnset || item.ageOfOnset || '',
        CurrentStatus: item.CurrentStatus || item.currentStatus || '',
        Notes: item.Notes || item.notes || ''
      }));
      setExtractedData(enrichedData);
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleExtractedChange = (index: number, field: string, value: string) => {
    if (!extractedData) return;
    const newData = [...extractedData];
    newData[index] = { ...newData[index], [field]: value };
    setExtractedData(newData);
  };

  const saveToServer = async (dataToSave: any[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/data/FamilyHistory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (res.ok) {
        setExtractedData(null);
        setShowManualForm(false);
        setManualRecord(defaultRecord);
        fetchHistory();
      } else {
        throw new Error('Failed to save data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedData) return;
    
    const formattedData = extractedData.map(item => ({
      Relation: item.Relation || item.relation || '',
      Condition: item.Condition || item.condition || '',
      AgeOfOnset: item.AgeOfOnset || item.ageOfOnset || '',
      CurrentStatus: item.CurrentStatus || item.currentStatus || '',
      Notes: item.Notes || item.notes || ''
    }));

    await saveToServer(formattedData);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingRecord) {
      try {
        const res = await fetch(`/api/data/FamilyHistory/${editingRecord._rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manualRecord)
        });
        if (res.ok) {
          setEditingRecord(null);
          setShowManualForm(false);
          setManualRecord(defaultRecord);
          fetchHistory();
        } else {
          throw new Error('Failed to update');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    } else {
      const formattedData = [manualRecord];
      await saveToServer(formattedData);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/data/FamilyHistory/${editingRecord._rowIndex}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEditingRecord(null);
        setShowManualForm(false);
        setConfirmDelete(false);
        fetchHistory();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = history.filter(h => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (h.Relation || '').toLowerCase().includes(query) ||
      (h.Condition || '').toLowerCase().includes(query) ||
      (h.Notes || '').toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (sortOption === 'relation_asc') {
      return (a.Relation || '').localeCompare(b.Relation || '', 'th');
    }
    if (sortOption === 'relation_desc') {
      return (b.Relation || '').localeCompare(a.Relation || '', 'th');
    }
    if (sortOption === 'condition_asc') {
      return (a.Condition || '').localeCompare(b.Condition || '', 'th');
    }
    if (sortOption === 'condition_desc') {
      return (b.Condition || '').localeCompare(a.Condition || '', 'th');
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            ประวัติสุขภาพครอบครัว (Family Medical History)
          </h1>
          <p className="text-slate-500 mt-1">บันทึกประวัติความเจ็บป่วยของบุคคลในครอบครัว เพื่อประเมินความเสี่ยง</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
              {uploading ? <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <Upload className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">อัปโหลดรูปประวัติครอบครัว</h3>
              <p className="text-sm text-slate-500 mt-1 mb-3">ใช้ AI ช่วยอ่านข้อมูลจากรูปถ่ายหรือเอกสาร</p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={uploading}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (เร็ว)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (แม่นยำ)</option>
                </select>
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <button 
                    disabled={uploading}
                    className="w-full px-4 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    เลือกรูปภาพ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <button 
            onClick={() => { 
              setEditingRecord(null);
              setManualRecord(defaultRecord);
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
              <h3 className="font-semibold text-slate-900">เพิ่มข้อมูลด้วยตัวเอง</h3>
              <p className="text-sm text-slate-500">กรอกรายละเอียดประวัติครอบครัวด้วยตนเอง</p>
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
                {editingRecord ? <Edit2 className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                <h2 className="text-lg font-semibold text-slate-900">{editingRecord ? 'แก้ไขประวัติครอบครัว' : 'เพิ่มประวัติครอบครัว'}</h2>
              </div>
              <button 
                onClick={() => { setShowManualForm(false); setEditingRecord(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveManual} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ความสัมพันธ์ *</label>
                <input 
                  type="text" 
                  required
                  value={manualRecord.Relation}
                  onChange={e => setManualRecord({...manualRecord, Relation: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น พ่อ, แม่, ปู่, ย่า, พี่ชาย"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">โรค/อาการเจ็บป่วย *</label>
                <input 
                  type="text" 
                  required
                  value={manualRecord.Condition}
                  onChange={e => setManualRecord({...manualRecord, Condition: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น เบาหวาน, ความดันสูง, มะเร็งลำไส้"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อายุที่เริ่มเป็นโรค (ถ้าทราบ)</label>
                <input 
                  type="text" 
                  value={manualRecord.AgeOfOnset}
                  onChange={e => setManualRecord({...manualRecord, AgeOfOnset: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น 50, ประมาณ 60 ปี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานะปัจจุบัน</label>
                <input 
                  type="text" 
                  value={manualRecord.CurrentStatus}
                  onChange={e => setManualRecord({...manualRecord, CurrentStatus: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="เช่น รักษาอยู่, เสียชีวิตแล้ว, ปกติ"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                <textarea 
                  value={manualRecord.Notes}
                  onChange={e => setManualRecord({...manualRecord, Notes: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[80px]"
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between gap-3">
              {editingRecord ? (
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
                      setEditingRecord(null); 
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">ความสัมพันธ์</label>
                  <input 
                    type="text" 
                    value={item.Relation || item.relation || ''}
                    onChange={(e) => handleExtractedChange(i, 'Relation', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">โรค/อาการเจ็บป่วย</label>
                  <input 
                    type="text" 
                    value={item.Condition || item.condition || ''}
                    onChange={(e) => handleExtractedChange(i, 'Condition', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">อายุที่เริ่มเป็นโรค</label>
                  <input 
                    type="text" 
                    value={item.AgeOfOnset || item.ageOfOnset || ''}
                    onChange={(e) => handleExtractedChange(i, 'AgeOfOnset', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">สถานะปัจจุบัน</label>
                  <input 
                    type="text" 
                    value={item.CurrentStatus || item.currentStatus || ''}
                    onChange={(e) => handleExtractedChange(i, 'CurrentStatus', e.target.value)}
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
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full sm:w-auto bg-white"
          >
            <option value="default">เรียงตามลำดับที่เพิ่ม</option>
            <option value="relation_asc">ความสัมพันธ์ (ก-ฮ, A-Z)</option>
            <option value="relation_desc">ความสัมพันธ์ (ฮ-ก, Z-A)</option>
            <option value="condition_asc">โรค/อาการเจ็บป่วย (ก-ฮ, A-Z)</option>
            <option value="condition_desc">โรค/อาการเจ็บป่วย (ฮ-ก, Z-A)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="ค้นหาความสัมพันธ์, โรค, หมายเหตุ..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm w-full"
            />
          </div>
          {(searchQuery || sortOption !== 'default') && (
            <button 
              onClick={() => { setSearchQuery(''); setSortOption('default'); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900">รายการประวัติสุขภาพครอบครัว</h2>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
            {filteredHistory.length} รายการ
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">ความสัมพันธ์</th>
                <th className="px-6 py-4">โรค/อาการเจ็บป่วย</th>
                <th className="px-6 py-4">อายุที่เริ่มเป็น</th>
                <th className="px-6 py-4">สถานะปัจจุบัน</th>
                <th className="px-6 py-4 min-w-[200px]">หมายเหตุ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูลประวัติสุขภาพครอบครัว</td>
                </tr>
              ) : (
                filteredHistory.map((h: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Highlight text={h.Relation} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-medium">
                      <Highlight text={h.Condition} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {h.AgeOfOnset || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        h.CurrentStatus?.includes('เสียชีวิต') ? "bg-slate-100 text-slate-700" :
                        h.CurrentStatus?.includes('ปกติ') ? "bg-emerald-100 text-emerald-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        <Highlight text={h.CurrentStatus || '-'} query={searchQuery} />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <Highlight text={h.Notes} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingRecord(h);
                          setManualRecord({
                            Relation: h.Relation || '',
                            Condition: h.Condition || '',
                            AgeOfOnset: h.AgeOfOnset || '',
                            CurrentStatus: h.CurrentStatus || '',
                            Notes: h.Notes || ''
                          });
                          setShowManualForm(true);
                          setConfirmDelete(false);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
    </div>
  );
}
