import React, { useState, useRef, useMemo } from 'react';
import { Search, FileText, User, Activity, Save, Printer, History, FlaskConical, Trash2, CheckCircle2, Beaker } from 'lucide-react';
import { ServiceSeekerRecord, BillingRecord, ServiceItem, LabReport, LabTestResult, OrganizationSettings } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface PrayogsalaSewaProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  billingRecords: BillingRecord[];
  serviceItems: ServiceItem[];
  labReports: LabReport[];
  onSaveRecord: (record: LabReport) => void;
  onDeleteRecord: (id: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
}

interface PendingTest extends LabTestResult {
  invoiceNumber: string;
}

export const PrayogsalaSewa: React.FC<PrayogsalaSewaProps> = ({
  serviceSeekerRecords = [],
  billingRecords = [],
  serviceItems = [],
  labReports = [],
  onSaveRecord,
  onDeleteRecord,
  currentFiscalYear,
  currentUser,
  generalSettings
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([]);
  const [currentReport, setCurrentReport] = useState<LabReport | null>(null);
  const [activeTab, setActiveTab] = useState<'sample' | 'result'>('sample');
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    let patient = serviceSeekerRecords.find(r => r.uniquePatientId.toLowerCase() === query);
    
    if (!patient) {
       patient = serviceSeekerRecords.find(r => r.uniquePatientId.replace(/[^0-9]/g, '') === query);
    }

    if (!patient) {
        patient = serviceSeekerRecords.find(r => r.registrationNumber === query && r.fiscalYear === currentFiscalYear);
    }

    if (patient) {
      setCurrentPatient(patient);
      loadPendingTests(patient.id);
      setCurrentReport(null);
    } else {
      alert('बिरामी भेटिएन (Patient not found)');
      setCurrentPatient(null);
      setPendingTests([]);
    }
  };

  const loadPendingTests = (patientId: string) => {
    // 1. Get all bills for this patient
    const patientBills = billingRecords.filter(b => b.serviceSeekerId === patientId);
    
    // 2. Extract all items from bills with their invoice numbers
    const allBilledItems = patientBills.flatMap(b => 
      b.items.map(item => ({ ...item, invoiceNumber: b.invoiceNumber }))
    );

    // 3. Filter items that are Lab Investigations
    const labServiceNames = new Set(
      serviceItems
        .filter(s => s.category === 'Lab')
        .map(s => s.serviceName.trim().toLowerCase())
    );

    const labItems = allBilledItems.filter(item => {
      const itemName = item.serviceName.trim().toLowerCase();
      return labServiceNames.has(itemName) || 
             serviceItems.some(s => s.serviceName.trim().toLowerCase() === itemName && s.category === 'Lab');
    });

    // 4. Check existing reports
    const existingReports = labReports.filter(r => r.serviceSeekerId === patientId);

    // Filter out items that belong to completed reports
    const activeItems = labItems.filter(item => {
      const report = existingReports.find(r => r.invoiceNumber === item.invoiceNumber);
      return !report || report.status !== 'Completed';
    });

    // 5. Prepare tests for the UI
    const tests: PendingTest[] = activeItems.map((item, index) => {
      const itemName = item.serviceName.trim().toLowerCase();
      const serviceDef = serviceItems.find(s => s.serviceName.trim().toLowerCase() === itemName);
      
      // Find if this specific test from this specific invoice is already in an existing report
      const existingReport = existingReports.find(r => 
        r.invoiceNumber === item.invoiceNumber && 
        r.tests?.some(t => t.testName.trim().toLowerCase() === itemName)
      );
      const existingTest = existingReport?.tests?.find(t => t.testName.trim().toLowerCase() === itemName);

      return {
        id: existingTest?.id || `TEST-${item.invoiceNumber}-${index}`,
        testName: item.serviceName,
        result: existingTest?.result || '',
        normalRange: existingTest?.normalRange || serviceDef?.valueRange || '',
        unit: existingTest?.unit || serviceDef?.unit || '',
        remarks: existingTest?.remarks || '',
        sampleCollected: existingTest?.sampleCollected || false,
        sampleCollectedDate: existingTest?.sampleCollectedDate || '',
        sampleCollectedBy: existingTest?.sampleCollectedBy || '',
        invoiceNumber: item.invoiceNumber
      };
    });

    // Grouping: We want to show tests per invoice
    // But for the state, we keep the flat list
    setPendingTests(tests);
  };

  const handleCollectSample = (id: string) => {
    if (!currentPatient) return;

    const updatedTests = pendingTests.map(t => t.id === id ? { 
      ...t, 
      sampleCollected: true, 
      sampleCollectedDate: new NepaliDate().format('YYYY-MM-DD HH:mm'),
      sampleCollectedBy: currentUser?.username || 'System'
    } : t);
    
    setPendingTests(updatedTests);

    // Auto-save to database immediately
    const test = updatedTests.find(t => t.id === id);
    if (test) {
      const invoiceNumber = test.invoiceNumber;
      const invoiceTests = updatedTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
      
      const existingReport = labReports.find(r => 
        r.serviceSeekerId === currentPatient.id && 
        r.invoiceNumber === invoiceNumber
      );

      const reportToSave: LabReport = {
        id: existingReport?.id || Date.now().toString(),
        fiscalYear: currentFiscalYear,
        reportDate: existingReport?.reportDate || new NepaliDate().format('YYYY-MM-DD'),
        serviceSeekerId: currentPatient.id,
        patientName: currentPatient.name,
        age: currentPatient.age,
        gender: currentPatient.gender,
        invoiceNumber: invoiceNumber,
        tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
        status: existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected',
        createdBy: existingReport?.createdBy || currentUser?.username || 'Unknown'
      };

      onSaveRecord(reportToSave);
      alert('नमुना सफलतापूर्वक संकलन गरियो (Sample collected successfully)');

      // Check if all samples for this invoice are collected, if so, switch to result tab
      const allInvoiceTests = updatedTests.filter(t => t.invoiceNumber === invoiceNumber);
      const allCollected = allInvoiceTests.every(t => t.sampleCollected);
      if (allCollected) {
        setActiveTab('result');
      }
    }
  };

  const handleSaveCollection = (invoiceNumber: string) => {
    if (!currentPatient) return;

    const invoiceTests = pendingTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    if (invoiceTests.length === 0) {
      alert("कृपया कम्तिमा एउटा नमुना संकलन गर्नुहोस् (Please collect at least one sample)");
      return;
    }

    // Check if a report already exists for this invoice
    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const reportToSave: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: existingReport?.reportDate || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected',
      createdBy: existingReport?.createdBy || currentUser?.username || 'Unknown'
    };

    onSaveRecord(reportToSave);
    alert(`Invoice ${invoiceNumber} को नमुना संकलन सुरक्षित गरियो।`);
    loadPendingTests(currentPatient.id);
  };

  const handleResultChange = (id: string, field: keyof LabTestResult, value: string) => {
    setPendingTests(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveReport = (invoiceNumber: string) => {
    if (!currentPatient) return;

    const invoiceTests = pendingTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    // Check if any result or remark is entered
    const hasAnyData = invoiceTests.some(t => 
      (t.result && t.result.trim() !== '') || 
      (t.remarks && t.remarks.trim() !== '')
    );

    if (!hasAnyData) {
      if (!window.confirm("तपाईंले कुनै पनि नतिजा वा कैफियत भर्नुभएको छैन। के तपाईं खाली रिपोर्ट सुरक्षित गर्न चाहनुहुन्छ? (You haven't entered any results or remarks. Do you want to save an empty report?)")) {
        return;
      }
    }

    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const newReport: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: 'Completed',
      createdBy: currentUser?.username || 'Unknown'
    };

    onSaveRecord(newReport);
    setCurrentReport(newReport);
    
    if (window.confirm('रिपोर्ट सुरक्षित गरियो। के तपाइँ यसलाई प्रिन्ट गर्न चाहनुहुन्छ? (Report saved. Do you want to print it?)')) {
      setTimeout(handlePrint, 100);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `LabReport-${currentReport?.id || 'New'}`,
  });

  const patientReports = useMemo(() => {
    if (!currentPatient) return [];
    return labReports.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => b.id.localeCompare(a.id));
  }, [labReports, currentPatient]);

  const groupedPendingTests = useMemo(() => {
    const groups: Record<string, PendingTest[]> = {};
    pendingTests.forEach(t => {
      if (!groups[t.invoiceNumber]) groups[t.invoiceNumber] = [];
      groups[t.invoiceNumber].push(t);
    });
    return groups;
  }, [pendingTests]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <FlaskConical className="text-primary-600" />
          प्रयोगशाला सेवा (Lab Service)
        </h2>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="बिरामी ID (PID-XXXXXX) वा दर्ता नं. राख्नुहोस्"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm">
            खोज्नुहोस्
          </button>
        </form>
      </div>

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Info & History */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <User size={18} /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId} {currentPatient.mulDartaNo && `| ${currentPatient.mulDartaNo}`}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <History size={16} className="text-green-600" />
                पुराना रिपोर्टहरू (History)
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {patientReports.length > 0 ? (
                  patientReports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 text-sm">
                      <div>
                         <p className="font-medium">{report.reportDate}</p>
                         <p className="text-xs text-slate-500">{report.tests?.length || 0} Tests {report.invoiceNumber && `(Inv: ${report.invoiceNumber})`}</p>
                      </div>
                      <div className="text-right space-x-2">
                        <button 
                          onClick={() => { setCurrentReport(report); setTimeout(handlePrint, 100); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Print
                        </button>
                        <button 
                          onClick={() => {
                             if(confirm('Are you sure you want to delete this report?')) {
                               onDeleteRecord(report.id);
                             }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                   <p className="text-slate-400 text-sm italic text-center">कुनै रिपोर्ट भेटिएन</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Lab Report Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b">
                <button 
                  onClick={() => setActiveTab('sample')}
                  className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'sample' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Beaker size={18} /> नमुना संकलन (Sample Collection)
                  {pendingTests.filter(t => !t.sampleCollected).length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      {pendingTests.filter(t => !t.sampleCollected).length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('result')}
                  className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'result' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Activity size={18} /> रिपोर्ट प्रविष्टि (Result Entry)
                  {pendingTests.filter(t => t.sampleCollected && !t.result).length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                      {pendingTests.filter(t => t.sampleCollected && !t.result).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-6">
                {Object.keys(groupedPendingTests).length > 0 ? (
                  <div className="space-y-8">
                    {(Object.entries(groupedPendingTests) as [string, PendingTest[]][]).map(([invoiceNumber, tests]) => (
                      <div key={invoiceNumber} className="space-y-4 border-l-4 border-primary-500 pl-4 py-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-primary-600" />
                            Invoice: {invoiceNumber}
                          </h4>
                          {activeTab === 'sample' ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                              <Beaker size={14} /> {tests.filter(t => !t.sampleCollected).length} Pending Samples
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {tests.filter(t => t.sampleCollected && !t.result).length > 0 && (
                                <div className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                  {tests.filter(t => t.sampleCollected && !t.result).length} Pending Results
                                </div>
                              )}
                              {tests.some(t => t.sampleCollected) && (
                                <button 
                                  onClick={() => handleSaveReport(invoiceNumber)}
                                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm flex items-center gap-2"
                                >
                                  <Save size={14} /> Save & Print
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                              {activeTab === 'sample' ? (
                                <tr>
                                  <th className="p-3">Test Name</th>
                                  <th className="p-3">Invoice</th>
                                  <th className="p-3 text-center">Action</th>
                                </tr>
                              ) : (
                                <tr>
                                  <th className="p-3 w-1/4">Test Name</th>
                                  <th className="p-3 w-1/4">Result</th>
                                  <th className="p-3 w-1/6">Unit</th>
                                  <th className="p-3 w-1/6">Normal Range</th>
                                  <th className="p-3 w-1/6">Remarks</th>
                                </tr>
                              )}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeTab === 'sample' ? (
                                tests.filter(t => !t.sampleCollected).map((test) => (
                                  <tr key={test.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">{test.testName}</td>
                                    <td className="p-3 text-xs text-slate-500">
                                      {test.invoiceNumber}
                                    </td>
                                    <td className="p-3 text-center">
                                      <button 
                                        onClick={() => handleCollectSample(test.id)}
                                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                                      >
                                        Collect Sample
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                tests.filter(t => t.sampleCollected).map((test) => (
                                  <tr key={test.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">{test.testName}</td>
                                    <td className="p-3">
                                      <input 
                                        type="text" 
                                        value={test.result}
                                        onChange={(e) => handleResultChange(test.id, 'result', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Result"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <input 
                                        type="text" 
                                        value={test.unit}
                                        onChange={(e) => handleResultChange(test.id, 'unit', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Unit"
                                      />
                                    </td>
                                    <td className="p-3 text-slate-500 text-xs">
                                      {test.normalRange}
                                    </td>
                                    <td className="p-3">
                                      <input 
                                        type="text" 
                                        value={test.remarks}
                                        onChange={(e) => handleResultChange(test.id, 'remarks', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Remarks"
                                      />
                                    </td>
                                  </tr>
                                ))
                              )}
                              {activeTab === 'sample' && tests.filter(t => !t.sampleCollected).length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-8 text-center text-green-600 font-medium bg-green-50/30 italic">
                                    सबै नमुना संकलन भइसकेको छ (All samples collected for this invoice)
                                  </td>
                                </tr>
                              )}
                              {activeTab === 'result' && tests.filter(t => t.sampleCollected).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                    कृपया पहिला नमुना संकलन (Sample Collection) गर्नुहोस्।
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500">यो बिरामीको लागि कुनै ल्याब बिल भेटिएन।</p>
                    <p className="text-xs text-slate-400 mt-1">कृपया पहिला सेवा बिलिङ (Service Billing) मा ल्याब टेस्टको बिल काट्नुहोस्।</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block font-sans">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
            <img 
              src={generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'} 
              style={{ width: '80px', height: '80px' }} 
              alt="Logo" 
              referrerPolicy="no-referrer"
            />
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">{generalSettings?.orgNameNepali || generalSettings?.orgNameEnglish || 'आधारभूत नगर अस्पताल'}</h1>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali2 || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali3 || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.address || ''}</p>
              <h2 className="text-lg font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-1 rounded uppercase">Laboratory Report</h2>
            </div>
            <div className="text-right text-xs space-y-1">
              <p>PAN No: {generalSettings?.panNo || 'N/A'}</p>
              <p>Phone: {generalSettings?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex justify-between mb-6 text-sm border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p><strong>Patient Name:</strong> {currentReport?.patientName}</p>
              <p><strong>Age/Gender:</strong> {currentReport?.age} / {currentReport?.gender}</p>
              <p><strong>Patient ID:</strong> {currentPatient?.uniquePatientId} {currentPatient?.mulDartaNo && `| Mul Darta No: ${currentPatient.mulDartaNo}`}</p>
            </div>
            <div className="space-y-1 text-right">
              <p><strong>Report Date:</strong> {currentReport?.reportDate}</p>
              <p><strong>Report ID:</strong> {currentReport?.id}</p>
              {currentReport?.invoiceNumber && <p><strong>Invoice No:</strong> {currentReport.invoiceNumber}</p>}
            </div>
          </div>

          {/* Results Table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-50">
                <th className="py-2 px-4 text-left">Test Name</th>
                <th className="py-2 px-4 text-left">Result</th>
                <th className="py-2 px-4 text-left">Unit</th>
                <th className="py-2 px-4 text-left">Reference Range</th>
                <th className="py-2 px-4 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentReport?.tests
                ?.filter(test => (test.result && test.result.trim() !== '') || (test.remarks && test.remarks.trim() !== ''))
                .map((test, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2 px-4 font-medium">{test.testName}</td>
                  <td className="py-2 px-4 font-bold">{test.result}</td>
                  <td className="py-2 px-4 text-slate-600">{test.unit}</td>
                  <td className="py-2 px-4 text-slate-600">{test.normalRange}</td>
                  <td className="py-2 px-4 text-slate-600 italic">{test.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
            <div>
              <p>Prepared By: {currentReport?.createdBy}</p>
              <p>Printed On: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-slate-300 w-32 mb-1"></div>
              <p>Lab Technician / Pathologist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
