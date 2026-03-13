import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Droplet, HeartPulse, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculateAge } from '../utils/age';
import HealthAnalysis from '../components/HealthAnalysis';

export default function Dashboard() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [labs, setLabs] = useState([]);
  const [usage, setUsage] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const MAX_QUOTA = 1500;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vitalsRes, labsRes, usageRes, profileRes] = await Promise.all([
          fetch('/api/data/Vitals'),
          fetch('/api/data/LabResults'),
          fetch('/api/usage/today'),
          fetch('/api/data/Profile')
        ]);
        
        if (vitalsRes.ok) setVitals(await vitalsRes.json());
        if (labsRes.ok) setLabs(await labsRes.json());
        
        if (usageRes.ok) {
          const { count } = await usageRes.json();
          setUsage(count);
        }

        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles.length > 0) {
            setProfile(profiles[profiles.length - 1]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const filteredVitals = vitals.filter((v: any) => {
    if (!v.Date) return false;
    const date = new Date(v.Date);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });

  const filteredLabs = labs.filter((l: any) => {
    if (!l.Date) return false;
    const date = new Date(l.Date);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });

  const bpData = filteredVitals.map((v: any) => ({
    date: v.Date,
    systolic: parseInt(v.Systolic),
    diastolic: parseInt(v.Diastolic)
  }))
  .filter(v => v.systolic && v.diastolic)
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const quotaPercentage = (usage / MAX_QUOTA) * 100;

  // Helper for Age
  const getAgeInYears = () => {
    if (!profile?.BirthDate) return null;
    const birthDate = new Date(profile.BirthDate);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const age = getAgeInYears();
  const isMale = profile?.Gender === 'Male';
  const isFemale = profile?.Gender === 'Female';

  // Group Labs by Date for multi-line charts
  const groupedLabs = filteredLabs.reduce((acc: any, curr: any) => {
    if (!acc[curr.Date]) acc[curr.Date] = { date: curr.Date };
    const name = (curr.TestName || '').toLowerCase();
    
    const getVal = (l: any) => {
      const rawVal = l.Value ?? l.ResultValue ?? l.Result ?? l.value;
      if (rawVal === undefined || rawVal === null) return NaN;
      const stringVal = String(rawVal);
      const match = stringVal.match(/[-+]?\d*\.?\d+/);
      return match ? parseFloat(match[0]) : NaN;
    };
    
    const val = getVal(curr);
    if (isNaN(val)) return acc;

    const checkWord = (k: string) => {
      const keyword = k.toLowerCase();
      if (name === keyword) return true;
      if (keyword.length <= 4) {
        const regex = new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`, 'i');
        return regex.test(name);
      }
      return name.includes(keyword);
    };

    const matches = (keywords: string[]) => keywords.some(checkWord);

    if (matches(['creatinine', 'cr']) && !matches(['ratio', 'clearance']) && acc[curr.Date].cr === undefined) acc[curr.Date].cr = val;
    if (matches(['fasting blood sugar', 'fbs', 'glucose']) && !matches(['average', 'eag', 'urine']) && acc[curr.Date].fbs === undefined) acc[curr.Date].fbs = val;
    if (matches(['hba1c', 'hemoglobin a1c']) && !matches(['average', 'eag']) && acc[curr.Date].hba1c === undefined) {
      // Handle IFCC (mmol/mol) to NGSP (%) conversion if value is high
      let hba1cVal = val;
      if (hba1cVal > 20) {
        hba1cVal = parseFloat(((0.09148 * hba1cVal) + 2.152).toFixed(1));
      }
      acc[curr.Date].hba1c = hba1cVal;
    }
    if (matches(['ast', 'sgot']) && !matches(['ratio']) && acc[curr.Date].ast === undefined) acc[curr.Date].ast = val;
    if (matches(['alt', 'sgpt']) && !matches(['ratio']) && acc[curr.Date].alt === undefined) acc[curr.Date].alt = val;
    if (matches(['alp', 'alkaline phosphatase']) && !matches(['isoenzyme']) && acc[curr.Date].alp === undefined) acc[curr.Date].alp = val;
    if (matches(['bun', 'blood urea nitrogen']) && !matches(['ratio']) && acc[curr.Date].bun === undefined) acc[curr.Date].bun = val;
    if (matches(['ldl', 'low density']) && !matches(['ratio']) && acc[curr.Date].ldl === undefined) acc[curr.Date].ldl = val;
    if (matches(['hdl', 'high density']) && !matches(['ratio']) && acc[curr.Date].hdl === undefined) acc[curr.Date].hdl = val;
    if (matches(['triglyceride', 'tg']) && !matches(['ratio']) && acc[curr.Date].tg === undefined) acc[curr.Date].tg = val;
    if (matches(['total cholesterol', 'cholesterol', 'tc']) && !matches(['hdl', 'ldl', 'ratio']) && acc[curr.Date].tc === undefined) acc[curr.Date].tc = val;
    
    // Thyroid
    if (matches(['tsh', 'thyroid stimulating']) && acc[curr.Date].tsh === undefined) acc[curr.Date].tsh = val;
    if (matches(['ft3', 'free t3']) && !matches(['total']) && acc[curr.Date].ft3 === undefined) acc[curr.Date].ft3 = val;
    if (matches(['ft4', 'free t4']) && !matches(['total']) && acc[curr.Date].ft4 === undefined) acc[curr.Date].ft4 = val;
    if (matches(['t3', 'triiodothyronine']) && !matches(['free']) && acc[curr.Date].t3 === undefined) acc[curr.Date].t3 = val;
    if (matches(['t4', 'thyroxine']) && !matches(['free']) && acc[curr.Date].t4 === undefined) acc[curr.Date].t4 = val;

    // Inflammation
    if (matches(['hs-crp', 'hscrp', 'c-reactive protein']) && acc[curr.Date].crp === undefined) acc[curr.Date].crp = val;
    if (matches(['esr', 'erythrocyte sedimentation rate']) && acc[curr.Date].esr === undefined) acc[curr.Date].esr = val;

    // Tumor Markers
    if (matches(['cea', 'carcinoembryonic']) && acc[curr.Date].cea === undefined) acc[curr.Date].cea = val;
    if (matches(['afp', 'alpha-fetoprotein', 'alpha fetoprotein']) && acc[curr.Date].afp === undefined) acc[curr.Date].afp = val;
    if (matches(['psa', 'prostate specific antigen']) && acc[curr.Date].psa === undefined) acc[curr.Date].psa = val;
    if (matches(['ca 125', 'ca125']) && acc[curr.Date].ca125 === undefined) acc[curr.Date].ca125 = val;
    if (matches(['ca 15-3', 'ca15-3', 'ca153']) && acc[curr.Date].ca153 === undefined) acc[curr.Date].ca153 = val;
    if (matches(['ca 19-9', 'ca19-9', 'ca199']) && acc[curr.Date].ca199 === undefined) acc[curr.Date].ca199 = val;

    return acc;
  }, {});

  const labTrendData = Object.values(groupedLabs).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  labTrendData.forEach((d: any) => {
    if (d.cr && age !== null && (isMale || isFemale)) {
      let egfr = 0;
      if (isFemale) {
        if (d.cr <= 0.7) egfr = 142 * Math.pow(d.cr / 0.7, -0.241) * Math.pow(0.9938, age) * 1.012;
        else egfr = 142 * Math.pow(d.cr / 0.7, -1.200) * Math.pow(0.9938, age) * 1.012;
      } else {
        if (d.cr <= 0.9) egfr = 142 * Math.pow(d.cr / 0.9, -0.302) * Math.pow(0.9938, age);
        else egfr = 142 * Math.pow(d.cr / 0.9, -1.200) * Math.pow(0.9938, age);
      }
      d.egfr = parseFloat(egfr.toFixed(1));
    }
    
    // Lipid Ratios
    if (d.tc && d.hdl) d.tc_hdl = parseFloat((d.tc / d.hdl).toFixed(2));
    if (d.ldl && d.hdl) d.ldl_hdl = parseFloat((d.ldl / d.hdl).toFixed(2));
    if (d.tg && d.hdl) d.tg_hdl = parseFloat((d.tg / d.hdl).toFixed(2));
  });

  const egfrData: any[] = labTrendData.filter((d: any) => d.egfr !== undefined);
  const sugarData: any[] = labTrendData.filter((d: any) => d.fbs !== undefined || d.hba1c !== undefined);
  const liverData: any[] = labTrendData.filter((d: any) => d.ast !== undefined || d.alt !== undefined);
  const lipidData: any[] = labTrendData.filter((d: any) => d.ldl !== undefined || d.hdl !== undefined || d.tg !== undefined || d.tc !== undefined);
  const thyroidData: any[] = labTrendData.filter((d: any) => d.tsh !== undefined || d.ft3 !== undefined || d.ft4 !== undefined || d.t3 !== undefined || d.t4 !== undefined);
  const lipidRatioData: any[] = labTrendData.filter((d: any) => d.tc_hdl !== undefined || d.ldl_hdl !== undefined || d.tg_hdl !== undefined);
  const inflammationData: any[] = labTrendData.filter((d: any) => d.crp !== undefined || d.esr !== undefined);
  const tumorMarkerData: any[] = labTrendData.filter((d: any) => d.cea !== undefined || d.afp !== undefined || d.psa !== undefined || d.ca125 !== undefined || d.ca153 !== undefined || d.ca199 !== undefined);

  const ChartCard = ({ title, data, lines, interpretation, dualAxis }: { title: string, data: any[], lines: any[], interpretation: string, dualAxis?: boolean }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
      <div className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
        <span className="font-semibold text-indigo-700 mr-1">💡 แปลผล:</span>
        {interpretation}
      </div>
      <div className="h-64 w-full mt-auto">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              {dualAxis && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />}
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {lines.map((line, i) => (
                <Line key={i} yAxisId={line.yAxisId || 'left'} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} dot={{ r: 4 }} name={line.name} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
            ยังไม่มีข้อมูลสำหรับกราฟนี้
          </div>
        )}
      </div>
    </div>
  );

  const latestBp = bpData.length > 0 ? bpData[bpData.length - 1] : null;
  const latestFbs = [...sugarData].reverse().find(d => d.fbs !== undefined);

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-2">Overview of your health metrics and API usage.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 self-start md:self-center">
            <img 
              src={user?.picture} 
              alt={user?.name} 
              className="w-10 h-10 rounded-full border-2 border-indigo-50"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="font-semibold text-slate-900 text-sm">{profile?.Name || user?.name}</p>
              {profile?.BirthDate ? (
                <p className="text-xs text-indigo-600 font-medium">อายุ: {calculateAge(profile.BirthDate)}</p>
              ) : (
                <p className="text-xs text-slate-500">Welcome back</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">ตั้งแต่:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none"
            />
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">ถึง:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none"
            />
          </div>
        </div>
      </header>

      {/* Quota Alert */}
      {usage > MAX_QUOTA * 0.8 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">API Quota Warning</h3>
            <p className="text-sm text-amber-700 mt-1">You have used {usage} out of {MAX_QUOTA} requests today. Approaching the free tier limit.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-slate-500">Latest BP</p>
                {latestBp?.date && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {latestBp.date}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '--/--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-slate-500">Latest FBS</p>
                {latestFbs?.date && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {latestFbs.date}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {latestFbs?.fbs ? `${latestFbs.fbs} mg/dL` : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Gemini AI API Quota (Today)</p>
              <div className="flex items-end justify-between mt-1">
                <p className="text-2xl font-bold text-slate-900">{usage}</p>
                <p className="text-sm text-slate-500 mb-1">/ {MAX_QUOTA}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${quotaPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="ความดันโลหิต (Blood Pressure)" 
          data={bpData} 
          lines={[
            { key: 'systolic', color: '#e11d48', name: 'ตัวบน (Systolic)' },
            { key: 'diastolic', color: '#3b82f6', name: 'ตัวล่าง (Diastolic)' }
          ]}
          interpretation="ตัวบนควร < 120 และตัวล่างควร < 80 mmHg หากเกิน 140/90 ถือว่ามีความดันโลหิตสูง ควรควบคุมอาหารเค็มและออกกำลังกาย"
        />

        <ChartCard 
          title="น้ำตาลในเลือด (FBS & HbA1c)" 
          data={sugarData} 
          dualAxis={true}
          lines={[
            { key: 'fbs', color: '#059669', name: 'FBS (mg/dL)', yAxisId: 'left' },
            { key: 'hba1c', color: '#e11d48', name: 'HbA1c (%)', yAxisId: 'right' }
          ]}
          interpretation="FBS ควร < 100 mg/dL และ HbA1c ควร < 5.7% (HbA1c คือน้ำตาลสะสมเฉลี่ย 3 เดือน ซึ่งบอกพฤติกรรมการกินได้แม่นยำกว่า FBS ที่อาจอดอาหารมาแค่ก่อนเจาะเลือด)"
        />

        <ChartCard 
          title="การทำงานของไต (eGFR)" 
          data={egfrData} 
          lines={[
            { key: 'egfr', color: '#8b5cf6', name: 'eGFR (mL/min/1.73m²)' }
          ]}
          interpretation="ค่าปกติ ≥ 90 (ยิ่งมากยิ่งดี) หากต่ำกว่า 60 ติดต่อกัน 3 เดือน ถือว่ามีภาวะไตเสื่อมเรื้อรัง ควรดื่มน้ำให้เพียงพอและเลี่ยงยาแก้ปวด"
        />

        <ChartCard 
          title="การทำงานของตับ (AST / ALT)" 
          data={liverData} 
          lines={[
            { key: 'ast', color: '#f59e0b', name: 'AST (SGOT)' },
            { key: 'alt', color: '#d946ef', name: 'ALT (SGPT)' }
          ]}
          interpretation="ค่าปกติมักจะไม่เกิน 40 U/L (ยิ่งน้อยยิ่งดี) หากสูงกว่าปกติอาจเกิดจากภาวะไขมันพอกตับ การดื่มแอลกอฮอล์ หรือตับอักเสบ"
        />

        <ChartCard 
          title="ไขมันในเลือด (Lipid Profile)" 
          data={lipidData} 
          lines={[
            { key: 'ldl', color: '#e11d48', name: 'ไขมันเลว (LDL)' },
            { key: 'hdl', color: '#059669', name: 'ไขมันดี (HDL)' },
            { key: 'tg', color: '#f59e0b', name: 'ไตรกลีเซอไรด์ (TG)' },
            { key: 'tc', color: '#64748b', name: 'คอเลสเตอรอลรวม' }
          ]}
          interpretation="LDL ควร < 100 (ยิ่งน้อยยิ่งดี), HDL ควร > 40-50 (ยิ่งมากยิ่งดี), ไตรกลีเซอไรด์ ควร < 150 และคอเลสเตอรอลรวม ควร < 200 mg/dL"
        />

        <ChartCard 
          title="อัตราส่วนไขมันในเลือด (Lipid Ratios)" 
          data={lipidRatioData} 
          lines={[
            { key: 'tc_hdl', color: '#64748b', name: 'TC/HDL' },
            { key: 'ldl_hdl', color: '#e11d48', name: 'LDL/HDL' },
            { key: 'tg_hdl', color: '#f59e0b', name: 'TG/HDL' }
          ]}
          interpretation="TC/HDL ควร < 5 (ดีที่สุด < 3.5), LDL/HDL ควร < 3.3 (ยิ่งน้อยยิ่งดี), TG/HDL ควร < 2 (บ่งบอกภาวะดื้ออินซูลินหาก > 2)"
        />

        <ChartCard 
          title="ค่าการอักเสบในร่างกาย (Inflammation Markers)" 
          data={inflammationData} 
          lines={[
            { key: 'crp', color: '#ef4444', name: 'hs-CRP (mg/L)' },
            { key: 'esr', color: '#f97316', name: 'ESR (mm/hr)' }
          ]}
          interpretation="hs-CRP ควร < 1.0 mg/L (ความเสี่ยงโรคหัวใจต่ำ), ESR ควร < 15-20 mm/hr บ่งบอกถึงระดับการอักเสบซ่อนเร้นในร่างกาย"
        />

        <ChartCard 
          title="ฮอร์โมนไทรอยด์ (Thyroid Profile)" 
          data={thyroidData} 
          lines={[
            { key: 'tsh', color: '#8b5cf6', name: 'TSH' },
            { key: 'ft3', color: '#ec4899', name: 'Free T3' },
            { key: 'ft4', color: '#14b8a6', name: 'Free T4' },
            { key: 't3', color: '#f97316', name: 'T3' },
            { key: 't4', color: '#3b82f6', name: 'T4' }
          ]}
          interpretation="TSH ปกติ 0.4-4.0 mIU/L (ค่าสูง=ไทรอยด์ทำงานต่ำ, ค่าต่ำ=ไทรอยด์เป็นพิษ), Free T3 ปกติ 2.0-4.4 pg/mL, Free T4 ปกติ 0.9-1.7 ng/dL"
        />

        <ChartCard 
          title="สารบ่งชี้มะเร็ง (Tumor Markers)" 
          data={tumorMarkerData} 
          lines={[
            { key: 'cea', color: '#64748b', name: 'CEA (ลำไส้)' },
            { key: 'afp', color: '#f59e0b', name: 'AFP (ตับ)' },
            { key: 'psa', color: '#3b82f6', name: 'PSA (ต่อมลูกหมาก)' },
            { key: 'ca125', color: '#ec4899', name: 'CA 125 (รังไข่)' },
            { key: 'ca153', color: '#d946ef', name: 'CA 15-3 (เต้านม)' },
            { key: 'ca199', color: '#14b8a6', name: 'CA 19-9 (ตับอ่อน/ทางเดินอาหาร)' }
          ]}
          interpretation="CEA < 5 ng/mL, AFP < 10 ng/mL, PSA < 4 ng/mL, CA 125 < 35 U/mL, CA 15-3 < 30 U/mL, CA 19-9 < 37 U/mL (ค่าสูงไม่ได้แปลว่าเป็นมะเร็งเสมอไป ควรปรึกษาแพทย์)"
        />
      </div>

      {/* Health Analysis Section */}
      <HealthAnalysis vitals={filteredVitals} labs={filteredLabs} profile={profile} />
    </div>
  );
}
