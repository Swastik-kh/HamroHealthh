import React, { useState } from 'react';
import { UttarPrasutiRecord, PrasutiRecord } from '../types';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Input } from './Input';
import { 
  Activity, Scale, Thermometer, Baby, Droplets, Circle, User, Stethoscope, Calendar, UserCircle 
} from 'lucide-react';

interface UttarPrasutiSewaProps {
  currentFiscalYear: string;
  prasutiRecords: PrasutiRecord[];
  uttarPrasutiRecords: UttarPrasutiRecord[];
  onSave: (record: UttarPrasutiRecord) => void;
  onDelete: (id: string) => void;
}

export const UttarPrasutiSewa: React.FC<UttarPrasutiSewaProps> = ({ 
  currentFiscalYear, prasutiRecords, uttarPrasutiRecords, onSave, onDelete 
}) => {
  const [formData, setFormData] = useState<Omit<UttarPrasutiRecord, 'id'>>({
    fiscalYear: currentFiscalYear,
    prasutiId: '',
    name: '',
    visitDate: '',
    findings: '',
    remarks: '',
    motherBp: '',
    motherWeight: undefined,
    motherTemp: '',
    motherBreastfeeding: '',
    motherLochia: '',
    motherUterineInvolution: '',
    motherGeneralCondition: '',
    babyWeight: undefined,
    babyTemp: '',
    babyBreastfeeding: '',
    babyUmbilicalCord: '',
    babyGeneralCondition: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: Date.now().toString() });
    setFormData({
      fiscalYear: currentFiscalYear,
      prasutiId: '',
      name: '',
      visitDate: '',
      findings: '',
      remarks: '',
      motherBp: '',
      motherWeight: undefined,
      motherTemp: '',
      motherBreastfeeding: '',
      motherLochia: '',
      motherUterineInvolution: '',
      motherGeneralCondition: '',
      babyWeight: undefined,
      babyTemp: '',
      babyBreastfeeding: '',
      babyUmbilicalCord: '',
      babyGeneralCondition: ''
    });
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">उत्तर प्रसूति सेवा (Post-Natal Service)</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm font-medium">प्रसूति छान्नुहोस् (वैकल्पिक)</label>
          <select 
            value={formData.prasutiId || ''} 
            onChange={(e) => {
                const prasuti = prasutiRecords.find(p => p.id === e.target.value);
                setFormData({...formData, prasutiId: e.target.value || undefined, name: prasuti?.name || formData.name});
            }}
            className="w-full border p-2 rounded"
          >
            <option value="">छान्नुहोस्</option>
            {prasutiRecords.map(p => <option key={p.id} value={p.id}>{p.name} ({p.deliveryDate})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">नाम</label>
          <Input 
            icon={<UserCircle size={16} />}
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium">मिति</label>
          <NepaliDatePicker 
            value={formData.visitDate} 
            onChange={(value) => handleDateChange('visitDate', value)} 
            className="w-full border p-2 rounded" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 font-bold text-slate-700 mt-4">आमाको स्वास्थ्य रेकर्ड (Mother's Health Record)</div>
          <Input label="BP" icon={<Activity size={16} />} value={formData.motherBp || ''} onChange={(e) => setFormData({...formData, motherBp: e.target.value})} />
          <Input label="तौल (Weight)" icon={<Scale size={16} />} type="number" value={formData.motherWeight || ''} onChange={(e) => setFormData({...formData, motherWeight: parseFloat(e.target.value) || undefined})} />
          <Input label="तापक्रम (Temp)" icon={<Thermometer size={16} />} value={formData.motherTemp || ''} onChange={(e) => setFormData({...formData, motherTemp: e.target.value})} />
          <Input label="स्तनपान (Breastfeeding)" icon={<Baby size={16} />} value={formData.motherBreastfeeding || ''} onChange={(e) => setFormData({...formData, motherBreastfeeding: e.target.value})} />
          <Input label="लोचिया (Lochia)" icon={<Droplets size={16} />} value={formData.motherLochia || ''} onChange={(e) => setFormData({...formData, motherLochia: e.target.value})} />
          <Input label="Uterine Involution" icon={<Circle size={16} />} value={formData.motherUterineInvolution || ''} onChange={(e) => setFormData({...formData, motherUterineInvolution: e.target.value})} />
          <Input label="सामान्य स्थिति (General Condition)" icon={<User size={16} />} value={formData.motherGeneralCondition || ''} onChange={(e) => setFormData({...formData, motherGeneralCondition: e.target.value})} />
          
          <div className="col-span-2 font-bold text-slate-700 mt-4">शिशुको स्वास्थ्य रेकर्ड (Baby's Health Record)</div>
          <Input label="तौल (Weight)" icon={<Scale size={16} />} type="number" value={formData.babyWeight || ''} onChange={(e) => setFormData({...formData, babyWeight: parseFloat(e.target.value) || undefined})} />
          <Input label="तापक्रम (Temp)" icon={<Thermometer size={16} />} value={formData.babyTemp || ''} onChange={(e) => setFormData({...formData, babyTemp: e.target.value})} />
          <Input label="स्तनपान (Breastfeeding)" icon={<Baby size={16} />} value={formData.babyBreastfeeding || ''} onChange={(e) => setFormData({...formData, babyBreastfeeding: e.target.value})} />
          <Input label="नाल (Umbilical Cord)" icon={<Circle size={16} />} value={formData.babyUmbilicalCord || ''} onChange={(e) => setFormData({...formData, babyUmbilicalCord: e.target.value})} />
          <Input label="सामान्य स्थिति (General Condition)" icon={<User size={16} />} value={formData.babyGeneralCondition || ''} onChange={(e) => setFormData({...formData, babyGeneralCondition: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium">निष्कर्ष (Findings)</label>
          <textarea value={formData.findings} onChange={(e) => setFormData({...formData, findings: e.target.value})} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium">कैफियत (Remarks)</label>
          <textarea value={formData.remarks || ''} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full border p-2 rounded" />
        </div>
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">सेभ गर्नुहोस्</button>
      </form>
    </div>
  );
};
