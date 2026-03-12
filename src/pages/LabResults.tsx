import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Save, X, Plus, Search, Calendar, Filter, Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

export default function LabResults() {
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Manual Entry & Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const defaultLab = {
    Date: new Date().toISOString().split('T')[0],
    TestName: '',
    Value: '',
    Unit: '',
    ReferenceRange: '',
    Notes: ''
  };
  const [manualLab, setManualLab] = useState(defaultLab);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const res = await fetch('/api/data/LabResults');
      if (res.ok) {
        const data = await res.json();
        setLabs(data);
      }
    } catch (error) {
      console.error('Failed to fetch labs', error);
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

    try {
      const { analyzeImage } = await import('../utils/gemini');
      const prompt = `
        Analyze this lab result image. Extract the data into a JSON array of objects.
        IMPORTANT: This image is a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen (such as time, battery percentage, wifi/cellular signal, navigation bars, app headers, etc.). Focus STRICTLY on extracting the medical laboratory test results from the main content area.
        Each object should represent one test result and have the following keys:
        - testName: The name of the test. Normalize common abbreviations (e.g., "FBS" to "Fasting Blood Sugar", "Chol" to "Cholesterol", "TG" to "Triglycerides", "HDL-C" to "HDL Cholesterol", "LDL-C" to "LDL Cholesterol").
        - value: The numerical value or result.
        - unit: The unit of measurement (if available).
        - referenceRange: The normal or reference range (if available).
        
        Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
      `;
      
      const data = await analyzeImage(file, prompt, selectedModel);
      setExtractedData(data);
      
      // Log usage to backend
      fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'analyze-lab', modelMessage: 'success' })
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
    
    // Format data for long format: Date, TestName, Value, Unit, ReferenceRange, Notes
    const formattedData = extractedData.map(item => ({
      Date: selectedDate,
      TestName: item.testName || item.TestName || 'Unknown',
      Value: item.value || item.Value || '',
      Unit: item.unit || item.Unit || '',
      ReferenceRange: item.referenceRange || item.ReferenceRange || '',
      Notes: selectedNotes
    }));

    try {
      const res = await fetch('/api/data/LabResults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      
      if (res.ok) {
        setExtractedData(null);
        setSelectedNotes('');
        fetchLabs();
      } else {
        throw new Error('Failed to save');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLab.TestName || !manualLab.Value) {
      setError('กรุณากรอกชื่อการทดสอบและค่าผลลัพธ์');
      return;
    }
    
    setSaving(true);
    try {
      if (editingLab) {
        // Update existing
        const res = await fetch(`/api/data/LabResults/${editingLab._rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manualLab)
        });
        if (res.ok) {
          setIsModalOpen(false);
          setEditingLab(null);
          setManualLab(defaultLab);
          fetchLabs();
        } else {
          throw new Error('Failed to update lab result');
        }
      } else {
        // Create new
        const res = await fetch('/api/data/LabResults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([manualLab])
        });
        
        if (res.ok) {
          setIsModalOpen(false);
          setManualLab(defaultLab);
          fetchLabs();
        } else {
          throw new Error('Failed to save manual entry');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingLab) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/data/LabResults/${editingLab._rowIndex}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setConfirmDelete(null);
        setEditingLab(null);
        setManualLab(defaultLab);
        setIsModalOpen(false);
        fetchLabs();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (lab: any) => {
    setEditingLab(lab);
    setManualLab({
      Date: lab.Date || '',
      TestName: lab.TestName || '',
      Value: lab.Value || '',
      Unit: lab.Unit || '',
      ReferenceRange: lab.ReferenceRange || '',
      Notes: lab.Notes || ''
    });
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingLab(null);
    setManualLab(defaultLab);
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLab(null);
    setManualLab(defaultLab);
    setConfirmDelete(null);
    setError('');
  };

  // Filtering & Sorting Logic
  const filteredLabs = useMemo(() => {
    let result = labs.filter(l => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (l.TestName || '').toLowerCase().includes(query) ||
          (l.Notes || '').toLowerCase().includes(query) ||
          (l.Unit || '').toLowerCase().includes(query) ||
          (l.Value || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date Range filter
      if (filterStartDate || filterEndDate) {
        const labDate = l.Date ? new Date(l.Date) : null;
        if (!labDate) return false;

        if (filterStartDate && labDate < new Date(filterStartDate)) return false;
        if (filterEndDate && labDate > new Date(filterEndDate)) return false;
      }

      return true;
    });

    // Sorting logic
    result = [...result].sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.Date).getTime() - new Date(a.Date).getTime();
      } else if (sortOption === 'date_asc') {
        return new Date(a.Date).getTime() - new Date(b.Date).getTime();
      } else if (sortOption === 'name_asc') {
        return (a.TestName || '').localeCompare(b.TestName || '', 'th');
      } else if (sortOption === 'name_desc') {
        return (b.TestName || '').localeCompare(a.TestName || '', 'th');
      } else if (sortOption === 'value_desc') {
        return (parseFloat(b.Value) || 0) - (parseFloat(a.Value) || 0);
      } else if (sortOption === 'value_asc') {
        return (parseFloat(a.Value) || 0) - (parseFloat(b.Value) || 0);
      }
      return 0;
    });

    return result;
  }, [labs, searchQuery, filterStartDate, filterEndDate, sortOption]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lab Results</h1>
        <p className="text-slate-500 mt-2">Upload and analyze your lab reports using AI.</p>
      </header>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Upload Lab Report
          </h2>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Manual Entry
          </button>
        </div>
        
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 whitespace-nowrap">AI Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={uploading || saving}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
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
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Test Date:</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={uploading || saving}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Notes:</label>
                <input 
                  type="text" 
                  value={selectedNotes}
                  onChange={(e) => setSelectedNotes(e.target.value)}
                  disabled={uploading || saving}
                  placeholder="e.g. Blood test after surgery on May 8, 2023"
                  className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 text-indigo-600">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-900">
              {uploading ? 'Analyzing image with AI...' : 'Click or drag image to upload'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG (Max 5MB)</p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-2xl my-auto">
            <div className={clsx(
              "p-6 border-b border-slate-100 flex items-center justify-between",
              editingLab ? "bg-amber-50/50" : "bg-indigo-50/30"
            )}>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                {editingLab ? (
                  <>
                    <Edit2 className="w-5 h-5 text-amber-600" />
                    Edit Lab Result
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-indigo-600" />
                    Add New Lab Result
                  </>
                )}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleManualSave} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Date *</label>
                  <input 
                    type="date" 
                    required
                    value={manualLab.Date}
                    onChange={e => setManualLab({...manualLab, Date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Name *</label>
                  <input 
                    type="text" 
                    required
                    value={manualLab.TestName}
                    onChange={e => setManualLab({...manualLab, TestName: e.target.value})}
                    placeholder="e.g. Glucose, Cholesterol"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value *</label>
                  <input 
                    type="text" 
                    required
                    value={manualLab.Value}
                    onChange={e => setManualLab({...manualLab, Value: e.target.value})}
                    placeholder="e.g. 95, 120"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <input 
                    type="text" 
                    value={manualLab.Unit}
                    onChange={e => setManualLab({...manualLab, Unit: e.target.value})}
                    placeholder="e.g. mg/dL"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference Range</label>
                  <input 
                    type="text" 
                    value={manualLab.ReferenceRange}
                    onChange={e => setManualLab({...manualLab, ReferenceRange: e.target.value})}
                    placeholder="e.g. 70-100"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <input 
                    type="text" 
                    value={manualLab.Notes}
                    onChange={e => setManualLab({...manualLab, Notes: e.target.value})}
                    placeholder="e.g. Annual checkup, Fasting 12 hrs"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-between items-center gap-3">
                {editingLab ? (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirmDelete === editingLab._rowIndex) {
                        handleDelete();
                      } else {
                        setConfirmDelete(editingLab._rowIndex);
                      }
                    }}
                    disabled={saving}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50",
                      confirmDelete === editingLab._rowIndex ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    {confirmDelete === editingLab._rowIndex ? 'Confirm Delete?' : 'Delete Record'}
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
                      editingLab ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : editingLab ? 'Update Record' : 'Save Record'}
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Review Extracted Data</h2>
            </div>
            <button 
              onClick={() => setExtractedData(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Test Name</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Reference Range</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractedData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.testName || item.TestName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {item.value || item.Value}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.unit || item.Unit}</td>
                      <td className="px-4 py-3 text-slate-500">{item.referenceRange || item.ReferenceRange}</td>
                      <td className="px-4 py-3 text-slate-500">{selectedNotes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSaveExtracted}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Confirm & Save to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Lab History</h2>
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
                <option value="name_asc">Test Name (ก-ฮ, A-Z)</option>
                <option value="name_desc">Test Name (ฮ-ก, Z-A)</option>
                <option value="value_desc">Value (มาก-น้อย)</option>
                <option value="value_asc">Value (น้อย-มาก)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ค้นหา Lab History..."
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Reference Range</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : filteredLabs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No lab results found.</td>
                </tr>
              ) : (
                filteredLabs.map((l: any, i) => (
                  <tr key={i} className={clsx(
                    "hover:bg-slate-50/50 transition-colors",
                    editingLab?._rowIndex === l._rowIndex && "bg-amber-50/30"
                  )}>
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{l.Date}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <Highlight text={l.TestName} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        <Highlight text={l.Value} query={searchQuery} />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <Highlight text={l.Unit} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{l.ReferenceRange}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate" title={l.Notes}>
                      <Highlight text={l.Notes || ''} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEdit(l)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
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
