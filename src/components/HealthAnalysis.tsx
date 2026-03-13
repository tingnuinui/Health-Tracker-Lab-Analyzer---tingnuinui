import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Info, Droplets, Heart, Scale, FileText } from 'lucide-react';
import clsx from 'clsx';

interface HealthAnalysisProps {
  vitals: any[];
  labs: any[];
  profile: any;
}

export default function HealthAnalysis({ vitals, labs, profile }: HealthAnalysisProps) {
  const analysis = useMemo(() => {
    const results: any[] = [];

    // Helper to calculate precise age in years
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

    // 1. BMI Analysis
    const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;
    if (latestVitals && latestVitals.Weight && latestVitals.Height) {
      const weight = parseFloat(latestVitals.Weight);
      const height = parseFloat(latestVitals.Height) / 100; // convert cm to m
      const bmi = weight / (height * height);
      
      let status = '';
      let color = '';
      let icon = Scale;
      let advice = '';

      if (bmi < 18.5) {
        status = 'น้ำหนักน้อยเกินไป (Underweight)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ควรรับประทานอาหารที่มีประโยชน์เพิ่มขึ้น เพื่อเพิ่มน้ำหนักให้อยู่ในเกณฑ์มาตรฐาน';
      } else if (bmi >= 18.5 && bmi <= 22.9) {
        status = 'น้ำหนักปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'น้ำหนักอยู่ในเกณฑ์ดีเยี่ยม ควรรักษาสุขภาพและออกกำลังกายสม่ำเสมอ';
      } else if (bmi >= 23.0 && bmi <= 24.9) {
        status = 'น้ำหนักเกิน (Overweight)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรควบคุมอาหารและออกกำลังกายเพิ่มขึ้น เพื่อลดความเสี่ยงโรคอ้วน';
      } else if (bmi >= 25.0 && bmi <= 29.9) {
        status = 'อ้วนระดับ 1 (Obese Class I)';
        color = 'text-orange-600 bg-orange-50 border-orange-200';
        advice = 'มีความเสี่ยงต่อโรคเบาหวานและความดันโลหิตสูง ควรลดน้ำหนักอย่างจริงจัง';
      } else {
        status = 'อ้วนระดับ 2 (Obese Class II)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงสูงมากต่อโรคแทรกซ้อน ควรปรึกษาแพทย์เพื่อวางแผนลดน้ำหนัก';
      }

      results.push({
        category: 'ดัชนีมวลกาย (BMI)',
        date: latestVitals.Date,
        value: bmi.toFixed(1),
        unit: 'kg/m²',
        status,
        color,
        icon,
        advice
      });
    }

    // Helper to get latest lab value
    const getLatestLab = (testNames: string[], excludeNames: string[] = []) => {
      const matchedLabs = labs.filter(l => {
        const labName = (l.TestName || '').toLowerCase();
        
        const checkWord = (k: string) => {
          const keyword = k.toLowerCase();
          if (labName === keyword) return true;
          if (keyword.length <= 4) {
            const regex = new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`, 'i');
            return regex.test(labName);
          }
          return labName.includes(keyword);
        };

        const isMatch = testNames.some(checkWord);
        const isExcluded = excludeNames.some(checkWord);
        
        // Robust value parsing: extract first number found in string
        const rawVal = l.Value ?? l.ResultValue ?? l.Result ?? l.value;
        if (rawVal === undefined || rawVal === null) return false;
        
        const stringVal = String(rawVal);
        const match = stringVal.match(/[-+]?\d*\.?\d+/);
        const val = match ? parseFloat(match[0]) : NaN;
        
        return isMatch && !isExcluded && !isNaN(val);
      });
      
      if (matchedLabs.length === 0) return null;
      
      // Sort by date descending
      matchedLabs.sort((a, b) => {
        const dateA = new Date(a.Date).getTime();
        const dateB = new Date(b.Date).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      });
      
      const best = matchedLabs[0];
      const rawVal = best.Value ?? best.ResultValue ?? best.Result ?? best.value;
      const stringVal = String(rawVal);
      const match = stringVal.match(/[-+]?\d*\.?\d+/);
      const parsedValue = match ? parseFloat(match[0]) : NaN;
      
      return { ...best, parsedValue };
    };

    // 2. Blood Sugar (FBS & HbA1c)
    const fbs = getLatestLab(['Fasting Blood Sugar', 'FBS', 'Glucose'], ['average', 'eag', 'urine']);
    if (fbs) {
      const val = fbs.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 100) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับน้ำตาลในเลือดปกติ รักษาสุขภาพต่อไป';
      } else if (val >= 100 && val <= 125) {
        status = 'เสี่ยงเบาหวาน (Prediabetes)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดของหวาน แป้งขัดขาว และออกกำลังกายสม่ำเสมอ';
      } else {
        status = 'เบาหวาน (Diabetes)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ระดับน้ำตาลสูง ควรพบแพทย์เพื่อรับการรักษาและควบคุมอาหารเคร่งครัด';
      }

      results.push({
        category: 'น้ำตาลในเลือด (FBS)',
        date: fbs.Date,
        value: val,
        unit: fbs.Unit || 'mg/dL',
        status,
        color,
        icon: Droplets,
        advice
      });
    }

    const hba1c = getLatestLab(['HbA1c', 'Hemoglobin A1c'], ['average', 'eag']);
    if (hba1c) {
      let val = hba1c.parsedValue;
      
      // Handle IFCC (mmol/mol) to NGSP (%) conversion if value is high
      // 5.3% NGSP is ~34 mmol/mol IFCC. If > 20, it's likely IFCC.
      if (val > 20) {
        val = parseFloat(((0.09148 * val) + 2.152).toFixed(1));
      }

      let status = '';
      let color = '';
      let advice = '';

      if (val < 5.7) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'การควบคุมน้ำตาลสะสมอยู่ในเกณฑ์ดี';
      } else if (val >= 5.7 && val <= 6.4) {
        status = 'เสี่ยงเบาหวาน (Prediabetes)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'มีความเสี่ยงเบาหวาน ควรปรับเปลี่ยนพฤติกรรมการกิน';
      } else {
        status = 'เบาหวาน (Diabetes)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ควรพบแพทย์เพื่อปรับยาและควบคุมอาหาร';
      }

      results.push({
        category: 'น้ำตาลสะสม (HbA1c)',
        date: hba1c.Date,
        value: val,
        unit: '%',
        status,
        color,
        icon: Droplets,
        advice
      });
    }

    // 3. Lipid Profile
    const ldl = getLatestLab(['LDL', 'Low Density Lipoprotein'], ['ratio']);
    if (ldl) {
      const val = ldl.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 100) {
        status = 'ดีมาก (Optimal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ไขมันเลวอยู่ในระดับดีมาก';
      } else if (val >= 100 && val <= 129) {
        status = 'ดี (Near Optimal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ไขมันเลวอยู่ในระดับที่ยอมรับได้';
      } else if (val >= 130 && val <= 159) {
        status = 'ค่อนข้างสูง (Borderline High)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดอาหารมัน ของทอด และเนื้อสัตว์ติดมัน';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงโรคหลอดเลือดหัวใจ ควรพบแพทย์และควบคุมอาหาร';
      }

      results.push({
        category: 'ไขมันเลว (LDL)',
        date: ldl.Date,
        value: val,
        unit: ldl.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    const hdl = getLatestLab(['HDL', 'High Density Lipoprotein'], ['ratio']);
    if (hdl) {
      const val = hdl.parsedValue;
      // Default to male threshold if gender not specified, but adjust if female
      const threshold = isFemale ? 50 : 40;
      
      let status = '';
      let color = '';
      let advice = '';

      if (val < threshold) {
        status = 'ต่ำ (Low - Risk)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ไขมันดีต่ำ ควรออกกำลังกายแบบคาร์ดิโอเพิ่มขึ้น และทานไขมันดี (เช่น ปลาทะเล ถั่ว)';
      } else if (val >= 60) {
        status = 'สูง (High - Protective)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ไขมันดีอยู่ในระดับที่ช่วยป้องกันโรคหัวใจได้ดีมาก';
      } else {
        status = 'ปกติ (Normal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ไขมันดีอยู่ในระดับปกติ';
      }

      results.push({
        category: 'ไขมันดี (HDL)',
        date: hdl.Date,
        value: val,
        unit: hdl.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    const tg = getLatestLab(['Triglyceride', 'TG'], ['ratio']);
    if (tg) {
      const val = tg.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 150) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับไตรกลีเซอไรด์ปกติ';
      } else if (val >= 150 && val <= 199) {
        status = 'ค่อนข้างสูง (Borderline High)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดแป้ง น้ำตาล และแอลกอฮอล์';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงตับอ่อนอักเสบและโรคหัวใจ ควรลดแป้ง น้ำตาล แอลกอฮอล์อย่างจริงจัง';
      }

      results.push({
        category: 'ไตรกลีเซอไรด์ (Triglyceride)',
        date: tg.Date,
        value: val,
        unit: tg.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    // Lipid Ratios
    const tc = getLatestLab(['Total Cholesterol', 'Cholesterol', 'TC'], ['hdl', 'ldl', 'ratio']);
    if (tc && hdl) {
      const tcVal = tc.parsedValue;
      const hdlVal = hdl.parsedValue;
      const ratio = tcVal / hdlVal;
      
      let status = '';
      let color = '';
      let advice = '';

      if (ratio < 3.5) {
        status = 'ดีมาก (Optimal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ความเสี่ยงโรคหัวใจต่ำมาก';
      } else if (ratio < 5) {
        status = 'ปกติ (Normal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ความเสี่ยงโรคหัวใจอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'เสี่ยงสูง (High Risk)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ความเสี่ยงโรคหัวใจสูง ควรปรับเปลี่ยนพฤติกรรมและพบแพทย์';
      }

      results.push({
        category: 'อัตราส่วน TC/HDL',
        date: tc.Date,
        value: ratio.toFixed(1),
        unit: '',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    if (ldl && hdl) {
      const ldlVal = ldl.parsedValue;
      const hdlVal = hdl.parsedValue;
      const ratio = ldlVal / hdlVal;
      
      let status = '';
      let color = '';
      let advice = '';

      if (ratio < 2.5) {
        status = 'ดีมาก (Optimal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ความเสี่ยงหลอดเลือดอุดตันต่ำมาก';
      } else if (ratio < 3.3) {
        status = 'ปกติ (Normal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ความเสี่ยงหลอดเลือดอุดตันอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'เสี่ยงสูง (High Risk)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ความเสี่ยงหลอดเลือดอุดตันสูง ควรควบคุมไขมันเลวและเพิ่มไขมันดี';
      }

      results.push({
        category: 'อัตราส่วน LDL/HDL',
        date: ldl.Date,
        value: ratio.toFixed(1),
        unit: '',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    if (tg && hdl) {
      const tgVal = tg.parsedValue;
      const hdlVal = hdl.parsedValue;
      const ratio = tgVal / hdlVal;
      
      let status = '';
      let color = '';
      let advice = '';

      if (ratio < 2) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ไม่มีภาวะดื้ออินซูลิน';
      } else if (ratio >= 2 && ratio < 3) {
        status = 'เริ่มเสี่ยง (Borderline)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'เริ่มมีภาวะดื้ออินซูลิน ควรลดแป้งและน้ำตาล';
      } else {
        status = 'ดื้ออินซูลิน (Insulin Resistance)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีภาวะดื้ออินซูลินสูง เสี่ยงต่อเบาหวานและโรคหัวใจ ควรลดแป้ง น้ำตาล และลดน้ำหนัก';
      }

      results.push({
        category: 'อัตราส่วน TG/HDL',
        date: tg.Date,
        value: ratio.toFixed(1),
        unit: '',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    // Inflammation Markers
    const crp = getLatestLab(['hs-CRP', 'hsCRP', 'C-Reactive Protein']);
    if (crp) {
      const val = crp.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 1.0) {
        status = 'ความเสี่ยงต่ำ (Low Risk)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับการอักเสบในร่างกายต่ำ ความเสี่ยงโรคหัวใจต่ำ';
      } else if (val >= 1.0 && val <= 3.0) {
        status = 'ความเสี่ยงปานกลาง (Average Risk)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'มีระดับการอักเสบปานกลาง ควรดูแลสุขภาพและออกกำลังกาย';
      } else {
        status = 'ความเสี่ยงสูง (High Risk)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีระดับการอักเสบสูง ความเสี่ยงโรคหัวใจสูง ควรพบแพทย์เพื่อหาสาเหตุ';
      }

      results.push({
        category: 'การอักเสบ (hs-CRP)',
        date: crp.Date,
        value: val,
        unit: crp.Unit || 'mg/L',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const esr = getLatestLab(['ESR', 'Erythrocyte Sedimentation Rate']);
    if (esr) {
      const val = esr.parsedValue;
      const threshold = isFemale ? 20 : 15;
      
      let status = '';
      let color = '';
      let advice = '';

      if (val <= threshold) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับการอักเสบในร่างกายปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีภาวะอักเสบซ่อนเร้นในร่างกาย ควรพบแพทย์เพื่อหาสาเหตุ';
      }

      results.push({
        category: 'การอักเสบ (ESR)',
        date: esr.Date,
        value: val,
        unit: esr.Unit || 'mm/hr',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // Tumor Markers
    const cea = getLatestLab(['CEA', 'Carcinoembryonic']);
    if (cea) {
      const val = cea.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 5.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งลำไส้อยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากการสูบบุหรี่ ลำไส้อักเสบ หรือมีความเสี่ยงมะเร็ง ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งลำไส้ (CEA)',
        date: cea.Date,
        value: val,
        unit: cea.Unit || 'ng/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const afp = getLatestLab(['AFP', 'Alpha-fetoprotein', 'Alpha fetoprotein']);
    if (afp) {
      const val = afp.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 10.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งตับอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากตับอักเสบ ตับแข็ง หรือมีความเสี่ยงมะเร็งตับ ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งตับ (AFP)',
        date: afp.Date,
        value: val,
        unit: afp.Unit || 'ng/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const psa = getLatestLab(['PSA', 'Prostate Specific Antigen']);
    if (psa && isMale) {
      const val = psa.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 4.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งต่อมลูกหมากอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากต่อมลูกหมากโต อักเสบ หรือมีความเสี่ยงมะเร็ง ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งต่อมลูกหมาก (PSA)',
        date: psa.Date,
        value: val,
        unit: psa.Unit || 'ng/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const ca125 = getLatestLab(['CA 125', 'CA125']);
    if (ca125 && isFemale) {
      const val = ca125.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 35.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งรังไข่อยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากซีสต์ เยื่อบุโพรงมดลูกเจริญผิดที่ หรือมีความเสี่ยงมะเร็ง ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งรังไข่ (CA 125)',
        date: ca125.Date,
        value: val,
        unit: ca125.Unit || 'U/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const ca153 = getLatestLab(['CA 15-3', 'CA15-3', 'CA153']);
    if (ca153 && isFemale) {
      const val = ca153.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 30.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งเต้านมอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากเนื้องอกชนิดไม่ร้ายแรง หรือมีความเสี่ยงมะเร็ง ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งเต้านม (CA 15-3)',
        date: ca153.Date,
        value: val,
        unit: ca153.Unit || 'U/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const ca199 = getLatestLab(['CA 19-9', 'CA19-9', 'CA199']);
    if (ca199) {
      const val = ca199.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 37.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าสารบ่งชี้มะเร็งตับอ่อน/ทางเดินอาหารอยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าสูงกว่าปกติ อาจเกิดจากนิ่วในถุงน้ำดี ตับอ่อนอักเสบ หรือมีความเสี่ยงมะเร็ง ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'สารบ่งชี้มะเร็งตับอ่อน (CA 19-9)',
        date: ca199.Date,
        value: val,
        unit: ca199.Unit || 'U/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // 4. Hydration & Protein (BUN/Creatinine)
    const bun = getLatestLab(['BUN', 'Blood Urea Nitrogen'], ['ratio']);
    const cr = getLatestLab(['Creatinine', 'Cr'], ['ratio', 'clearance']);
    
    if (bun && cr) {
      const bunVal = bun.parsedValue;
      const crVal = cr.parsedValue;
      const ratio = bunVal / crVal;
      
      let status = '';
      let color = '';
      let advice = '';

      if (ratio > 20) {
        status = 'ภาวะขาดน้ำ (Dehydration) / โปรตีนสูง';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'สัดส่วน BUN/Cr สูง บ่งชี้ว่าคุณอาจดื่มน้ำน้อยเกินไป หรือทานโปรตีนมากเกินไป ควรดื่มน้ำให้เพียงพอ (8-10 แก้ว/วัน)';
      } else if (ratio >= 10 && ratio <= 20) {
        status = 'ปกติ (Normal Hydration)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ภาวะน้ำในร่างกายและการทำงานของไตอยู่ในเกณฑ์ดี';
      } else {
        status = 'ต่ำกว่าเกณฑ์ (Low Ratio)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'อาจเกิดจากการทานโปรตีนน้อยเกินไป หรือมวลกล้ามเนื้อน้อย';
      }

      results.push({
        category: 'ภาวะขาดน้ำ/โปรตีน (BUN/Cr Ratio)',
        date: cr.Date,
        value: ratio.toFixed(1),
        unit: '',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // 5. Kidney Function (eGFR - CKD-EPI 2021)
    if (cr && age !== null && (isMale || isFemale)) {
      const crVal = cr.parsedValue;
      let egfr = 0;
      
      if (isFemale) {
        if (crVal <= 0.7) {
          egfr = 142 * Math.pow(crVal / 0.7, -0.241) * Math.pow(0.9938, age) * 1.012;
        } else {
          egfr = 142 * Math.pow(crVal / 0.7, -1.200) * Math.pow(0.9938, age) * 1.012;
        }
      } else {
        if (crVal <= 0.9) {
          egfr = 142 * Math.pow(crVal / 0.9, -0.302) * Math.pow(0.9938, age);
        } else {
          egfr = 142 * Math.pow(crVal / 0.9, -1.200) * Math.pow(0.9938, age);
        }
      }

      let status = '';
      let color = '';
      let advice = '';

      if (egfr >= 90) {
        status = 'ปกติ (Stage 1)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'การทำงานของไตปกติ (อ้างอิงตามอายุและเพศของคุณ)';
      } else if (egfr >= 60) {
        status = 'ไตเสื่อมระยะเริ่มต้น (Stage 2)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'การทำงานของไตลดลงเล็กน้อย ควรดื่มน้ำให้เพียงพอและหลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs';
      } else if (egfr >= 45) {
        status = 'ไตเสื่อมระยะปานกลาง (Stage 3a)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรปรึกษาแพทย์เพื่อชะลอความเสื่อมของไต ควบคุมความดันและน้ำตาลให้ดี';
      } else if (egfr >= 30) {
        status = 'ไตเสื่อมระยะปานกลางถึงมาก (Stage 3b)';
        color = 'text-orange-600 bg-orange-50 border-orange-200';
        advice = 'ควรพบแพทย์เฉพาะทางโรคไต และควบคุมอาหารอย่างเคร่งครัด';
      } else if (egfr >= 15) {
        status = 'ไตเสื่อมระยะรุนแรง (Stage 4)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ไตทำงานได้น้อยมาก ต้องอยู่ในการดูแลของแพทย์อย่างใกล้ชิด';
      } else {
        status = 'ไตวายระยะสุดท้าย (Stage 5)';
        color = 'text-red-700 bg-red-50 border-red-200';
        advice = 'จำเป็นต้องได้รับการบำบัดทดแทนไต (ฟอกเลือด/ล้างไต)';
      }

      results.push({
        category: 'การทำงานของไต (eGFR)',
        date: cr.Date,
        value: egfr.toFixed(1),
        unit: 'mL/min/1.73m²',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // 6. Thyroid Function (TSH)
    const tsh = getLatestLab(['TSH', 'Thyroid Stimulating Hormone']);
    if (tsh) {
      const val = tsh.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 0.4) {
        status = 'ต่ำกว่าเกณฑ์ (Hyperthyroidism Risk)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า TSH ต่ำ บ่งชี้ว่าต่อมไทรอยด์อาจทำงานมากเกินไป (ไทรอยด์เป็นพิษ) อาจมีอาการใจสั่น น้ำหนักลด ควรพบแพทย์';
      } else if (val >= 0.4 && val <= 4.0) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'การทำงานของต่อมไทรอยด์อยู่ในเกณฑ์ปกติ';
      } else if (val > 4.0 && val <= 10.0) {
        status = 'ค่อนข้างสูง (Subclinical Hypothyroidism)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ค่า TSH เริ่มสูง บ่งชี้ว่าต่อมไทรอยด์อาจทำงานลดลงเล็กน้อย ควรติดตามอาการและตรวจซ้ำตามแพทย์นัด';
      } else {
        status = 'สูง (Hypothyroidism)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า TSH สูง บ่งชี้ภาวะไทรอยด์ทำงานต่ำ อาจมีอาการอ่อนเพลีย น้ำหนักขึ้นง่าย ท้องผูก ควรพบแพทย์เพื่อรับการรักษา';
      }

      results.push({
        category: 'การทำงานของไทรอยด์ (TSH)',
        date: tsh.Date,
        value: val,
        unit: tsh.Unit || 'mIU/L',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const ft3 = getLatestLab(['Free T3', 'FT3'], ['total']);
    if (ft3) {
      const val = ft3.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 2.0) {
        status = 'ต่ำ (Low)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า Free T3 ต่ำ อาจสัมพันธ์กับภาวะไทรอยด์ทำงานต่ำ ควรปรึกษาแพทย์';
      } else if (val >= 2.0 && val <= 4.4) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่า Free T3 อยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า Free T3 สูง อาจสัมพันธ์กับภาวะไทรอยด์เป็นพิษ ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'ฮอร์โมนไทรอยด์ (Free T3)',
        date: ft3.Date,
        value: val,
        unit: ft3.Unit || 'pg/mL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const ft4 = getLatestLab(['Free T4', 'FT4'], ['total']);
    if (ft4) {
      const val = ft4.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val < 0.9) {
        status = 'ต่ำ (Low)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า Free T4 ต่ำ อาจสัมพันธ์กับภาวะไทรอยด์ทำงานต่ำ ควรปรึกษาแพทย์';
      } else if (val >= 0.9 && val <= 1.7) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่า Free T4 อยู่ในเกณฑ์ปกติ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า Free T4 สูง อาจสัมพันธ์กับภาวะไทรอยด์เป็นพิษ ควรปรึกษาแพทย์';
      }

      results.push({
        category: 'ฮอร์โมนไทรอยด์ (Free T4)',
        date: ft4.Date,
        value: val,
        unit: ft4.Unit || 'ng/dL',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // 7. Liver Function
    const ast = getLatestLab(['AST', 'SGOT', 'Aspartate Aminotransferase'], ['ratio']);
    if (ast) {
      const val = ast.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 40) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าเอนไซม์ตับ AST อยู่ในเกณฑ์ปกติ';
      } else if (val <= 80) {
        status = 'สูงเล็กน้อย (Mildly Elevated)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ค่าเอนไซม์ตับสูงเล็กน้อย อาจเกิดจากการดื่มแอลกอฮอล์ การใช้ยาบางชนิด หรือภาวะไขมันพอกตับ';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่าเอนไซม์ตับสูงกว่าปกติ บ่งชี้ว่าอาจมีการอักเสบหรือความเสียหายของเซลล์ตับ ควรพบแพทย์เพื่อตรวจเพิ่มเติม';
      }

      results.push({
        category: 'การทำงานของตับ (AST)',
        date: ast.Date,
        value: val,
        unit: ast.Unit || 'U/L',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const alt = getLatestLab(['ALT', 'SGPT', 'Alanine Aminotransferase'], ['ratio']);
    if (alt) {
      const val = alt.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val <= 40) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่าเอนไซม์ตับ ALT อยู่ในเกณฑ์ปกติ';
      } else if (val <= 80) {
        status = 'สูงเล็กน้อย (Mildly Elevated)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ค่า ALT สูงเล็กน้อย มักสัมพันธ์กับภาวะไขมันพอกตับ หรือตับอักเสบระยะแรก';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า ALT สูง บ่งชี้ภาวะตับอักเสบที่ชัดเจน ควรพบแพทย์เพื่อหาสาเหตุ';
      }

      results.push({
        category: 'การทำงานของตับ (ALT)',
        date: alt.Date,
        value: val,
        unit: alt.Unit || 'U/L',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const alp = getLatestLab(['ALP', 'Alkaline Phosphatase'], ['isoenzyme']);
    if (alp) {
      const val = alp.parsedValue;
      let status = '';
      let color = '';
      let advice = '';

      if (val >= 40 && val <= 130) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ค่า ALP อยู่ในเกณฑ์ปกติ';
      } else if (val > 130) {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ค่า ALP สูง อาจเกิดจากปัญหาท่อน้ำดีอุดตัน หรือปัญหาเกี่ยวกับกระดูก ควรปรึกษาแพทย์';
      } else {
        status = 'ต่ำ (Low)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ค่า ALP ต่ำกว่าปกติ อาจเกิดจากการขาดสารอาหารบางชนิด';
      }

      results.push({
        category: 'การทำงานของตับ/กระดูก (ALP)',
        date: alp.Date,
        value: val,
        unit: alp.Unit || 'U/L',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    const criteriaMap: Record<string, string[]> = {
      'ดัชนีมวลกาย (BMI)': [
        '< 18.5 : น้ำหนักน้อย (Underweight)',
        '18.5 - 22.9 : ปกติ (Normal)',
        '23.0 - 24.9 : น้ำหนักเกิน (Overweight)',
        '25.0 - 29.9 : อ้วนระดับ 1 (Obese Class I)',
        '>= 30.0 : อ้วนระดับ 2 (Obese Class II)'
      ],
      'น้ำตาลในเลือด (FBS)': [
        '< 100 : ปกติ (Normal)',
        '100 - 125 : เสี่ยงเบาหวาน (Prediabetes)',
        '>= 126 : เบาหวาน (Diabetes)'
      ],
      'น้ำตาลสะสม (HbA1c)': [
        '< 5.7 : ปกติ (Normal)',
        '5.7 - 6.4 : เสี่ยงเบาหวาน (Prediabetes)',
        '>= 6.5 : เบาหวาน (Diabetes)'
      ],
      'ไขมันเลว (LDL)': [
        '< 100 : ดีมาก (Optimal)',
        '100 - 129 : ดี (Near Optimal)',
        '130 - 159 : ค่อนข้างสูง (Borderline High)',
        '>= 160 : สูง (High)'
      ],
      'ไขมันดี (HDL)': [
        isFemale ? '< 50 : ต่ำ (Low)' : '< 40 : ต่ำ (Low)',
        isFemale ? '>= 50 : ปกติ (Normal)' : '>= 40 : ปกติ (Normal)',
        '>= 60 : ดีมาก (Optimal)'
      ],
      'ไตรกลีเซอไรด์ (Triglyceride)': [
        '< 150 : ปกติ (Normal)',
        '150 - 199 : ค่อนข้างสูง (Borderline High)',
        '>= 200 : สูง (High)'
      ],
      'อัตราส่วน TC/HDL': [
        '< 3.5 : ดีมาก (Optimal)',
        '3.5 - 4.9 : ปกติ (Normal)',
        '>= 5.0 : เสี่ยงสูง (High Risk)'
      ],
      'อัตราส่วน LDL/HDL': [
        '< 2.5 : ดีมาก (Optimal)',
        '2.5 - 3.2 : ปกติ (Normal)',
        '>= 3.3 : เสี่ยงสูง (High Risk)'
      ],
      'อัตราส่วน TG/HDL': [
        '< 2.0 : ปกติ (Normal)',
        '2.0 - 2.9 : เริ่มเสี่ยง (Borderline)',
        '>= 3.0 : ดื้ออินซูลิน (Insulin Resistance)'
      ],
      'การอักเสบ (hs-CRP)': [
        '< 1.0 : ความเสี่ยงต่ำ (Low Risk)',
        '1.0 - 3.0 : ความเสี่ยงปานกลาง (Average Risk)',
        '> 3.0 : ความเสี่ยงสูง (High Risk)'
      ],
      'การอักเสบ (ESR)': [
        isFemale ? '<= 20 : ปกติ (Normal)' : '<= 15 : ปกติ (Normal)',
        isFemale ? '> 20 : สูง (High)' : '> 15 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งลำไส้ (CEA)': [
        '<= 5.0 : ปกติ (Normal)',
        '> 5.0 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งตับ (AFP)': [
        '<= 10.0 : ปกติ (Normal)',
        '> 10.0 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งต่อมลูกหมาก (PSA)': [
        '<= 4.0 : ปกติ (Normal)',
        '> 4.0 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งรังไข่ (CA 125)': [
        '<= 35.0 : ปกติ (Normal)',
        '> 35.0 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งเต้านม (CA 15-3)': [
        '<= 30.0 : ปกติ (Normal)',
        '> 30.0 : สูง (High)'
      ],
      'สารบ่งชี้มะเร็งตับอ่อน (CA 19-9)': [
        '<= 37.0 : ปกติ (Normal)',
        '> 37.0 : สูง (High)'
      ],
      'ภาวะขาดน้ำ/โปรตีน (BUN/Cr Ratio)': [
        '< 10 : ต่ำกว่าเกณฑ์ (Low Ratio)',
        '10 - 20 : ปกติ (Normal Hydration)',
        '> 20 : ภาวะขาดน้ำ (Dehydration) / โปรตีนสูง'
      ],
      'การทำงานของไต (eGFR)': [
        '>= 90 : ปกติ (Stage 1)',
        '60 - 89 : ไตเสื่อมระยะเริ่มต้น (Stage 2)',
        '45 - 59 : ไตเสื่อมระยะปานกลาง (Stage 3a)',
        '30 - 44 : ไตเสื่อมระยะปานกลางถึงมาก (Stage 3b)',
        '15 - 29 : ไตเสื่อมระยะรุนแรง (Stage 4)',
        '< 15 : ไตวายระยะสุดท้าย (Stage 5)'
      ],
      'การทำงานของไทรอยด์ (TSH)': [
        '< 0.4 : ต่ำกว่าเกณฑ์ (Hyperthyroidism Risk)',
        '0.4 - 4.0 : ปกติ (Normal)',
        '4.1 - 10.0 : ค่อนข้างสูง (Subclinical Hypothyroidism)',
        '> 10.0 : สูง (Hypothyroidism)'
      ],
      'ฮอร์โมนไทรอยด์ (Free T3)': [
        '< 2.0 : ต่ำ (Low)',
        '2.0 - 4.4 : ปกติ (Normal)',
        '> 4.4 : สูง (High)'
      ],
      'ฮอร์โมนไทรอยด์ (Free T4)': [
        '< 0.9 : ต่ำ (Low)',
        '0.9 - 1.7 : ปกติ (Normal)',
        '> 1.7 : สูง (High)'
      ],
      'การทำงานของตับ (AST)': [
        '<= 40 : ปกติ (Normal)',
        '41 - 80 : สูงเล็กน้อย (Mildly Elevated)',
        '> 80 : สูง (High)'
      ],
      'การทำงานของตับ (ALT)': [
        '<= 40 : ปกติ (Normal)',
        '41 - 80 : สูงเล็กน้อย (Mildly Elevated)',
        '> 80 : สูง (High)'
      ],
      'การทำงานของตับ/กระดูก (ALP)': [
        '40 - 130 : ปกติ (Normal)',
        '> 130 : สูง (High)',
        '< 40 : ต่ำ (Low)'
      ]
    };

    return results.map(r => ({
      ...r,
      criteria: criteriaMap[r.category] || []
    }));
  }, [vitals, labs, profile]);

  if (analysis.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-900">Health Analysis & Insights</h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className={clsx("p-5 rounded-2xl border flex flex-col", item.color)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/60 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.category}</h3>
                    {item.date && <p className="text-xs font-medium opacity-70 mt-0.5">ข้อมูลเมื่อ: {item.date}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                  {item.unit && <span className="text-sm font-medium ml-1 opacity-70">{item.unit}</span>}
                </div>
              </div>
              
              <div className="space-y-2 mb-4 flex-grow">
                <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-white/60 shadow-sm">
                  {item.status}
                </div>
                <p className="text-sm font-medium opacity-90 leading-relaxed">
                  {item.advice}
                </p>
              </div>

              {item.criteria && item.criteria.length > 0 && (
                <div className="mt-auto pt-4 border-t border-black/5">
                  <p className="text-xs font-semibold opacity-70 mb-2">เกณฑ์การประเมิน:</p>
                  <ul className="space-y-1">
                    {item.criteria.map((c: string, i: number) => (
                      <li key={i} className="text-[11px] font-medium opacity-80 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-current mt-1.5 opacity-50 shrink-0"></span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
