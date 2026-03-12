import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Activity, Search, Calendar, Filter, Trash2, Edit2, ArrowUpDown, X } from 'lucide-react';
import clsx from 'clsx';
import Highlight from '../components/Highlight';

export default function Vitals() {
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const defaultFormData = {
    Date: new Date().toISOString().split('T')[0],
    Weight: '',
    Height: '',
    Systolic: '',
    Diastolic: '',
    HeartRate: '',
    Notes: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  useEffect(() => {
    fetchVitals();
  }, []);

  const fetchVitals = async () => {
    try {
      const res = await fetch('/api/data/Vitals');
      if (res.ok) {
        const data = await res.json();
        setVitals(data);
      }
    } catch (error) {
      console.error('Failed to fetch vitals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRecord) {
        // Update existing
        const res = await fetch(`/api/data/Vitals/${editingRecord._rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setEditingRecord(null);
          setFormData(defaultFormData);
          setIsModalOpen(false);
          fetchVitals();
        }
      } else {
        // Create new
        const res = await fetch('/api/data/Vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setFormData(defaultFormData);
          setIsModalOpen(false);
          fetchVitals();
        }
      }
    } catch (error) {
      console.error('Failed to save vitals', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/data/Vitals/${editingRecord._rowIndex}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setConfirmDelete(null);
        setEditingRecord(null);
        setFormData(defaultFormData);
        setIsModalOpen(false);
        fetchVitals();
      }
    } catch (error) {
      console.error('Failed to delete record', error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      Date: record.Date || '',
      Weight: record.Weight || '',
      Height: record.Height || '',
      Systolic: record.Systolic || '',
      Diastolic: record.Diastolic || '',
      HeartRate: record.HeartRate || '',
      Notes: record.Notes || ''
    });
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setFormData(defaultFormData);
    setConfirmDelete(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData(defaultFormData);
    setConfirmDelete(null);
  };

  // Filtering & Sorting Logic
  const filteredVitals = useMemo(() => {
    let result = vitals.filter(v => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (v.Notes || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date Range filter
      if (filterStartDate || filterEndDate) {
        const recordDate = v.Date ? new Date(v.Date) : null;
        if (!recordDate) return false;

        if (filterStartDate && recordDate < new Date(filterStartDate)) return false;
        if (filterEndDate && recordDate > new Date(filterEndDate)) return false;
      }

      return true;
    });

    // Sorting logic
    result = [...result].sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.Date).getTime() - new Date(a.Date).getTime();
      } else if (sortOption === 'date_asc') {
        return new Date(a.Date).getTime() - new Date(b.Date).getTime();
      } else if (sortOption === 'weight_desc') {
        return (parseFloat(b.Weight) || 0) - (parseFloat(a.Weight) || 0);
      } else if (sortOption === 'weight_asc') {
        return (parseFloat(a.Weight) || 0) - (parseFloat(b.Weight) || 0);
      } else if (sortOption === 'bp_desc') {
        return (parseInt(b.Systolic) || 0) - (parseInt(a.Systolic) || 0);
      } else if (sortOption === 'hr_desc') {
        return (parseInt(b.HeartRate) || 0) - (parseInt(a.HeartRate) || 0);
      }
      return 0;
    });

    return result;
  }, [vitals, searchQuery, filterStartDate, filterEndDate, sortOption]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vitals</h1>
          <p className="text-slate-500 mt-2">Record and track your daily vital signs.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Record
        </button>
      </header>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-2xl my-auto">
            <div className={clsx(
              "p-6 border-b border-slate-100 flex items-center justify-between",
              editingRecord ? "bg-amber-50/50" : "bg-indigo-50/30"
            )}>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                {editingRecord ? (
                  <>
                    <Edit2 className="w-5 h-5 text-amber-600" />
                    Edit Vital Record
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-indigo-600" />
                    Add New Vital Record
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
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    name="Date"
                    value={formData.Date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    name="Weight"
                    value={formData.Weight}
                    onChange={handleChange}
                    placeholder="e.g. 70.5"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Height (cm)</label>
                  <input 
                    type="number" 
                    name="Height"
                    value={formData.Height}
                    onChange={handleChange}
                    placeholder="e.g. 175"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Systolic BP (mmHg)</label>
                  <input 
                    type="number" 
                    name="Systolic"
                    value={formData.Systolic}
                    onChange={handleChange}
                    placeholder="e.g. 120"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Diastolic BP (mmHg)</label>
                  <input 
                    type="number" 
                    name="Diastolic"
                    value={formData.Diastolic}
                    onChange={handleChange}
                    placeholder="e.g. 80"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Heart Rate (bpm)</label>
                  <input 
                    type="number" 
                    name="HeartRate"
                    value={formData.HeartRate}
                    onChange={handleChange}
                    placeholder="e.g. 72"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">หมายเหตุ (Notes)</label>
                  <input 
                    type="text" 
                    name="Notes"
                    value={formData.Notes}
                    onChange={handleChange}
                    placeholder="เช่น ข้อมูลหลังผ่าตัดวันที่ 8 พ.ค. 2023"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center gap-3">
                {editingRecord ? (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirmDelete === editingRecord._rowIndex) {
                        handleDelete();
                      } else {
                        setConfirmDelete(editingRecord._rowIndex);
                      }
                    }}
                    disabled={saving}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50",
                      confirmDelete === editingRecord._rowIndex ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    {confirmDelete === editingRecord._rowIndex ? 'Confirm Delete?' : 'Delete Record'}
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
                      editingRecord ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Records</h2>
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
                <option value="weight_desc">น้ำหนัก (มาก-น้อย)</option>
                <option value="weight_asc">น้ำหนัก (น้อย-มาก)</option>
                <option value="bp_desc">ความดัน (สูง-ต่ำ)</option>
                <option value="hr_desc">Heart Rate (สูง-ต่ำ)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ค้นหา Notes..."
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
                <th className="px-6 py-4">Weight</th>
                <th className="px-6 py-4">Height</th>
                <th className="px-6 py-4">Blood Pressure</th>
                <th className="px-6 py-4">Heart Rate</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : filteredVitals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No records found.</td>
                </tr>
              ) : (
                filteredVitals.map((v: any, i) => (
                  <tr key={i} className={clsx(
                    "hover:bg-slate-50/50 transition-colors",
                    editingRecord?._rowIndex === v._rowIndex && "bg-amber-50/30"
                  )}>
                    <td className="px-6 py-4 font-medium text-slate-900">{v.Date}</td>
                    <td className="px-6 py-4">{v.Weight ? `${v.Weight} kg` : '-'}</td>
                    <td className="px-6 py-4">{v.Height ? `${v.Height} cm` : '-'}</td>
                    <td className="px-6 py-4">
                      {v.Systolic && v.Diastolic ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          {v.Systolic}/{v.Diastolic}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">{v.HeartRate ? `${v.HeartRate} bpm` : '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate" title={v.Notes}>
                      <Highlight text={v.Notes || ''} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEdit(v)}
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
