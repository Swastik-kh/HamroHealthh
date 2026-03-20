
import React, { useState, useMemo } from 'react';
import { 
  Search, Pill, User, Calendar, Clock, CheckCircle2, 
  AlertCircle, Printer, Save, Trash2, Warehouse,
  ChevronRight, ClipboardList, Info
} from 'lucide-react';
import { 
  ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, 
  DispensaryRecord, User as AppUser, OrganizationSettings 
} from '../types/coreTypes';
import { InventoryItem, Store } from '../types/inventoryTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface DispensarySewaProps {
  currentFiscalYear: string;
  currentUser: AppUser;
  generalSettings: OrganizationSettings;
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  dispensaryRecords: DispensaryRecord[];
  onSaveDispensaryRecord: (record: DispensaryRecord) => void;
  onDeleteDispensaryRecord: (id: string) => void;
  inventoryItems: InventoryItem[];
  stores: Store[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
}

export const DispensarySewa: React.FC<DispensarySewaProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  opdRecords = [],
  emergencyRecords = [],
  cbimnciRecords = [],
  dispensaryRecords = [],
  onSaveDispensaryRecord,
  onDeleteDispensaryRecord,
  inventoryItems = [],
  stores = [],
  onUpdateInventoryItem
}) => {
  const [searchId, setSearchId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ServiceSeekerRecord | null>(null);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dispenseItems, setDispenseItems] = useState<any[]>([]);

  // Update dispense items when store changes to find available batches
  React.useEffect(() => {
    if (selectedPatient && selectedStoreId) {
      setDispenseItems(prev => prev.map(item => {
        const invItems = inventoryItems.filter(i => 
          i.itemName.toLowerCase() === item.medicineName.toLowerCase() && 
          i.storeId === selectedStoreId && 
          i.currentQuantity > 0
        ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));
        
        const defaultBatch = invItems[0];
        return {
          ...item,
          inventoryId: defaultBatch?.id || '',
          batchNo: defaultBatch?.batchNo || '',
          expiryDate: defaultBatch?.expiryDateBs || '',
          unit: defaultBatch?.unit || item.unit
        };
      }));
    }
  }, [selectedStoreId, inventoryItems, selectedPatient]);

  const handleSearch = () => {
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      return idMatch || nameMatch || regMatch;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      alert('बिरामी फेला परेन।');
      setSelectedPatient(null);
      setSelectedPrescriptions([]);
      setDispenseItems([]);
    }
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    
    // Collect prescriptions from all sources
    const opdPres = opdRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => (r.prescriptions || []).map(p => ({ ...p, source: 'OPD', date: r.visitDate })));
    
    const emergencyPres = emergencyRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => [
        ...(r.emergencyPrescriptions || []).map(p => ({ ...p, source: 'Emergency (ER)', date: r.visitDate })),
        ...(r.dischargePrescriptions || []).map(p => ({ ...p, source: 'Emergency (Discharge)', date: r.visitDate }))
      ]);
    
    const cbimnciPres = cbimnciRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => (r.prescriptions || []).map(p => ({ ...p, source: 'CBIMNCI', date: r.visitDate })));
    
    const allPres = [...opdPres, ...emergencyPres, ...cbimnciPres].sort((a, b) => b.date.localeCompare(a.date));
    setSelectedPrescriptions(allPres);
    
    // Initialize dispense items from prescriptions
    setDispenseItems(allPres.map(p => {
      // Try to find the unit and default batch from inventory
      const invItems = inventoryItems.filter(i => 
        i.itemName.toLowerCase() === p.medicineName.toLowerCase() && 
        i.storeId === selectedStoreId && 
        i.currentQuantity > 0
      ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));
      
      const defaultBatch = invItems[0];
      const generalInvItem = inventoryItems.find(i => i.itemName.toLowerCase() === p.medicineName.toLowerCase());

      return {
        medicineName: p.medicineName,
        quantity: 1, // Default quantity
        unit: defaultBatch?.unit || generalInvItem?.unit || 'Pcs',
        inventoryId: defaultBatch?.id || '',
        batchNo: defaultBatch?.batchNo || '',
        expiryDate: defaultBatch?.expiryDateBs || '',
        dosage: p.dosage,
        instructions: p.instructions || '',
        dispensed: false
      };
    }));
  };

  const handleDispense = async () => {
    if (!selectedPatient || !selectedStoreId) {
      alert('कृपया बिरामी र गोदाम छान्नुहोस्।');
      return;
    }

    const itemsToDispense = dispenseItems.filter(item => item.dispensed);
    if (itemsToDispense.length === 0) {
      alert('कृपया डिस्पेंस गर्नको लागि कम्तिमा एउटा औषधि छान्नुहोस्।');
      return;
    }

    // Check stock for each item by aggregating quantities
    const aggregatedItems = itemsToDispense.reduce((acc, item) => {
      const name = item.medicineName.toLowerCase();
      if (!acc[name]) acc[name] = 0;
      acc[name] += Number(item.quantity);
      return acc;
    }, {} as Record<string, number>);

    for (const [name, totalQty] of Object.entries(aggregatedItems)) {
      const stock = inventoryItems
        .filter(i => i.itemName.toLowerCase() === name && i.storeId === selectedStoreId)
        .reduce((acc, i) => acc + i.currentQuantity, 0);
      
      if (stock < totalQty) {
        alert(`${name} को पर्याप्त मौज्दात छैन। (मौज्दात: ${stock})`);
        return;
      }
    }

    const newRecord: DispensaryRecord = {
      id: `DISP-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: selectedPatient.id,
      uniquePatientId: selectedPatient.uniquePatientId,
      patientName: selectedPatient.name,
      dispenseDate: new NepaliDate().format('YYYY-MM-DD'),
      storeId: selectedStoreId,
      items: itemsToDispense.map(i => ({
        medicineName: i.medicineName,
        quantity: Number(i.quantity),
        unit: i.unit,
        batchNo: i.batchNo,
        expiryDate: i.expiryDate,
        dosage: i.dosage,
        instructions: i.instructions
      })),
      remarks,
      createdBy: currentUser.fullName
    };

    // Update Inventory
    let localInventory = [...inventoryItems];

    itemsToDispense.forEach(dispItem => {
      let remainingToDeduct = Number(dispItem.quantity);
      
      // If a specific batch was selected, try to deduct from it first
      if (dispItem.inventoryId) {
        const stockItemIndex = localInventory.findIndex(i => i.id === dispItem.inventoryId);
        if (stockItemIndex !== -1) {
          const stockItem = localInventory[stockItemIndex];
          const deduct = Math.min(stockItem.currentQuantity, remainingToDeduct);
          
          const updatedItem = {
            ...stockItem,
            currentQuantity: stockItem.currentQuantity - deduct,
            lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
            lastUpdateDateAd: new Date().toISOString().split('T')[0]
          };
          
          localInventory[stockItemIndex] = updatedItem;
          onUpdateInventoryItem(updatedItem);
          
          remainingToDeduct -= deduct;
        }
      }

      // If still remaining, use FEFO logic for other batches of same medicine
      if (remainingToDeduct > 0) {
        const relevantStockIndices = localInventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => 
            item.itemName.toLowerCase() === dispItem.medicineName.toLowerCase() && 
            item.storeId === selectedStoreId &&
            item.id !== dispItem.inventoryId && // Skip the one we already deducted from
            item.currentQuantity > 0
          )
          .sort((a, b) => {
            if (!a.item.expiryDateAd) return 1;
            if (!b.item.expiryDateAd) return -1;
            return a.item.expiryDateAd.localeCompare(b.item.expiryDateAd);
          });

        for (const { item: stockItem, index: stockItemIndex } of relevantStockIndices) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(stockItem.currentQuantity, remainingToDeduct);
          
          const updatedItem = {
            ...stockItem,
            currentQuantity: stockItem.currentQuantity - deduct,
            lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
            lastUpdateDateAd: new Date().toISOString().split('T')[0]
          };
          
          localInventory[stockItemIndex] = updatedItem;
          onUpdateInventoryItem(updatedItem);
          
          remainingToDeduct -= deduct;
        }
      }
    });

    onSaveDispensaryRecord(newRecord);
    alert('औषधि सफलतापूर्वक डिस्पेंस गरियो।');
    
    // Reset
    setSearchId('');
    setSelectedPatient(null);
    setSelectedPrescriptions([]);
    setDispenseItems([]);
    setRemarks('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 p-3 rounded-xl text-primary-600">
            <Pill size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">डिस्पेन्सरी सेवा (Dispensary Service)</h2>
            <p className="text-sm text-slate-500">औषधि वितरण र रेकर्ड व्यवस्थापन</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Search & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-600" /> बिरामी खोज्नुहोस्
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Patient ID, Name or Reg No"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                खोज्नुहोस्
              </button>
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50">
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => selectPatient(r)}
                    className="w-full p-3 text-left hover:bg-white transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-primary-600">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.uniquePatientId} | {r.address}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-left-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                <User size={18} className="text-primary-600" /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">नाम:</span>
                  <span className="font-bold">{selectedPatient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span className="font-mono">{selectedPatient.uniquePatientId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">उमेर/लिङ्ग:</span>
                  <span>{selectedPatient.ageYears}Y {selectedPatient.ageMonths}M / {selectedPatient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ठेगाना:</span>
                  <span>{selectedPatient.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">सम्पर्क:</span>
                  <span>{selectedPatient.phone}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Warehouse size={18} className="text-primary-600" /> गोदाम छान्नुहोस्
            </h3>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">गोदाम छान्नुहोस्</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Prescription & Dispensing */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary-600" /> प्रेस्क्रिप्शन विवरण (Prescriptions)
                </h3>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">
                  कुल: {selectedPrescriptions.length}
                </span>
              </div>

              {selectedPrescriptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3">औषधि / ब्याच</th>
                          <th className="p-3 w-24">मात्रा (Qty)</th>
                          <th className="p-3 w-24">एकाइ (Unit)</th>
                          <th className="p-3">डोज</th>
                          <th className="p-3">स्रोत/मिति</th>
                          <th className="p-3 text-center">डिस्पेंस?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dispenseItems.map((item, idx) => {
                          const batches = inventoryItems.filter(i => 
                            i.itemName.toLowerCase() === item.medicineName.toLowerCase() && 
                            i.storeId === selectedStoreId &&
                            i.currentQuantity > 0
                          ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));

                          const stock = selectedStoreId ? batches.reduce((acc, i) => acc + i.currentQuantity, 0) : 0;
                          
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <div className="font-bold">{item.medicineName}</div>
                                {selectedStoreId && (
                                  <div className="mt-1">
                                    <select
                                      value={item.inventoryId}
                                      onChange={(e) => {
                                        const batch = batches.find(b => b.id === e.target.value);
                                        const newItems = [...dispenseItems];
                                        newItems[idx].inventoryId = e.target.value;
                                        newItems[idx].batchNo = batch?.batchNo || '';
                                        newItems[idx].expiryDate = batch?.expiryDateBs || '';
                                        setDispenseItems(newItems);
                                      }}
                                      className="w-full text-[10px] p-1 border border-slate-200 rounded outline-none bg-white"
                                    >
                                      <option value="">ब्याच छान्नुहोस्</option>
                                      {batches.map(b => (
                                        <option key={b.id} value={b.id}>
                                          B: {b.batchNo || 'N/A'} (Exp: {b.expiryDateBs || 'N/A'}) [Stock: {b.currentQuantity}]
                                        </option>
                                      ))}
                                    </select>
                                    <div className={`text-[10px] font-bold mt-0.5 ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      कुल मौज्दात: {stock}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].quantity = e.target.value;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].unit = e.target.value;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                                  placeholder="Pcs, Tab..."
                                />
                              </td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">
                                <div className="text-xs font-bold text-primary-600">{selectedPrescriptions[idx].source}</div>
                                <div className="text-[10px] text-slate-400">{selectedPrescriptions[idx].date}</div>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.dispensed}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].dispensed = e.target.checked;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">कैफियत (Remarks)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20"
                      placeholder="केहि थप जानकारी भए यहाँ लेख्नुहोस्..."
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleDispense}
                      className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
                    >
                      <Save size={20} /> औषधि डिस्पेंस गर्नुहोस्
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Info size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 italic">यो बिरामीको लागि कुनै प्रेस्क्रिप्शन फेला परेन।</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full text-slate-300">
                <Search size={48} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">बिरामी खोज्नुहोस्</h3>
                <p className="text-slate-500 max-w-xs">औषधि वितरण सुरु गर्नको लागि बायाँ तर्फ बिरामीको ID राखेर खोज्नुहोस्।</p>
              </div>
            </div>
          )}

          {/* Recent Dispensing History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary-600" /> हालसालै वितरण गरिएको रेकर्ड
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">मिति</th>
                    <th className="p-3">बिरामी</th>
                    <th className="p-3">औषधिहरू</th>
                    <th className="p-3">वितरण गर्ने</th>
                    <th className="p-3 text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispensaryRecords
                    .filter(r => r.fiscalYear === currentFiscalYear)
                    .sort((a, b) => b.dispenseDate.localeCompare(a.dispenseDate))
                    .slice(0, 5)
                    .map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3">{r.dispenseDate}</td>
                        <td className="p-3">
                          <div className="font-bold">{r.patientName}</div>
                          <div className="text-[10px] text-slate-400">{r.uniquePatientId}</div>
                        </td>
                        <td className="p-3">
                          {(r.items || []).map((i, idx) => (
                            <div key={idx} className="bg-slate-100 px-2 py-0.5 rounded inline-block mr-1 mb-1 text-[10px]">
                              <span className="font-bold">{i.medicineName}</span> ({i.quantity} {i.unit})
                              {i.batchNo && <span className="ml-1 text-slate-500">B: {i.batchNo}</span>}
                              {i.expiryDate && <span className="ml-1 text-slate-400">Exp: {i.expiryDate}</span>}
                            </div>
                          ))}
                        </td>
                        <td className="p-3">{r.createdBy}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onDeleteDispensaryRecord(r.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {dispensaryRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">कुनै रेकर्ड फेला परेन।</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
