
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, Printer, Save, ArrowLeft, CheckCircle2, Send, Clock, Eye, X } from 'lucide-react';
/* Added Signature to the imports to resolve type conflicts */
import { User, OrganizationSettings, Signature } from '../types/coreTypes';
import { InventoryItem, ReturnEntry, ReturnItem, IssueReportEntry } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiFirtaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;
  issueReports: IssueReportEntry[];
  generalSettings: OrganizationSettings;
}

export const JinshiFirtaFaram: React.FC<JinshiFirtaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  returnEntries,
  onSaveReturnEntry,
  issueReports,
  generalSettings
}) => {
  const [items, setItems] = useState<ReturnItem[]>([
    { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }
  ]);

  /* Explicitly type formDetails state to handle Signature properties being optional in the data source but inferred as required in local state */
  const [formDetails, setFormDetails] = useState<{
    id: string;
    fiscalYear: string;
    formNo: string;
    date: string;
    status: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
    returnedBy: Signature;
    approvedBy: Signature;
  }>({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: new NepaliDate().format('YYYY-MM-DD'),
    // Fix: Updated status type to include 'Verified' to match ReturnEntry status
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') },
    approvedBy: { name: '', designation: '', date: '' }
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ReturnEntry | null>(null);

  const isStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

  const handleAddItem = () => {
    if (items.length >= 14) return;
    setItems([...items, { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof ReturnItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.totalAmount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleInventorySelect = (id: number, option: any) => {
    const invItem = option.itemData as InventoryItem;
    if (invItem) {
      setItems(items.map(item => item.id === id ? {
        ...item,
        name: invItem.itemName,
        codeNo: invItem.uniqueCode || invItem.sanketNo || '',
        unit: invItem.unit,
        rate: invItem.rate || 0,
        inventoryId: invItem.id,
        itemType: invItem.itemType
      } : item));
    }
  };

  const handleSave = (status: 'Pending' | 'Approved' | 'Rejected') => {
    const entry: ReturnEntry = {
        ...formDetails,
        id: formDetails.id || Date.now().toString(),
        items,
        status,
        approvedBy: status === 'Approved' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : formDetails.approvedBy
    };
    onSaveReturnEntry(entry);
    alert(`जिन्सी फिर्ता ${status === 'Approved' ? 'स्वीकृत' : 'पेश'} भयो।`);
    handleReset();
  };

  const handleReset = () => {
      setFormDetails({
          id: '',
          fiscalYear: currentFiscalYear,
          formNo: (returnEntries.length + 1).toString(),
          date: new NepaliDate().format('YYYY-MM-DD'),
          status: 'Pending',
          returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') },
          approvedBy: { name: '', designation: '', date: '' }
      });
      setItems([{ id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }]);
      setIsViewOnly(false);
      setSelectedEntry(null);
  };

  const inventoryOptions = useMemo(() => inventoryItems.map(i => ({
      id: i.id, value: i.itemName, label: `${i.itemName} (${i.unit})`, itemData: i
  })), [inventoryItems]);

  const pendingEntries = returnEntries.filter(e => e.status === 'Pending');

  if (selectedEntry || isViewOnly) {
      // Logic to show form for editing/viewing
  }

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
            <h2 className="font-bold text-slate-700 font-nepali">जिन्सी फिर्ता फाराम (Return Form)</h2>
            <div className="flex gap-2">
                <button onClick={handleReset} className="bg-slate-100 p-2 rounded-lg"><RotateCcw size={18}/></button>
                <button onClick={() => handleSave('Pending')} className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"><Send size={18}/> पेश गर्नुहोस्</button>
                {isApprover && selectedEntry?.status === 'Pending' && (
                    <button onClick={() => handleSave('Approved')} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 size={18}/> स्वीकृत</button>
                )}
            </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm]">
            <div className="text-center mb-8">
                <h1 className="text-xl font-bold">{generalSettings.orgNameNepali}</h1>
                <h2 className="text-lg font-bold underline">जिन्सी फिर्ता फाराम</h2>
            </div>

            <div className="flex justify-between mb-4 text-sm">
                <p>फिर्ता गर्ने: <strong>{formDetails.returnedBy.name}</strong></p>
                <p>मिति: <strong>{formDetails.date}</strong></p>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-1">क्र.सं.</th>
                        <th className="border border-slate-900 p-1">सामानको नाम</th>
                        <th className="border border-slate-900 p-1">परिमाण</th>
                        <th className="border border-slate-900 p-1">कारण र अवस्था</th>
                        <th className="border border-slate-900 p-1 w-8 no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={item.id}>
                            <td className="border border-slate-900 p-1 text-center">{idx + 1}</td>
                            <td className="border border-slate-900 p-1">
                                <SearchableSelect options={inventoryOptions} value={item.name} onChange={val => updateItem(item.id, 'name', val)} onSelect={opt => handleInventorySelect(item.id, opt)} className="!border-none" />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full text-center outline-none" />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input value={item.reasonAndCondition} onChange={e => updateItem(item.id, 'reasonAndCondition', e.target.value)} className="w-full outline-none" />
                            </td>
                            <td className="border border-slate-900 p-1 text-center no-print">
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <button 
                onClick={handleAddItem} 
                disabled={items.length >= 14}
                className={`mt-2 text-xs font-bold no-print flex items-center gap-1 transition-colors ${items.length >= 14 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
            >
                <Plus size={14} /> + लहर थप्नुहोस् (अधिकतम १४)
            </button>

            <div className="grid grid-cols-2 gap-12 mt-20 text-sm">
                <div className="border-t border-slate-800 pt-2 text-center">फिर्ता गर्नेको दस्तखत</div>
                <div className="border-t border-slate-800 pt-2 text-center">बुझिलिनेको (Storekeeper) दस्तखत</div>
            </div>
        </div>

        {pendingEntries.length > 0 && isApprover && (
            <div className="bg-white p-6 rounded-xl border shadow-sm no-print">
                <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2"><Clock size={18}/> स्वीकृतिका लागि बाँकी फिर्ता फारामहरू</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingEntries.map(e => (
                        <div key={e.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50">
                            <div>
                                <p className="font-bold">फिर्ता गर्ने: {e.returnedBy.name}</p>
                                <p className="text-xs text-slate-500">मिति: {e.date} | सामान: {e.items.length}</p>
                            </div>
                            {/* Corrected: setFormDetails now handles Signature type correctly from the source object */}
                            <button onClick={() => { setSelectedEntry(e); setItems(e.items); setFormDetails({ id: e.id, fiscalYear: e.fiscalYear, formNo: e.formNo, date: e.date, status: e.status, returnedBy: e.returnedBy, approvedBy: e.approvedBy }); }} className="text-primary-600 font-bold text-xs hover:underline">Review</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
