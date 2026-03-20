import React, { useState } from 'react';
import { HeartHandshake, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { GarbhawotiRecord } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';

interface GarbhawotiSewaProps {
  records: GarbhawotiRecord[];
  onSaveRecord: (record: GarbhawotiRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
}

const initialFormData: Omit<GarbhawotiRecord, 'id' | 'fiscalYear'> = {
  name: '',
  husbandName: '',
  address: '',
  age: 0,
  lmp: '',
  edd: '',
  gravida: 1,
  ancDate: '',
  weight: 0,
  bp: '',
  hb: '',
  ironTablets: 0,
  ttDose: '',
};

export const GarbhawotiSewa: React.FC<GarbhawotiSewaProps> = ({ records = [], onSaveRecord, onDeleteRecord, currentFiscalYear }) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleAddNew = () => {
    setIsEditing(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleEdit = (record: GarbhawotiRecord) => {
    setIsEditing(record.id);
    setFormData(record);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordToSave: GarbhawotiRecord = {
      ...formData,
      id: isEditing || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };
    onSaveRecord(recordToSave);
    handleCloseForm();
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('के तपाईं यो रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) {
      onDeleteRecord(id);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <HeartHandshake size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">गर्भवती सेवा</h2>
            <p className="text-sm text-slate-500">Pregnancy Service Records</p>
          </div>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700">
          <Plus size={18} /> नयाँ रेकर्ड थप्नुहोस्
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                    <th className="p-3">नाम</th>
                    <th className="p-3">श्रीमानको नाम</th>
                    <th className="p-3">ठेगाना</th>
                    <th className="p-3">उमेर</th>
                    <th className="p-3">LMP</th>
                    <th className="p-3">EDD</th>
                    <th className="p-3">Gravida</th>
                    <th className="p-3 text-right">कार्य</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(records || []).filter(r => r.fiscalYear === currentFiscalYear).map(record => (
                    <tr key={record.id}>
                        <td className="p-3 font-medium">{record.name}</td>
                        <td className="p-3">{record.husbandName}</td>
                        <td className="p-3">{record.address}</td>
                        <td className="p-3">{record.age}</td>
                        <td className="p-3">{record.lmp}</td>
                        <td className="p-3">{record.edd}</td>
                        <td className="p-3">{record.gravida}</td>
                        <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                {records.filter(r => r.fiscalYear === currentFiscalYear).length === 0 && (
                    <tr>
                        <td colSpan={8} className="text-center p-8 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-800 font-nepali">{isEditing ? 'रेकर्ड सम्पादन गर्नुहोस्' : 'नयाँ गर्भवती रेकर्ड'}</h3>
                <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="नाम" name="name" value={formData.name} onChange={handleChange} required />
                    <Input label="श्रीमानको नाम" name="husbandName" value={formData.husbandName} onChange={handleChange} required />
                    <Input label="ठेगाना" name="address" value={formData.address} onChange={handleChange} required />
                    <Input label="उमेर" name="age" type="number" value={formData.age} onChange={handleChange} required />
                    
                    <NepaliDatePicker label="LMP (पछिल्लो महिनावारी)" value={formData.lmp} onChange={(val) => handleDateChange('lmp', val)} />
                    <NepaliDatePicker label="EDD (अनुमानित मिति)" value={formData.edd} onChange={(val) => handleDateChange('edd', val)} />
                    
                    <Input label="Gravida" name="gravida" type="number" value={formData.gravida} onChange={handleChange} required />
                    
                    <NepaliDatePicker label="ANC मिति" value={formData.ancDate} onChange={(val) => handleDateChange('ancDate', val)} />
                    
                    <Input label="तौल (kg)" name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} />
                    <Input label="रक्तचाप (BP)" name="bp" value={formData.bp} onChange={handleChange} />
                    <Input label="हेमोग्लोबिन (Hb)" name="hb" value={formData.hb} onChange={handleChange} />
                    <Input label="आइरन चक्की" name="ironTablets" type="number" value={formData.ironTablets} onChange={handleChange} />
                    <Input label="टी.टी. डोज" name="ttDose" value={formData.ttDose} onChange={handleChange} />
                    
                    <div className="md:col-span-3 flex justify-end gap-4 pt-6 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
                        <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">रद्द</button>
                        <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium shadow-sm hover:bg-primary-700">सुरक्षित गर्नुहोस्</button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
