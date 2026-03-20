import React, { useState } from 'react';
import { Baby, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { PrasutiRecord, GarbhawotiRecord } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';

interface PrasutiSewaProps {
  garbhawotiRecords: GarbhawotiRecord[];
  prasutiRecords: PrasutiRecord[];
  onSaveRecord: (record: PrasutiRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
}

const initialFormData: Omit<PrasutiRecord, 'id' | 'fiscalYear'> = {
  garbhawotiId: '',
  name: '',
  deliveryDate: '',
  deliveryPlace: '',
  deliveredBy: '',
  deliveryOutcome: 'Live birth',
  newbornGender: 'Male',
  newbornWeight: 0,
  complications: '',
};

export const PrasutiSewa: React.FC<PrasutiSewaProps> = ({ garbhawotiRecords = [], prasutiRecords = [], onSaveRecord, onDeleteRecord, currentFiscalYear }) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleAddNew = () => {
    setIsEditing(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleEdit = (record: PrasutiRecord) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'garbhawotiId') {
      if (value === 'other') {
        setFormData(prev => ({ ...prev, garbhawotiId: 'other', name: '' }));
      } else {
        const selectedGarbhawoti = garbhawotiRecords.find(r => r.id === value);
        setFormData(prev => ({ ...prev, garbhawotiId: value, name: selectedGarbhawoti?.name || '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) || 0 : value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordToSave: PrasutiRecord = {
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
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
            <Baby size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रसूति सेवा</h2>
            <p className="text-sm text-slate-500">Delivery Service Records</p>
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
                    <th className="p-3">प्रसूति मिति</th>
                    <th className="p-3">प्रसूति स्थान</th>
                    <th className="p-3">नतिजा</th>
                    <th className="p-3">शिशुको लिङ्ग</th>
                    <th className="p-3">तौल (kg)</th>
                    <th className="p-3 text-right">कार्य</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(prasutiRecords || []).filter(r => r.fiscalYear === currentFiscalYear).map(record => (
                    <tr key={record.id}>
                        <td className="p-3 font-medium">{record.name}</td>
                        <td className="p-3">{record.deliveryDate}</td>
                        <td className="p-3">{record.deliveryPlace}</td>
                        <td className="p-3">{record.deliveryOutcome}</td>
                        <td className="p-3">{record.newbornGender}</td>
                        <td className="p-3">{record.newbornWeight}</td>
                        <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                 {prasutiRecords.filter(r => r.fiscalYear === currentFiscalYear).length === 0 && (
                    <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-800 font-nepali">{isEditing ? 'रेकर्ड सम्पादन गर्नुहोस्' : 'नयाँ प्रसूति रेकर्ड'}</h3>
                <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">गर्भवती महिला छान्नुहोस्</label>
                        <select name="garbhawotiId" value={formData.garbhawotiId} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                            <option value="">-- छान्नुहोस् --</option>
                            {(garbhawotiRecords || []).filter(g => g.fiscalYear === currentFiscalYear).map(g => (
                                <option key={g.id} value={g.id}>{g.name} ({g.address})</option>
                            ))}
                            <option value="other">अन्य (म्यानुअल नाम लेख्नुहोस्)</option>
                        </select>
                    </div>
                    
                    {formData.garbhawotiId === 'other' && (
                        <Input label="गर्भवती महिलाको नाम (Manual)" name="name" value={formData.name} onChange={handleChange} required />
                    )}
                    
                    {formData.garbhawotiId !== 'other' && formData.garbhawotiId !== '' && (
                        <Input label="नाम" name="name" value={formData.name} onChange={handleChange} disabled />
                    )}

                    <div className="md:col-span-1">
                        <NepaliDatePicker label="प्रसूति मिति" value={formData.deliveryDate} onChange={(val) => handleDateChange('deliveryDate', val)} />
                    </div>
                    
                    <Input label="प्रसूति स्थान" name="deliveryPlace" value={formData.deliveryPlace} onChange={handleChange} required />
                    <Input label="प्रसूति गराउने" name="deliveredBy" value={formData.deliveredBy} onChange={handleChange} />
                    
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">नतिजा</label>
                        <select name="deliveryOutcome" value={formData.deliveryOutcome} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                            <option value="Live birth">जीवित जन्म</option>
                            <option value="Stillbirth">मृत जन्म</option>
                        </select>
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">शिशुको लिङ्ग</label>
                        <select name="newbornGender" value={formData.newbornGender} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                            <option value="Male">पुरुष</option>
                            <option value="Female">महिला</option>
                            <option value="Other">अन्य</option>
                        </select>
                    </div>
                    
                    <Input label="शिशुको तौल (kg)" name="newbornWeight" type="number" step="0.01" value={formData.newbornWeight} onChange={handleChange} />
                    
                    <div className="md:col-span-3">
                        <Input label="जटिलताहरू" name="complications" value={formData.complications} onChange={handleChange} />
                    </div>
                    
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
