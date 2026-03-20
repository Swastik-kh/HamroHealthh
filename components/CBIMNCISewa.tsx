import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Save, Printer, Plus, Trash2, User, Stethoscope, Pill, History, Baby, Edit } from 'lucide-react';
import { ServiceSeekerRecord, CBIMNCIRecord, PrescriptionItem, ServiceItem } from '../types/coreTypes';
import { InventoryItem } from '../types/inventoryTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';
import { growthCharts } from '../constants/growthCharts';

interface CBIMNCISewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  cbimnciRecords?: CBIMNCIRecord[];
  onSaveRecord: (record: CBIMNCIRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  serviceItems?: ServiceItem[];
  inventoryItems?: InventoryItem[];
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export const CBIMNCISewa: React.FC<CBIMNCISewaProps> = ({ 
  serviceSeekerRecords = [], 
  cbimnciRecords = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser,
  serviceItems = [],
  inventoryItems = []
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [moduleType, setModuleType] = useState<'Infant' | 'Child'>('Child');
  const [assessmentData, setAssessmentData] = useState<any>({
    dangerSigns: [],
    localInfection: [],
    jaundiceSigns: [],
    dehydrationSigns: [],
    feedingProblems: [],
    generalDangerSigns: [],
    respiratorySigns: [],
    feverSigns: [],
    nutritionSigns: [],
    immunization: [],
    breathingRate: '',
    temperature: '',
    diarrheaDays: '',
    weight: '',
    muac: '',
    coughDays: '',
    feverDays: '',
    earDischargeDays: '',
    malariaRisk: 'None',
    pallor: '',
    attachment: '',
    suckling: '',
    earPain: false,
    earDischarge: false,
    mastoidSwelling: false,
    bloodInStool: false,
    choleraOutbreak: false,
    hivStatus: false,
    parotidSwellingOrLymphNodes: false
  });
  const [cbimnciData, setCbimnciData] = useState<Partial<CBIMNCIRecord>>({
    chiefComplaints: '',
    diagnosis: '',
    investigation: '',
    prescriptions: [],
    advice: '',
    nextVisitDate: '',
    isRefer: false,
    isDeath: false,
    isFollowup: false,
    followupDays: 0
  });
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem>(initialPrescriptionItem);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [existingSearchId, setExistingSearchId] = useState('');
  const [existingSearchResults, setExistingSearchResults] = useState<CBIMNCIRecord[]>([]);
  const [showExistingResults, setShowExistingResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [hasDangerSigns, setHasDangerSigns] = useState<boolean | null>(null);
  const [hasCoughOrBreathingDifficulty, setHasCoughOrBreathingDifficulty] = useState<boolean | null>(null);
  const [hasDiarrhea, setHasDiarrhea] = useState<boolean | null>(null);
  const [hasFever, setHasFever] = useState<boolean | null>(null);
  const [hasEarProblem, setHasEarProblem] = useState<boolean | null>(null);
  const [hasJaundice, setHasJaundice] = useState<boolean | null>(null);
  const [tempF, setTempF] = useState('');

  useEffect(() => {
    const dehydrationSigns = assessmentData.dehydrationSigns || [];
    const count = [
      'चटपटे, झिझिने (Restless, irritable)',
      'आँखा गडेको (Sunken eyes)',
      'पेटको छाला औंलाले तान्दा बिस्तारै फर्कने (Skin pinch goes back slowly)'
    ].filter(sign => dehydrationSigns.includes(sign)).length;

    if (count >= 2) {
      if (!cbimnciData.diagnosis?.includes('केही जलवियोजन (Some Dehydration)')) {
        setCbimnciData(prev => ({
          ...prev,
          diagnosis: prev.diagnosis ? `${prev.diagnosis}, केही जलवियोजन (Some Dehydration)` : 'केही जलवियोजन (Some Dehydration)'
        }));
      }
    }
  }, [assessmentData.dehydrationSigns]);

  const medicineSuggestions = useMemo(() => {
    const defaultMedicines = [
      'Amoxicillin DT 125mg',
      'Amoxicillin DT 250mg',
      'Amoxicillin Syrup',
      'Paracetamol',
      'Zinc',
      'ORS',
      'Vitamin A',
      'Albendazole',
      'Gentamicin Injection',
      'Ampicillin Injection'
    ];
    const fromInventory = inventoryItems.map(i => i.itemName);
    const fromRecords = cbimnciRecords.flatMap(r => r.prescriptions?.map(p => p.medicineName) || []);
    return Array.from(new Set([...defaultMedicines, ...fromInventory, ...fromRecords])).filter(Boolean).sort();
  }, [inventoryItems, cbimnciRecords]);

  const dosageSuggestions = [
    '125 mg',
    '250 mg',
    '500 mg',
    '5 ml',
    '10 ml',
    '1 Tablet',
    '1/2 Tablet',
    '1/4 Tablet'
  ];

  const frequencySuggestions = [
    'दिनमा १ पटक (OD)',
    'दिनमा २ पटक (BD)',
    'दिनमा ३ पटक (TDS)',
    'दिनमा ४ पटक (QID)',
    'आवश्यकता अनुसार (SOS)'
  ];
  
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [showInvestigationResults, setShowInvestigationResults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      
      // Filter by age: 5 years or less
      const ageInMonths = (r.ageYears || 0) * 12 + (r.ageMonths || 0);
      const isAgeValid = ageInMonths <= 60; // 5 years = 60 months
      
      return (idMatch || nameMatch || regMatch) && isAgeValid;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
      setSearchId('');
      setShowSearchResults(false);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
      setShowExistingResults(false);
    } else {
      alert('बिरामी भेटिएन वा उमेर ५ वर्षभन्दा बढी छ (Patient not found or age is over 5 years)');
      setCurrentPatient(null);
    }
  };

  const handleExistingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = existingSearchId.trim().toLowerCase();
    if (!query) return;

    const results = cbimnciRecords.filter(r => {
      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === r.uniquePatientId);
      const idMatch = r.uniquePatientId.toLowerCase().includes(query);
      const nameMatch = patient?.name.toLowerCase().includes(query);
      return idMatch || nameMatch;
    });

    // Group by uniquePatientId to show unique patients who have records
    const uniqueResults: CBIMNCIRecord[] = [];
    const seenIds = new Set();
    results.forEach(r => {
      if (!seenIds.has(r.uniquePatientId)) {
        seenIds.add(r.uniquePatientId);
        uniqueResults.push(r);
      }
    });

    if (uniqueResults.length === 1) {
      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === uniqueResults[0].uniquePatientId);
      if (patient) selectPatient(patient);
      setExistingSearchId('');
      setShowExistingResults(false);
    } else if (uniqueResults.length > 1) {
      setExistingSearchResults(uniqueResults);
      setShowExistingResults(true);
      setShowSearchResults(false);
    } else {
      alert('रेकर्ड भएको बिरामी भेटिएन (No existing record found for this patient)');
    }
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setCurrentPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    setHasDangerSigns(null);
    setHasCoughOrBreathingDifficulty(null);
    setHasDiarrhea(null);
    setHasFever(null);
    setHasEarProblem(null);
    setHasJaundice(null);
    
    // Auto-select module based on age
    let isInfant = false;
    if (patient.ageDays !== undefined && patient.ageDays > 0) {
      isInfant = patient.ageDays < 60;
    } else {
      const ageInMonths = (patient.ageYears || 0) * 12 + (patient.ageMonths || 0);
      isInfant = ageInMonths < 2; // Less than 2 months
    }
    const module = isInfant ? 'Infant' : 'Child';
    setModuleType(module);
    setAssessmentData({
      dangerSigns: [],
      localInfection: [],
      jaundiceSigns: [],
      dehydrationSigns: [],
      feedingProblems: [],
      generalDangerSigns: [],
      respiratorySigns: [],
      feverSigns: [],
      nutritionSigns: [],
      immunization: [],
      breathingRate: '',
      temperature: '',
      diarrheaDays: '',
      weight: '',
      muac: '',
      coughDays: '',
      feverDays: '',
      earDischargeDays: '',
      malariaRisk: 'None',
      pallor: '',
      attachment: '',
      suckling: '',
      earPain: false,
      earDischarge: false,
      mastoidSwelling: false,
      bloodInStool: false,
      hivStatus: false,
      parotidSwellingOrLymphNodes: false,
      hivTestStatus: '',
      motherHivStatus: '',
      isBreastfeeding: false,
      stoppedBreastfeedingLessThan3Months: false,
      tbContact: false,
      tbSymptoms: [],
      tbDiagnosis: false,
      weightLoss: false,
      fatigue: false
    });

    setCbimnciData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: '',
      isRefer: false,
      isDeath: false,
      isFollowup: false,
      followupDays: 0
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
    setTempF('');
  };

  const selectRecordForEdit = (record: CBIMNCIRecord) => {
    setModuleType(record.moduleType || 'Child');
    setHasDangerSigns(record.assessmentData?.generalDangerSigns && record.assessmentData.generalDangerSigns.length > 0);
    setHasCoughOrBreathingDifficulty(!!record.assessmentData?.breathingRate || (record.assessmentData?.respiratorySigns && record.assessmentData.respiratorySigns.length > 0));
    setHasDiarrhea(!!record.assessmentData?.diarrheaDays || (record.assessmentData?.dehydrationSigns && record.assessmentData.dehydrationSigns.length > 0) || record.assessmentData?.bloodInStool);
    setHasFever(!!record.assessmentData?.temperature || !!record.assessmentData?.feverDays || (record.assessmentData?.feverSigns && record.assessmentData.feverSigns.length > 0));
    setHasEarProblem(!!record.assessmentData?.earPain || !!record.assessmentData?.earDischarge || !!record.assessmentData?.mastoidSwelling);
    setHasJaundice(record.assessmentData?.jaundiceSigns && record.assessmentData.jaundiceSigns.length > 0);
    
    const data = record.assessmentData || {};
    setAssessmentData({
      dangerSigns: data.dangerSigns || [],
      localInfection: data.localInfection || [],
      jaundiceSigns: data.jaundiceSigns || [],
      dehydrationSigns: data.dehydrationSigns || [],
      feedingProblems: data.feedingProblems || [],
      generalDangerSigns: data.generalDangerSigns || [],
      respiratorySigns: data.respiratorySigns || [],
      feverSigns: data.feverSigns || [],
      nutritionSigns: data.nutritionSigns || [],
      immunization: data.immunization || [],
      breathingRate: data.breathingRate || '',
      temperature: data.temperature || '',
      diarrheaDays: data.diarrheaDays || '',
      weight: data.weight || '',
      muac: data.muac || '',
      coughDays: data.coughDays || '',
      feverDays: data.feverDays || '',
      earDischargeDays: data.earDischargeDays || '',
      malariaRisk: data.malariaRisk || 'None',
      pallor: data.pallor || '',
      attachment: data.attachment || '',
      suckling: data.suckling || '',
      earPain: data.earPain ?? false,
      earDischarge: data.earDischarge ?? false,
      mastoidSwelling: data.mastoidSwelling ?? false,
      bloodInStool: data.bloodInStool ?? false,
      hivStatus: data.hivStatus ?? false,
      parotidSwellingOrLymphNodes: data.parotidSwellingOrLymphNodes ?? false,
      hivTestStatus: data.hivTestStatus || '',
      motherHivStatus: data.motherHivStatus || '',
      isBreastfeeding: data.isBreastfeeding ?? false,
      stoppedBreastfeedingLessThan3Months: data.stoppedBreastfeedingLessThan3Months ?? false,
      tbContact: data.tbContact ?? false,
      tbSymptoms: data.tbSymptoms || [],
      tbDiagnosis: data.tbDiagnosis ?? false,
      weightLoss: data.weightLoss ?? false,
      fatigue: data.fatigue ?? false
    });

    if (data.temperature && !isNaN(parseFloat(data.temperature))) {
      const f = (parseFloat(data.temperature) * 9/5 + 32).toFixed(1);
      setTempF(f);
    } else {
      setTempF('');
    }

    setCbimnciData({
      chiefComplaints: record.chiefComplaints,
      diagnosis: record.diagnosis,
      investigation: record.investigation,
      prescriptions: record.prescriptions || [],
      advice: record.advice,
      nextVisitDate: record.nextVisitDate,
      isRefer: record.isRefer || false,
      isDeath: record.isDeath || false,
      isFollowup: record.isFollowup || false,
      followupDays: record.followupDays || 0
    });
    setPrescriptionItems(record.prescriptions || []);
    setEditingRecordId(record.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestore = () => {
    if (!currentPatient) return;
    const patientRecords = cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId);
    if (patientRecords.length === 0) {
      alert('यो बिरामीको कुनै पुरानो रेकर्ड भेटिएन।');
      return;
    }
    const sortedRecords = [...patientRecords].sort((a, b) => b.id.localeCompare(a.id));
    const latestRecord = sortedRecords[0];
    const data = latestRecord.assessmentData || {};

    setModuleType(latestRecord.moduleType || 'Child');
    setAssessmentData({
      dangerSigns: data.dangerSigns || [],
      localInfection: data.localInfection || [],
      jaundiceSigns: data.jaundiceSigns || [],
      dehydrationSigns: data.dehydrationSigns || [],
      feedingProblems: data.feedingProblems || [],
      generalDangerSigns: data.generalDangerSigns || [],
      respiratorySigns: data.respiratorySigns || [],
      feverSigns: data.feverSigns || [],
      nutritionSigns: data.nutritionSigns || [],
      immunization: data.immunization || [],
      breathingRate: data.breathingRate || '',
      temperature: data.temperature || '',
      diarrheaDays: data.diarrheaDays || '',
      weight: data.weight || '',
      muac: data.muac || '',
      coughDays: data.coughDays || '',
      feverDays: data.feverDays || '',
      earDischargeDays: data.earDischargeDays || '',
      malariaRisk: data.malariaRisk || 'None',
      pallor: data.pallor || '',
      attachment: data.attachment || '',
      suckling: data.suckling || '',
      earPain: data.earPain ?? false,
      earDischarge: data.earDischarge ?? false,
      mastoidSwelling: data.mastoidSwelling ?? false,
      bloodInStool: data.bloodInStool ?? false,
      hivStatus: data.hivStatus ?? false,
      parotidSwellingOrLymphNodes: data.parotidSwellingOrLymphNodes ?? false,
      hivTestStatus: data.hivTestStatus || '',
      motherHivStatus: data.motherHivStatus || '',
      isBreastfeeding: data.isBreastfeeding ?? false,
      stoppedBreastfeedingLessThan3Months: data.stoppedBreastfeedingLessThan3Months ?? false,
      tbContact: data.tbContact ?? false,
      tbSymptoms: data.tbSymptoms || [],
      tbDiagnosis: data.tbDiagnosis ?? false,
      weightLoss: data.weightLoss ?? false,
      fatigue: data.fatigue ?? false
    });

    if (data.temperature && !isNaN(parseFloat(data.temperature))) {
      const f = (parseFloat(data.temperature) * 9/5 + 32).toFixed(1);
      setTempF(f);
    } else {
      setTempF('');
    }

    setCbimnciData({
      chiefComplaints: latestRecord.chiefComplaints,
      diagnosis: latestRecord.diagnosis,
      investigation: latestRecord.investigation,
      prescriptions: latestRecord.prescriptions || [],
      advice: latestRecord.advice,
      nextVisitDate: latestRecord.nextVisitDate,
      isRefer: latestRecord.isRefer || false,
      isDeath: latestRecord.isDeath || false,
      isFollowup: latestRecord.isFollowup || false,
      followupDays: latestRecord.followupDays || 0
    });
    setPrescriptionItems(latestRecord.prescriptions || []);
    setEditingRecordId(latestRecord.id);
    alert(`पुरानो रेकर्ड (मिति: ${latestRecord.visitDate}) रिस्टोर गरियो।`);
  };

  const handleAddPrescription = () => {
    if (!currentPrescription.medicineName) return;
    const newItem = { ...currentPrescription, id: Date.now().toString() };
    setPrescriptionItems([...prescriptionItems, newItem]);
    setCurrentPrescription(initialPrescriptionItem);
    setShowPrescriptionForm(false);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptionItems(prescriptionItems.filter(item => item.id !== id));
  };

  const handleAddInvestigation = (serviceName: string) => {
    const currentInv = cbimnciData.investigation || '';
    const separator = currentInv ? '\n' : '';
    setCbimnciData({
      ...cbimnciData,
      investigation: `${currentInv}${separator}${serviceName}`
    });
    setInvestigationSearch('');
    setShowInvestigationResults(false);
  };

  const handleSave = () => {
    if (!currentPatient) return;

    if (hasDangerSigns === true && (!assessmentData.generalDangerSigns || assessmentData.generalDangerSigns.length === 0)) {
      alert('कृपया कम्तिमा एउटा खतराको संकेत छान्नुहोस्। (Please select at least one danger sign.)');
      return;
    }
    
    if (hasCoughOrBreathingDifficulty === true && !assessmentData.breathingRate) {
      alert('कृपया सासको दर भर्नुहोस्। (Please enter breathing rate.)');
      return;
    }
    
    if (hasDiarrhea === true && !assessmentData.diarrheaDays) {
      alert('कृपया पखाला लागेको दिन भर्नुहोस्। (Please enter days of diarrhea.)');
      return;
    }

    if (hasFever === true) {
      if (!assessmentData.temperature) {
        alert('कृपया तापक्रम भर्नुहोस्। (Please enter temperature.)');
        return;
      }
      if (!assessmentData.feverDays) {
        alert('कृपया ज्वरो आएको दिन भर्नुहोस्। (Please enter days of fever.)');
        return;
      }
      if (!assessmentData.malariaRisk) {
         alert('कृपया मलेरियाको जोखिम छान्नुहोस्। (Please select malaria risk.)');
         return;
      }
    }

    if (!cbimnciData.diagnosis) {
      alert('कृपया वर्गीकरण (Classification) भर्नुहोस्।');
      return;
    }
    if (prescriptionItems.length === 0) {
      alert('कृपया कम्तिमा एउटा औषधि सिफारिस (Prescription) थप्नुहोस्।');
      return;
    }

    const recordId = editingRecordId || Date.now().toString();
    const visitDate = editingRecordId 
      ? (cbimnciRecords.find(r => r.id === editingRecordId)?.visitDate || new NepaliDate().format('YYYY-MM-DD'))
      : new NepaliDate().format('YYYY-MM-DD');

    const newRecord: CBIMNCIRecord = {
      id: recordId,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: visitDate,
      moduleType: moduleType,
      assessmentData: assessmentData,
      chiefComplaints: cbimnciData.chiefComplaints || '',
      diagnosis: cbimnciData.diagnosis || '',
      investigation: cbimnciData.investigation || '',
      prescriptions: prescriptionItems,
      advice: cbimnciData.advice,
      nextVisitDate: cbimnciData.nextVisitDate,
      isRefer: cbimnciData.isRefer,
      isDeath: cbimnciData.isDeath,
      isFollowup: cbimnciData.isFollowup,
      followupDays: cbimnciData.followupDays
    };

    onSaveRecord(newRecord);
    alert(editingRecordId ? 'CBIMNCI रेकर्ड अपडेट गरियो।' : 'CBIMNCI रेकर्ड सुरक्षित गरियो।');
    
    setCbimnciData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: '',
      isRefer: false,
      isDeath: false,
      isFollowup: false,
      followupDays: 0
    });
    setAssessmentData({
      dangerSigns: [],
      localInfection: [],
      jaundiceSigns: [],
      dehydrationSigns: [],
      feedingProblems: [],
      generalDangerSigns: [],
      respiratorySigns: [],
      feverSigns: [],
      nutritionSigns: [],
      immunization: [],
      breathingRate: '',
      temperature: '',
      diarrheaDays: '',
      weight: '',
      muac: '',
      coughDays: '',
      feverDays: '',
      earDischargeDays: '',
      malariaRisk: 'None',
      pallor: '',
      attachment: '',
      suckling: '',
      earPain: false,
      earDischarge: false,
      mastoidSwelling: false,
      bloodInStool: false,
      hivStatus: false,
      parotidSwellingOrLymphNodes: false,
      hivTestStatus: '',
      motherHivStatus: '',
      isBreastfeeding: false,
      stoppedBreastfeedingLessThan3Months: false,
      tbContact: false,
      tbSymptoms: [],
      tbDiagnosis: false,
      weightLoss: false,
      fatigue: false
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `CBIMNCI-${currentPatient?.uniquePatientId}`,
  });

  const filteredServices = serviceItems?.filter(item => 
    item.serviceName.toLowerCase().includes(investigationSearch.toLowerCase())
  ) || [];

  const renderAssessmentForm = () => {
    if (moduleType === 'Infant') {
      return (
        <div className="space-y-6">
          {/* PSBI / Danger Signs */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. खतराका संकेतहरू (Danger Signs / PSBI)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 14</span>
            </h4>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">के खतराका संकेतहरू छन्? (Are there any danger signs?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDangerSigns" checked={hasDangerSigns === true} onChange={() => setHasDangerSigns(true)} className="text-blue-600" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDangerSigns" checked={hasDangerSigns === false} onChange={() => { setHasDangerSigns(false); setAssessmentData({...assessmentData, generalDangerSigns: []}); }} className="text-blue-600" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasDangerSigns === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {[
                    'काँप्ने (Convulsions)', 
                    'दूध चुस्न/निल्न नसक्ने (Unable to feed)', 
                    'सुस्त वा बेहोस (Lethargic/Unconscious)', 
                    'कोखा हान्ने (Severe chest in-drawing)', 
                    'नाक फुलाउने (Nasal flaring)', 
                    'कन्कने (Grunting)', 
                    'तालु फुलेको (Bulging fontanelle)',
                    'नाइँटो रातो भई छालासम्म फैलिएको (Umbilical redness spreading to skin)'
                  ].concat((currentPatient?.ageDays !== undefined && currentPatient.ageDays <= 7) ? ['सासको दर ६० वा सोभन्दा बढी (Respiratory rate 60 or more)'] : []).map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.generalDangerSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.generalDangerSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, generalDangerSigns: next});
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <Input 
                  label="सासको दर (प्रति मिनेट)" 
                  type="number"
                  value={assessmentData.breathingRate || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} 
                  placeholder="६० वा सोभन्दा बढी भए खतरा"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    label="तापक्रम (Celsius)" 
                    type="number"
                    step="0.1"
                    value={assessmentData.temperature || ''} 
                    onChange={(e) => {
                      const c = e.target.value;
                      setAssessmentData({...assessmentData, temperature: c});
                      if (c && !isNaN(parseFloat(c))) {
                        setTempF((parseFloat(c) * 9/5 + 32).toFixed(1));
                      } else {
                        setTempF('');
                      }
                    }} 
                    placeholder="37.5+ (ज्वरो), <35.5 (चिसो)"
                  />
                  <Input 
                    label="तापक्रम (Fahrenheit)" 
                    type="number" 
                    step="0.1" 
                    value={tempF} 
                    onChange={(e) => {
                      const f = e.target.value;
                      setTempF(f);
                      if (f && !isNaN(parseFloat(f))) {
                        const c = ((parseFloat(f) - 32) * 5/9).toFixed(1);
                        setAssessmentData({...assessmentData, temperature: c});
                      } else {
                        setAssessmentData({...assessmentData, temperature: ''});
                      }
                    }} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">स्थानीय संक्रमण (Local Infection)</label>
                {['नाइँटो रातो भएको (Red umbilicus)', 'नाइँटोबाट पीप बगेको (Umbilical pus)', 'छालामा धेरै फोकाहरू (Skin pustules)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.localInfection?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.localInfection || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, localInfection: next});
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Jaundice */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. कमलपित्त (Jaundice)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 14</span>
            </h4>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">के कमलपित्त छ? (Is Jaundice present?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasJaundice" checked={hasJaundice === true} onChange={() => setHasJaundice(true)} className="text-amber-600" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasJaundice" checked={hasJaundice === false} onChange={() => { setHasJaundice(false); setAssessmentData({...assessmentData, jaundiceSigns: []}); }} className="text-amber-600" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasJaundice === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">कमलपित्तको अवस्था</label>
                  {['हत्केला र पैताला पहेंलो (Yellow palms/soles)', '२४ घण्टा भन्दा कमको शिशुमा कमलपित्त', 'कमलपित्त देखिएको (Jaundice present)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.jaundiceSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.jaundiceSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, jaundiceSigns: next});
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 15</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई पखाला लागेको छ? (Does the child have diarrhea?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDiarrheaInfant" checked={hasDiarrhea === true} onChange={() => setHasDiarrhea(true)} className="text-emerald-600 focus:ring-emerald-500" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDiarrheaInfant" checked={hasDiarrhea === false} onChange={() => { setHasDiarrhea(false); setAssessmentData({...assessmentData, diarrheaDays: '', dehydrationSigns: [], bloodInStool: false}); }} className="text-emerald-600 focus:ring-emerald-500" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>
            {hasDiarrhea === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू (Dehydration Signs)</label>
                  {[
                    'चटपटे, झिझिने (Restless, irritable)',
                    'आँखा गडेको (Sunken eyes)',
                    'पेटको छाला औंलाले तान्दा बिस्तारै फर्कने (Skin pinch goes back slowly)',
                    'सुस्त वा बेहोस (Lethargic/Unconscious)',
                    'छाला तान्दा धेरै ढिलो फर्कने (Skin pinch very slow)'
                  ].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.dehydrationSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.dehydrationSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, dehydrationSigns: next});
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <Input label="पखाला लागेको दिन" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.bloodInStool}
                      onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    दिसामा रगत देखिएको (Blood in stool)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Feeding / Weight */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. स्तनपान र तौल (Feeding & Weight)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 16</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.01" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                {zScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(zScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(zScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(zScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">WAZ Score: {zScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : parseFloat(zScore) > 2 ? 'Overweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                <label className="text-sm font-medium text-slate-700 block">स्तनपानको अवस्था</label>
                <div className="space-y-1">
                  {['२४ घण्टामा १० पटक भन्दा कम स्तनपान', 'थप खाना वा झोल दिने गरेको', 'स्तनपान गराउन गाह्रो भएको'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.feedingProblems?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.feedingProblems || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, feedingProblems: next});
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">स्तनपान मूल्यांकन (Assessment of Breastfeeding)</label>
                <div className="space-y-2">
                  <select 
                    value={assessmentData.attachment || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, attachment: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">स्तन समातेको (Attachment)</option>
                    <option value="Good">राम्रो (Good)</option>
                    <option value="Not Well">राम्रो नभएको (Not well)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                  <select 
                    value={assessmentData.suckling || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, suckling: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">दूध चुसेको (Suckling)</option>
                    <option value="Effective">प्रभावकारी (Effective)</option>
                    <option value="Not Effective">प्रभावकारी नभएको (Not effective)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>५. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 16</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 gap-2">
                {['BCG', 'OPD-0', 'fIPV-1', 'PCV-1', 'Rotavirus-1', 'DPT-HepB-Hib-1'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          {/* General Danger Signs */}
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. सामान्य खतराका संकेतहरू (General Danger Signs)</span>
              <span className="text-xs font-normal text-red-600">Booklet Page 25</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चामा सामान्य खतराका संकेतहरू छन्? (Are there any general danger signs?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDangerSigns === true} 
                    onChange={() => setHasDangerSigns(true)} 
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDangerSigns === false} 
                    onChange={() => {
                      setHasDangerSigns(false);
                      setAssessmentData({...assessmentData, generalDangerSigns: []});
                    }} 
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>
            
            {hasDangerSigns === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">

                  {['पिउन/स्तनपान गर्न नसक्ने', 'सबै कुरा वान्ता गर्ने', 'काँप्ने (Convulsions)', 'सुस्त वा वेहोस (Lethargic/Unconscious)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.generalDangerSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.generalDangerSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, generalDangerSigns: next});
                        }}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cough / Breathing */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. खोकी वा सास फेर्न गाह्रो (Cough / Breathing)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 25</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई खोकी लागेको वा सास फेर्न गाह्रो छ? (Does the child have cough or difficulty breathing?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasCoughOrBreathingDifficulty === true} 
                    onChange={() => setHasCoughOrBreathingDifficulty(true)} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasCoughOrBreathingDifficulty === false} 
                    onChange={() => {
                      setHasCoughOrBreathingDifficulty(false);
                      setAssessmentData({...assessmentData, coughDays: '', breathingRate: '', respiratorySigns: []});
                    }} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasCoughOrBreathingDifficulty === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input label="खोकी लागेको दिन" type="number" value={assessmentData.coughDays || ''} onChange={(e) => setAssessmentData({...assessmentData, coughDays: e.target.value})} />
                    <Input label="सासको दर (प्रति मिनेट)*" type="number" value={assessmentData.breathingRate || ''} onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    {['कोखा हान्ने (Chest in-drawing)', 'शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)', 'Wheezing'].map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.respiratorySigns?.includes(sign)}
                          onChange={(e) => {
                            const current = assessmentData.respiratorySigns || [];
                            const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                            setAssessmentData({...assessmentData, respiratorySigns: next});
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 26</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई पखाला लागेको छ? (Does the child have diarrhea?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDiarrhea === true} 
                    onChange={() => setHasDiarrhea(true)} 
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDiarrhea === false} 
                    onChange={() => {
                      setHasDiarrhea(false);
                      setAssessmentData({...assessmentData, diarrheaDays: '', dehydrationSigns: [], bloodInStool: false});
                    }} 
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasDiarrhea === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू</label>
                  {["सुस्त वा बेहोस (Lethargic/Unconscious)", "छटपटीने वा झर्किने (Restless/Irritable)", "आँखा गडेको (Sunken eyes)", "खूब तिर्खाए झैं गरी पिउँछ (Drinks eagerly)", "पिउन नसक्ने वा ढिलो पिउने (Unable to drink)", "छाला तान्दा धेरै ढिलो फर्कने (Skin pinch very slow)", "छाला तान्दा ढिलो फर्कने (Skin pinch slow)"].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.dehydrationSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.dehydrationSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, dehydrationSigns: next});
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <Input label="पखाला लागेको दिन*" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} required />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.bloodInStool}
                      onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    दिसामा रगत देखिएको (Blood in stool)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.choleraOutbreak}
                      onChange={(e) => setAssessmentData({...assessmentData, choleraOutbreak: e.target.checked})}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    हैजा फैलिएको क्षेत्र (Cholera outbreak in area)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Fever */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. ज्वरो (Fever)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 27</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई ज्वरो आएको छ? (Does the child have fever?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasFever === true} 
                    onChange={() => setHasFever(true)} 
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasFever === false} 
                    onChange={() => {
                      setHasFever(false);
                      setAssessmentData({...assessmentData, temperature: '', feverDays: '', malariaRisk: 'None', feverSigns: []});
                    }} 
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasFever === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      label="तापक्रम (Celsius)*" 
                      type="number" 
                      step="0.1" 
                      value={assessmentData.temperature || ''} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setAssessmentData({...assessmentData, temperature: c});
                        if (c && !isNaN(parseFloat(c))) {
                          setTempF((parseFloat(c) * 9/5 + 32).toFixed(1));
                        } else {
                          setTempF('');
                        }
                      }} 
                      required 
                    />
                    <Input 
                      label="तापक्रम (Fahrenheit)" 
                      type="number" 
                      step="0.1" 
                      value={tempF} 
                      onChange={(e) => {
                        const f = e.target.value;
                        setTempF(f);
                        if (f && !isNaN(parseFloat(f))) {
                          const c = ((parseFloat(f) - 32) * 5/9).toFixed(1);
                          setAssessmentData({...assessmentData, temperature: c});
                        } else {
                          setAssessmentData({...assessmentData, temperature: ''});
                        }
                      }} 
                    />
                  </div>
                  <Input label="ज्वरो आएको दिन*" type="number" value={assessmentData.feverDays || ''} onChange={(e) => setAssessmentData({...assessmentData, feverDays: e.target.value})} required />
                  <label className="text-sm font-medium text-slate-700 block">मलेरियाको जोखिम*</label>
                  <select 
                    value={assessmentData.malariaRisk || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, malariaRisk: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  >
                    <option value="">छान्नुहोस् (Select)</option>
                    <option value="High">उच्च (High)</option>
                    <option value="None">नभएको (No Risk)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ज्वरोका थप संकेतहरू</label>
                  {["गर्दन अररो (Stiff neck)", "RDT Positive", "RDT Negative", "दादुरा (Measles)", "आँखा रातो (Red eyes)", "मुखभित्र घाउ (Mouth ulcers)", "कर्निया धमिलो (Cornea clouding)"].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.feverSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.feverSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, feverSigns: next});
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ear Infection */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex justify-between items-center">
              <span>५. कानको समस्या (Ear Problem)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 28</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई कानको समस्या छ? (Does the child have an ear problem?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasEarProblem === true} 
                    onChange={() => setHasEarProblem(true)} 
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasEarProblem === false} 
                    onChange={() => {
                      setHasEarProblem(false);
                      setAssessmentData({...assessmentData, earPain: false, earDischarge: false, earDischargeDays: '', mastoidSwelling: false});
                    }} 
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasEarProblem === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.earPain}
                      onChange={(e) => setAssessmentData({...assessmentData, earPain: e.target.checked})}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    कान दुख्ने (Ear pain)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.earDischarge}
                      onChange={(e) => setAssessmentData({...assessmentData, earDischarge: e.target.checked})}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    कानबाट पिप बग्ने (Ear discharge)
                  </label>
                  {assessmentData.earDischarge && (
                    <Input label="लगातार कति दिन देखि?" type="number" value={assessmentData.earDischargeDays || ''} onChange={(e) => setAssessmentData({...assessmentData, earDischargeDays: e.target.value})} />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.mastoidSwelling}
                      onChange={(e) => setAssessmentData({...assessmentData, mastoidSwelling: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    कानको पछाडि दुख्ने गरी सुन्निएको (Mastoid swelling)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Malnutrition / Anemia */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>६. पोषण र रक्तअल्पता (Nutrition & Anemia)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 28-29</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.1" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                {zScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(zScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(zScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(zScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">Weight-for-Age Z-Score: {zScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : parseFloat(zScore) > 2 ? 'Overweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                <Input label="MUAC (mm)" type="number" value={assessmentData.muac || ''} onChange={(e) => setAssessmentData({...assessmentData, muac: e.target.value})} />
                <label className="text-sm font-medium text-slate-700 block">रक्तअल्पता (Anemia)</label>
                <select 
                  value={assessmentData.pallor || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, pallor: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">हत्केलाको अवस्था</option>
                  <option value="Severe">{"धेरै सेतो (Severe pallor)"}</option>
                  <option value="Some">{"केही सेतो (Some pallor)"}</option>
                  <option value="None">{"सामान्य (No pallor)"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">पोषणका संकेतहरू</label>
                {["दुवै खुट्टा सुन्निएको (Oedema both feet)", "धेरै दुब्लो (Visible severe wasting)"].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.nutritionSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.nutritionSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, nutritionSigns: next});
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    {sign}
                  </label>
                ))}
                
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-4 border-t border-purple-200 pt-2 font-medium text-purple-900">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.weightLoss}
                    onChange={(e) => setAssessmentData({...assessmentData, weightLoss: e.target.checked})}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  विगत ३ महिना देखि बच्चाको तौल नबढेमा वा घटेमा (No weight gain or weight loss in last 3 months)
                </label>
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>७. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 29</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['BCG', 'OPV-1,2,3', 'DPT-HepB-Hib-1,2,3', 'PCV-1,2,3', 'fIPV-1,2', 'Rotavirus-1,2', 'Measles-Rubella-1,2', 'JE', 'TCV'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* HIV Trigger Checkbox */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={assessmentData.parotidSwellingOrLymphNodes}
                onChange={(e) => setAssessmentData({...assessmentData, parotidSwellingOrLymphNodes: e.target.checked})}
                className="rounded text-pink-600 focus:ring-pink-500"
              />
              बाहिर प्यारोटिड ग्रन्थी सुन्निएको छ वा सबै लिम्फ ग्रन्थीहरु बढेका छन्? (Parotid gland swelling or enlarged lymph nodes?)
            </label>
          </div>

          {/* HIV Assessment */}
          {(() => {
            const classifications = getClassification();
            const severeClassifications = classifications.filter(c => 
              c === 'Severe Pneumonia or Very Severe Disease' || 
              c === 'Severe Persistent Diarrhea' || 
              c === 'Very Severe Febrile Disease' || 
              c === 'Severe Acute Malnutrition'
            );
            
            const hasMouthUlcers = assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)');
            
            const shouldShowHivAssessment = 
              severeClassifications.length >= 2 || 
              assessmentData.parotidSwellingOrLymphNodes || 
              hasMouthUlcers;

            if (!shouldShowHivAssessment) return null;

            return (
              <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-200">
                <h4 className="font-bold text-pink-800 border-b border-pink-300 mb-2 pb-1 flex justify-between items-center">
                  <span>८. एच.आई.भी. संक्रमण (HIV Infection)</span>
                  <span className="text-xs font-normal text-pink-600">Booklet Page 30</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">आमाको HIV अवस्था (Mother's HIV Status)</label>
                    <select 
                      value={assessmentData.motherHivStatus || ''} 
                      onChange={(e) => setAssessmentData({...assessmentData, motherHivStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">छान्नुहोस्</option>
                      <option value="Positive">पोजिटिभ (Positive)</option>
                      <option value="Negative">नेगेटिभ (Negative)</option>
                      <option value="Unknown">थाहा नभएको (Unknown)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">बच्चाको HIV जाँच (Child's HIV Test)</label>
                    <select 
                      value={assessmentData.hivTestStatus || ''} 
                      onChange={(e) => setAssessmentData({...assessmentData, hivTestStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">छान्नुहोस्</option>
                      <option value="Virological Positive">Virological Test Positive</option>
                      <option value="DNA PCR Positive">DNA PCR Positive</option>
                      <option value="Rapid Test Positive">Rapid Test Positive</option>
                      <option value="Negative">नेगेटिभ (Negative)</option>
                      <option value="Unknown">थाहा नभएको / नगरेको (Unknown/Not Done)</option>
                    </select>
                  </div>
                  {assessmentData.motherHivStatus === 'Positive' && (
                    <div className="col-span-1 md:col-span-2 space-y-2 mt-2 border-t border-pink-200 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.isBreastfeeding}
                          onChange={(e) => setAssessmentData({...assessmentData, isBreastfeeding: e.target.checked})}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                        बच्चाले हाल स्तनपान गरिरहेको छ? (Is the child currently breastfeeding?)
                      </label>
                      
                      {!assessmentData.isBreastfeeding && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                          <input 
                            type="checkbox" 
                            checked={assessmentData.stoppedBreastfeedingLessThan3Months}
                            onChange={(e) => setAssessmentData({...assessmentData, stoppedBreastfeedingLessThan3Months: e.target.checked})}
                            className="rounded text-pink-600 focus:ring-pink-500"
                          />
                          स्तनपान छुटाएको ३ महिना भन्दा कम भएको छ? (Stopped breastfeeding less than 3 months ago?)
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Fatigue Screening */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={assessmentData.fatigue}
                onChange={(e) => setAssessmentData({...assessmentData, fatigue: e.target.checked})}
                className="rounded text-slate-600 focus:ring-slate-500"
              />
              चाडै थकाई लाग्ने, खेलकुद लगायत दैनिक क्रियाकलापमा मन नलाग्ने (Easily fatigued / Loss of interest)
            </label>
          </div>

          {/* Tuberculosis Assessment */}
          {(() => {
            const coughDuration = parseInt(assessmentData.coughDays || '0');
            const feverDuration = parseInt(assessmentData.feverDays || '0');
            const temp = parseFloat(assessmentData.temperature || '0');
            const isSevereMalnutrition = assessmentData.nutritionSigns?.includes('धेरै दुब्लो (Visible severe wasting)') || 
                                         assessmentData.nutritionSigns?.includes('दुवै खुट्टा सुन्निएको (Oedema both feet)') ||
                                         (zScore && parseFloat(zScore) < -3);
            
            const showTbAssessment = 
              (coughDuration > 14) ||
              (feverDuration > 14 && temp > 38) ||
              (assessmentData.weightLoss) ||
              (isSevereMalnutrition) ||
              (assessmentData.fatigue);

            if (!showTbAssessment) return null;

            return (
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
                <h4 className="font-bold text-orange-800 border-b border-orange-300 mb-2 pb-1 flex justify-between items-center">
                  <span>९. क्षयरोग (Tuberculosis)</span>
                  <span className="text-xs font-normal text-orange-600">Booklet Page 31</span>
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.tbContact}
                      onChange={(e) => setAssessmentData({...assessmentData, tbContact: e.target.checked})}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    के बच्चाको परिवारमा वा नजिकको सम्पर्कमा क्षयरोग लागेको व्यक्ति हुनुहुन्छ? (Contact with TB patient?)
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.tbDiagnosis}
                      onChange={(e) => setAssessmentData({...assessmentData, tbDiagnosis: e.target.checked})}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    खकार पोजिटिभ क्षयरोग लागेका वा क्लिनिकल क्षयरोग भनी निदान भएका (Sputum positive TB or Clinically diagnosed TB)
                  </label>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">क्षयरोगका लक्षणहरू (TB Symptoms)</label>
                    {['२ हप्ता वा बढी समयदेखि खोकी (Cough > 2 weeks)', '२ हप्ता वा बढी समयदेखि ज्वरो (Fever > 2 weeks)', 'तौल नबढेको वा घटेको (Weight loss / Poor weight gain)'].map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.tbSymptoms?.includes(sign)}
                          onChange={(e) => {
                            const current = assessmentData.tbSymptoms || [];
                            const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                            setAssessmentData({...assessmentData, tbSymptoms: next});
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }
  };

  const getClassification = () => {
    const classifications: string[] = [];
    
    if (moduleType === 'Infant') {
      // PSBI and Pneumonia logic based on age
      const ageDays = currentPatient?.ageDays || 0;
      const breathingRate = parseFloat(assessmentData.breathingRate || '0');
      
      const dangerSignsList = assessmentData.generalDangerSigns || [];
      const hasAnyOf8Signs = dangerSignsList.some(s => [
        'काँप्ने (Convulsions)', 
        'दूध चुस्न/निल्न नसक्ने (Unable to feed)', 
        'सुस्त वा बेहोस (Lethargic/Unconscious)', 
        'कोखा हान्ने (Severe chest in-drawing)', 
        'नाक फुलाउने (Nasal flaring)', 
        'कन्कने (Grunting)', 
        'तालु फुलेको (Bulging fontanelle)',
        'नाइँटो रातो भई छालासम्म फैलिएको (Umbilical redness spreading to skin)'
      ].includes(s));

      const isAge7OrLess = ageDays <= 7;
      const isRR60OrMore = breathingRate >= 60;

      if (hasAnyOf8Signs || (isAge7OrLess && isRR60OrMore)) {
        classifications.push('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)');
      } else if (!isAge7OrLess && breathingRate >= 60) {
        classifications.push('Pneumonia');
      }
      
      // Local Infection
      if (assessmentData.localInfection?.length > 0) classifications.push('Local Bacterial Infection');
      
      // Jaundice
      if (assessmentData.jaundiceSigns?.includes('हत्केला र पैताला पहेंलो (Yellow palms/soles)') || 
          assessmentData.jaundiceSigns?.includes('२४ घण्टा भन्दा कमको शिशुमा कमलपित्त')) {
        classifications.push('Severe Jaundice');
      } else if (assessmentData.jaundiceSigns?.includes('कमलपित्त देखिएको (Jaundice present)')) {
        classifications.push('Jaundice');
      }

      // Dehydration
      if (assessmentData.diarrheaDays) {
        const dehydSigns = assessmentData.dehydrationSigns || [];
        const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('very slow')).length;
        const someCount = dehydSigns.length;
        
        if (severeCount >= 2) {
          classifications.push('कडा जलवियोजन (Severe Dehydration)');
        } else if (someCount >= 2) {
          classifications.push('जलवियोजन (Some Dehydration)');
        } else {
          classifications.push('जलवियोजन नभएको (No Dehydration)');
        }
      }

      // Feeding Problem and Weight
      const hasFeedingProblem = assessmentData.feedingProblems?.length > 0 || 
                                assessmentData.attachment === 'Not Well' || 
                                assessmentData.attachment === 'Not at all' || 
                                assessmentData.suckling === 'Not Effective' || 
                                assessmentData.suckling === 'Not at all';
      
      const weight = parseFloat(assessmentData.weight || '0');
      const isWeightNormal = weight >= 2.5;

      if (hasFeedingProblem) {
        classifications.push('Feeding Problem');
      } else if (assessmentData.attachment || assessmentData.suckling) {
        if (isWeightNormal) {
           classifications.push('No Feeding Problem and Normal Weight');
        } else {
           classifications.push('No Feeding Problem');
        }
      }

      if (weight > 0) {
        if (ageDays < 7 && weight < 2) {
          classifications.push('Very Low Birth Weight');
        } else if (weight < 2.5) {
          classifications.push('Low Birth Weight');
        }
      }
    } else {
      // Child
      // General Danger Signs
      if (assessmentData.generalDangerSigns?.length > 0) {
        classifications.push('Very Severe Disease');
      }

      // Pneumonia
      const rate = parseInt(assessmentData.breathingRate);
      let isInfant = false;
      if (currentPatient?.ageDays !== undefined && currentPatient?.ageDays > 0) {
        isInfant = currentPatient.ageDays < 60;
      } else {
        const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
        isInfant = ageInMonths < 2;
      }
      const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
      const isFast = (ageInMonths < 12 && rate >= 50) || (ageInMonths >= 12 && rate >= 40);
      
      if (assessmentData.respiratorySigns?.includes('शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)')) {
        classifications.push('Severe Pneumonia or Very Severe Disease');
      } else if (isFast || assessmentData.respiratorySigns?.includes('कोखा हान्ने (Chest in-drawing)')) {
        classifications.push('Pneumonia');
      } else if (assessmentData.coughDays) {
        classifications.push('No Pneumonia: Cough or Cold');
      }

      // Dehydration
      const dehydSigns = assessmentData.dehydrationSigns || [];
      const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('Unable') || s.includes('very slow')).length;
      const someCount = dehydSigns.length;
      
      let dehydrationType = '';
      if (severeCount >= 2) {
        dehydrationType = 'Severe Dehydration';
      } else if (someCount >= 2) {
        dehydrationType = 'Some Dehydration';
      } else if (assessmentData.diarrheaDays) {
        dehydrationType = 'No Dehydration';
      }
      if (dehydrationType) classifications.push(dehydrationType);

      // Persistent Diarrhea
      const diarrheaDays = parseInt(assessmentData.diarrheaDays);
      if (diarrheaDays >= 14) {
        if (dehydrationType === 'Severe Dehydration' || dehydrationType === 'Some Dehydration') {
          classifications.push('Severe Persistent Diarrhea');
        } else {
          classifications.push('Persistent Diarrhea');
        }
      }

      // Dysentery
      if (assessmentData.bloodInStool) {
        classifications.push('Dysentery');
      }

      // Haija (Cholera)
      if (dehydrationType === 'Severe Dehydration' && assessmentData.choleraOutbreak) {
        classifications.push('हैजा (Haija)');
      }

      // Fever
      const hasFever = parseFloat(assessmentData.temperature) >= 37.5 || assessmentData.feverDays > 0;
      if (hasFever) {
        if (assessmentData.feverSigns?.includes('गर्दन अररो (Stiff neck)') || assessmentData.generalDangerSigns?.length > 0) {
          classifications.push('अति कडा ज्वरो (Very Severe Febrile Disease)');
        } else {
          if (assessmentData.malariaRisk === 'High' && assessmentData.feverSigns?.includes('RDT Positive')) {
            classifications.push('मलेरिया (Malaria)');
          } else if (assessmentData.feverSigns?.includes('RDT Negative') || assessmentData.malariaRisk === 'None') {
            classifications.push('ज्वरो (Fever: Malaria Unlikely)');
          }
        }
      }

      // Measles
      if (assessmentData.feverSigns?.includes('दादुरा (Measles)')) {
        if (assessmentData.generalDangerSigns?.length > 0 || 
            assessmentData.feverSigns?.includes('कर्निया धमिलो (Cornea clouding)') || 
            assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)')) {
          classifications.push('Severe Complicated Measles');
        } else if (assessmentData.feverSigns?.includes('आँखा रातो (Red eyes)')) {
          classifications.push('Measles with Eye/Mouth Complications');
        } else {
          classifications.push('Measles');
        }
      }

      // Malnutrition
      const muacVal = parseInt(assessmentData.muac);
      const currentZScore = zScore ? parseFloat(zScore) : null;
      
      if (assessmentData.nutritionSigns?.includes("दुवै खुट्टा सुन्निएको (Oedema both feet)") || 
          (muacVal > 0 && muacVal < 115) || 
          (currentZScore !== null && currentZScore < -3)) {
        classifications.push('Severe Acute Malnutrition');
      } else if ((muacVal >= 115 && muacVal < 125) || 
                 (currentZScore !== null && currentZScore < -2 && currentZScore >= -3)) {
        classifications.push('Moderate Acute Malnutrition');
      } else if (muacVal >= 125 || (currentZScore !== null && currentZScore >= -2)) {
        classifications.push('No Malnutrition');
      }

      // Anemia
      if (assessmentData.pallor === 'Severe') {
        classifications.push('Severe Anemia');
      } else if (assessmentData.pallor === 'Some') {
        classifications.push('Anemia');
      }

      // Ear Infection
      if (assessmentData.mastoidSwelling) {
        classifications.push('Mastoiditis');
      } else if (assessmentData.earPain || (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) < 14)) {
        classifications.push('Acute Ear Infection');
      } else if (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) >= 14) {
        classifications.push('Chronic Ear Infection');
      } else if (assessmentData.earDischarge === false && assessmentData.earPain === false) {
        classifications.push('No Ear Infection');
      }

      // HIV Classification
      const isHivInfected = 
        assessmentData.hivTestStatus === 'Virological Positive' ||
        (assessmentData.hivTestStatus === 'DNA PCR Positive' && ageInMonths < 18) ||
        (assessmentData.hivTestStatus === 'Rapid Test Positive' && ageInMonths >= 18);

      const isHivExposedSuspected = 
        (assessmentData.motherHivStatus === 'Positive' && 
         (assessmentData.isBreastfeeding || assessmentData.stoppedBreastfeedingLessThan3Months) && 
         assessmentData.hivTestStatus === 'Negative') ||
        (assessmentData.motherHivStatus === 'Positive' && 
         (assessmentData.hivTestStatus === '' || assessmentData.hivTestStatus === 'Unknown'));

      if (isHivInfected) {
        classifications.push('CONFIRMED HIV INFECTION');
      } else if (isHivExposedSuspected) {
        classifications.push('HIV EXPOSED / SUSPECTED HIV');
      } else if (assessmentData.motherHivStatus === 'Positive' || 
                 (assessmentData.hivTestStatus === 'Rapid Test Positive' && ageInMonths < 18) ||
                 (assessmentData.hivTestStatus === 'DNA PCR Positive' && ageInMonths >= 18)) {
          classifications.push('HIV EXPOSED');
      } else if (assessmentData.motherHivStatus === 'Unknown') {
        // Check for symptoms suggestive of HIV
        const hasSymptoms = classifications.some(c => 
          c.includes('Pneumonia') || 
          c.includes('Persistent Diarrhea') || 
          c.includes('Acute Ear Infection') || 
          c.includes('Severe Acute Malnutrition')
        );
        if (hasSymptoms) {
          classifications.push('SUSPECTED SYMPTOMATIC HIV');
        } else {
          classifications.push('HIV TEST REQUIRED');
        }
      } else if (assessmentData.motherHivStatus === 'Negative' && assessmentData.hivTestStatus === 'Negative') {
        classifications.push('HIV INFECTION UNLIKELY');
      }

      // Tuberculosis (TB) Classification
      const hasTbSymptoms = assessmentData.tbSymptoms && assessmentData.tbSymptoms.length > 0;
      const coughDuration = parseInt(assessmentData.coughDays || '0');
      const feverDuration = parseInt(assessmentData.feverDays || '0');
      
      if (assessmentData.tbDiagnosis) {
        classifications.push('CONFIRMED TB');
      } else if (hasTbSymptoms || coughDuration >= 14 || feverDuration >= 14 || assessmentData.fatigue) {
        classifications.push('POSSIBLE TB');
      } else if (assessmentData.tbContact) {
        classifications.push('LATENT TUBERCULOSIS INFECTION');
      } else {
        classifications.push('TB UNLIKELY');
      }
    }

    return classifications;
  };

  const getSuggestedNextVisit = (classifications: string[]) => {
    if (classifications.length === 0) return null;
    
    if (moduleType === 'Infant') {
      if (classifications.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)')) return 'Immediate';
      if (classifications.includes('Local Bacterial Infection')) return '3 days';
      if (classifications.includes('Jaundice') || classifications.includes('Severe Jaundice')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
    } else {
      if (classifications.includes('Very Severe Disease') || classifications.includes('अति कडा ज्वरो (Very Severe Febrile Disease)') || classifications.includes('Severe Complicated Measles') || classifications.includes('Severe Persistent Diarrhea') || classifications.includes('हैजा (Haija)')) return 'Immediate';
      if (classifications.includes('Pneumonia') || classifications.includes('मलेरिया (Malaria)') || classifications.includes('Measles with Eye/Mouth Complications') || classifications.includes('Dysentery')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
      if (classifications.includes('Acute Ear Infection') || classifications.includes('Persistent Diarrhea')) return '5 days';
      if (classifications.includes('Severe Acute Malnutrition')) return '30 days';
    }
    return null;
  };

  const getSuggestedTreatment = (classifications: string[]) => {
    const treatments: string[] = [];
    if (classifications.length === 0) return [];

    if (moduleType === 'Infant') {
      const weight = parseFloat(assessmentData.weight) || 0;
      if (classifications.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)')) {
        let gentDose = '';
        let ampDose = '';
        if (weight > 0) {
          gentDose = `${(weight * 5).toFixed(1)}mg (0.125ml/kg of 40mg/ml)`;
          ampDose = `${(weight * 50).toFixed(0)}mg (0.2ml/kg of 250mg/ml)`;
        }
        treatments.push(`१) शिशुलाई IM Gentamycin (${gentDose}) र IM Ampicillin (${ampDose}) को पहिलो मात्रा दिनुहोस्`);
        treatments.push('२) रगतमा चिनीको मात्रा कम हुन नदिन स्तनपानलाई निरन्तरता दिनुहोस्');
        treatments.push('३) शिशुलाई तुरुन्त अस्पताल प्रेषण (Refer) गर्नुहोस्');
      }
      if (classifications.includes('Local Bacterial Infection')) {
        let amoxDose = '';
        if (weight >= 2 && weight < 3.5) amoxDose = '125mg (2.5ml syrup) twice daily';
        else if (weight >= 3.5 && weight < 5) amoxDose = '250mg (5ml syrup) twice daily';
        
        treatments.push(`१) Amoxycillin ५ दिन सम्म खान दिनुहोस्: ${amoxDose}`);
        treatments.push('२) आमालाई स्थानीय संक्रमणको घरमै उपचार गर्न सिकाउनुहोस्');
        treatments.push('३) नवजात शिशुलाई घरमै स्याहार गर्न आमालाई सल्लाह दिनुहोस्');
        treatments.push('४) ३ दिनमा फलो-अप (Follow-up) मा बोलाउनुहोस्');
      }
      if (classifications.includes('Pneumonia')) {
        treatments.push('१) Amoxycillin ७ दिनको लागि खान दिनुहोस्');
        treatments.push('२) घरमै शिशुलाई स्याहार गर्नेबारे आमालाई परामर्श दिनुहोस्');
        treatments.push('३) ३ दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
      }
      if (classifications.includes('Severe Jaundice')) {
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar');
        treatments.push('Keep infant warm');
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Give fluid for severe dehydration (Plan C)');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('If child can drink, give ORS by mouth while drip is being set up');
        treatments.push('Give 100 ml/kg Ringer\'s Lactate (or Normal Saline)');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('Give fluid and food for some dehydration (Plan B)');
        treatments.push('Give 75 ml/kg of ORS in the clinic over 4 hours');
        treatments.push('Show mother how to give ORS solution');
        treatments.push('After 4 hours, reassess child and classify for dehydration');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('Treat diarrhea at home (Plan A)');
        treatments.push('Give extra fluid (as much as child will take)');
        treatments.push('Give Zinc Supplement for 10 days (2-6m: 10mg, >6m: 20mg)');
        treatments.push('Continue feeding');
        treatments.push('Advise mother when to return immediately');
      }
    } else {
      const weight = parseFloat(assessmentData.weight) || 0;
      if (classifications.includes('Very Severe Disease') || classifications.includes('Severe Pneumonia or Very Severe Disease') || classifications.includes('Severe Acute Malnutrition') || classifications.includes('Severe Complicated Measles')) {
        let gentDose = '';
        let ampDose = '';
        if (weight > 0) {
          gentDose = `${(weight * 5).toFixed(1)}mg IM`;
          ampDose = `${(weight * 50).toFixed(0)}mg IM`;
        }
        treatments.push(`Give first dose of appropriate antibiotic: Gentamicin (${gentDose}) and Ampicillin (${ampDose})`);
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar');
        treatments.push('Keep child warm');
      }
      if (classifications.includes('Pneumonia')) {
        let amoxDose = '';
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;

        if (weight >= 4 && weight < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (weight >= 6 && weight < 8) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (weight >= 8 && weight < 10) amoxDose = '250mg tab: 1.5 tab BD OR Syrup 125mg/5ml: 15 ml BD';
        else if (weight >= 10 && weight < 14) amoxDose = '250mg tab: 2 tab BD';
        else if (weight >= 14 && weight < 19) amoxDose = '250mg tab: 2.5 tab BD';
        else if (totalMonths >= 2 && totalMonths < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (totalMonths >= 6 && totalMonths < 12) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (totalMonths >= 12 && totalMonths < 36) amoxDose = '250mg tab: 2 tab BD';
        else if (totalMonths >= 36 && totalMonths <= 60) amoxDose = '250mg tab: 2.5 tab BD';
        else amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        
        if (assessmentData.hivStatus) {
          treatments.push(`Give first dose of Amoxicillin: ${amoxDose.split(' OR ')[0]}`);
          treatments.push('Refer URGENTLY to hospital (HIV exposed/infected)');
        } else if (!classifications.includes('Dysentery')) {
          treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
          treatments.push('Soothe the throat and relieve cough with safe remedy');
          treatments.push('Advise mother when to return immediately');
          treatments.push('Follow-up in 3 days');
        } else {
          treatments.push('Note: Amoxicillin not required as Ciprofloxacin is given for Dysentery');
          treatments.push('Soothe the throat and relieve cough with safe remedy');
          treatments.push('Advise mother when to return immediately');
          treatments.push('Follow-up in 3 days');
        }
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Give fluid for severe dehydration (Plan C)');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('If child can drink, give ORS by mouth while drip is being set up');
        treatments.push('Give 100 ml/kg Ringer\'s Lactate (or Normal Saline)');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('Give fluid and food for some dehydration (Plan B)');
        treatments.push('Give 75 ml/kg of ORS in the clinic over 4 hours');
        treatments.push('Show mother how to give ORS solution');
        treatments.push('After 4 hours, reassess child and classify for dehydration');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('Treat diarrhea at home (Plan A)');
        treatments.push('Give extra fluid (as much as child will take)');
        treatments.push('Give Zinc Supplement for 10 days (2-6m: 10mg, >6m: 20mg)');
        treatments.push('Continue feeding');
        treatments.push('Advise mother when to return immediately');
      }
      if (classifications.includes('Severe Persistent Diarrhea')) {
        treatments.push('Treat dehydration before referral');
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Persistent Diarrhea')) {
        treatments.push('Advise on feeding for persistent diarrhea');
        treatments.push('Give Vitamin A');
        treatments.push('Follow-up in 5 days');
      }
      if (classifications.includes('Dysentery')) {
        const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
        let ciproDose = '';
        
        if (ageInMonths < 6) {
          ciproDose = '१/२ चक्की (1/2 tab) दिनको २ पटक, ३ दिनसम्म';
        } else {
          ciproDose = '१ चक्की (1 tab) दिनको २ पटक, ३ दिनसम्म';
        }
        
        treatments.push(`सिप्रोफ्लोक्सासिन (Ciprofloxacin 250mg): ${ciproDose}`);
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('हैजा (Haija)')) {
        let ciproDose = '';
        if (weight >= 4 && weight < 6) ciproDose = '१/४ चक्की (1/4 tab) दिनको २ पटक, ३ दिनसम्म (२-४ महिना)';
        else if (weight >= 6 && weight < 10) ciproDose = '१/२ चक्की (1/2 tab) दिनको २ पटक, ३ दिनसम्म (४-१२ महिना)';
        else if (weight >= 10 && weight <= 19) ciproDose = '१ चक्की (1 tab) दिनको २ पटक, ३ दिनसम्म (१२ महिना-५ वर्ष)';
        
        treatments.push(`हैजाको लागि सिप्रोफ्लोक्सासिन (Ciprofloxacin for Cholera): ${ciproDose}`);
      }
      if (classifications.includes('मलेरिया (Malaria)')) {
        let actDose = '';
        if (weight >= 5 && weight < 15) actDose = '1 tablet (20/120) once daily for 3 days';
        else if (weight >= 15 && weight < 25) actDose = '2 tablets (20/120) once daily for 3 days';
        
        treatments.push(`Give ACT for 3 days: ${actDose}`);
        treatments.push('Follow-up in 3 days if fever persists');
      }
      if (classifications.includes('Acute Ear Infection')) {
        let amoxDose = '';
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;

        if (weight >= 4 && weight < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (weight >= 6 && weight < 8) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (weight >= 8 && weight < 10) amoxDose = '250mg tab: 1.5 tab BD OR Syrup 125mg/5ml: 15 ml BD';
        else if (weight >= 10 && weight < 14) amoxDose = '250mg tab: 2 tab BD';
        else if (weight >= 14 && weight < 19) amoxDose = '250mg tab: 2.5 tab BD';
        else if (totalMonths >= 2 && totalMonths < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (totalMonths >= 6 && totalMonths < 12) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (totalMonths >= 12 && totalMonths < 36) amoxDose = '250mg tab: 2 tab BD';
        else if (totalMonths >= 36 && totalMonths <= 60) amoxDose = '250mg tab: 2.5 tab BD';
        else amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD'; // Default fallback
        
        if (!classifications.includes('Dysentery')) {
          treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
        } else {
          treatments.push('Note: Amoxicillin not required as Ciprofloxacin is given for Dysentery');
        }

        treatments.push('Dry the ear by wicking if there is discharge');
        treatments.push('Follow-up in 5 days');
      }
      if (classifications.includes('Severe Acute Malnutrition')) {
        // Already handled in the combined block above
      }
      if (classifications.includes('Severe Complicated Measles')) {
        treatments.push('Give Vitamin A');
        // Already handled in the combined block above
      }
      if (classifications.includes('Measles with Eye/Mouth Complications')) {
        treatments.push('Give Vitamin A');
        treatments.push('Apply Tetracycline eye ointment if eye complications');
        treatments.push('Treat mouth ulcers with Gentian Violet');
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Severe Anemia')) {
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Anemia')) {
        treatments.push('Give Iron/Folate');
        treatments.push('Give Mebendazole if child is 1 year or older');
        treatments.push('Advise mother on feeding');
        treatments.push('Follow-up in 14 days');
      }

      // Dehydration Plans
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Plan C: Start IV fluids immediately (Ringer\'s Lactate)');
        treatments.push('If child can drink, give ORS by mouth while drip is set up');
        treatments.push('Refer URGENTLY to hospital');
      } else if (classifications.includes('Some Dehydration')) {
        treatments.push('Plan B: Give ORS in clinic (75ml/kg over 4 hours)');
        treatments.push('Show mother how to give ORS');
        treatments.push('Give Zinc (10-14 days)');
        treatments.push('Reassess after 4 hours');
      } else if (classifications.includes('No Dehydration')) {
        treatments.push('Plan A: Give extra fluid, continue feeding');
        treatments.push('Give Zinc (10-14 days)');
        treatments.push('Advise mother when to return immediately');
      }

      // HIV Treatment
      if (classifications.includes('CONFIRMED HIV INFECTION (रातो)')) {
        treatments.push('Refer to ART Center for treatment');
        treatments.push('Start Cotrimoxazole Prophylaxis');
        treatments.push('Treat other infections');
      }
      if (classifications.includes('HIV EXPOSED (पहेँलो)')) {
        treatments.push('Start Cotrimoxazole Prophylaxis from 6 weeks of age');
        treatments.push('Test for HIV at 6 weeks (PCR)');
        treatments.push('Follow-up regularly');
      }
      if (classifications.includes('SUSPECTED SYMPTOMATIC HIV (पहेँलो)') || classifications.includes('HIV TEST REQUIRED (पहेँलो)')) {
        treatments.push('Refer for HIV Testing and Counseling');
        treatments.push('Treat existing conditions');
      }

      // TB Treatment
      if (classifications.includes('POSSIBLE TB (पहेँलो)')) {
        treatments.push('Refer for TB investigation (Mantoux, X-ray, GeneXpert)');
        treatments.push('Assess for other causes of symptoms');
      }
      if (classifications.includes('LATENT TUBERCULOSIS INFECTION (पहेँलो)')) {
        treatments.push('Start Isoniazid Preventive Therapy (IPT)');
        treatments.push('Follow-up regularly');
      }

      // Paracetamol for high fever or ear pain/infection
      const temp = parseFloat(assessmentData.temperature) || 0;
      if (temp >= 38.5 || assessmentData.earPain || classifications.includes('Acute Ear Infection')) {
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;
        let pcmDose = '';
        
        // In Child module (2m-5y), we always give at least 5ml
        if (weight >= 14 || totalMonths >= 36) {
          pcmDose = '७.५ मि.लि. (7.5 ml) दिनको ४ पटक (QID)';
        } else {
          pcmDose = '५ मि.लि. (5 ml) दिनको ४ पटक (QID)';
        }
        
        const reason = (temp >= 38.5) ? 'उच्च ज्वरो' : 'कान दुखाई/संक्रमण';
        treatments.push(`${reason}को लागि प्यारासिटामोल (Paracetamol 125mg/5ml): ${pcmDose} (ज्वरो वा दुखाई निको नभएसम्म)`);
      }
    }
    return treatments;
  };

  const calculateZScore = () => {
    if (!assessmentData.weight || !currentPatient) return null;
    const weight = parseFloat(assessmentData.weight);
    
    // Calculate precise age in months
    const today = new Date();
    const birthDate = currentPatient.dobAd ? new Date(currentPatient.dobAd) : null;
    let ageMonths = (currentPatient.ageYears || 0) * 12 + (currentPatient.ageMonths || 0);
    
    if (birthDate) {
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      ageMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
    }

    // More granular WHO Weight-for-Age Z-score (WAZ) logic (Approximate Median and SD)
    const wazData: any = {
      0: { m: 3.3, s: 0.4 },
      1: { m: 4.5, s: 0.5 },
      2: { m: 5.6, s: 0.6 },
      3: { m: 6.4, s: 0.7 },
      4: { m: 7.0, s: 0.8 },
      5: { m: 7.5, s: 0.8 },
      6: { m: 7.9, s: 0.8 },
      9: { m: 8.9, s: 0.9 },
      12: { m: 9.6, s: 1.0 },
      15: { m: 10.3, s: 1.1 },
      18: { m: 10.9, s: 1.1 },
      21: { m: 11.5, s: 1.2 },
      24: { m: 12.2, s: 1.3 },
      30: { m: 13.3, s: 1.4 },
      36: { m: 14.3, s: 1.6 },
      42: { m: 15.3, s: 1.7 },
      48: { m: 16.3, s: 1.9 },
      54: { m: 17.3, s: 2.0 },
      60: { m: 18.3, s: 2.2 }
    };

    const ages = Object.keys(wazData).map(Number).sort((a, b) => a - b);
    
    // Linear interpolation for more accuracy
    let m, s;
    if (ageMonths <= 0) {
      m = wazData[0].m;
      s = wazData[0].s;
    } else if (ageMonths >= 60) {
      m = wazData[60].m;
      s = wazData[60].s;
    } else {
      const lowerAge = ages.filter(a => a <= ageMonths).pop() || 0;
      const upperAge = ages.find(a => a > ageMonths) || 60;
      const factor = (ageMonths - lowerAge) / (upperAge - lowerAge);
      
      m = wazData[lowerAge].m + factor * (wazData[upperAge].m - wazData[lowerAge].m);
      s = wazData[lowerAge].s + factor * (wazData[upperAge].s - wazData[lowerAge].s);
    }
    
    const zScore = (weight - m) / s;
    return zScore.toFixed(2);
  };

  const zScore = calculateZScore();
  const suggestedClassifications = getClassification();
  const suggestedNextVisit = getSuggestedNextVisit(suggestedClassifications);
  const suggestedTreatments = getSuggestedTreatment(suggestedClassifications);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <Baby className="text-primary-600" />
          CBIMNCI सेवा (CBIMNCI Service)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">नयाँ बिरामी खोज्नुहोस् (New Patient Search)</label>
            <form onSubmit={handleSearch} className="flex gap-2 relative">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="ID, नाम वा दर्ता नं."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <button type="submit" className="bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium shadow-sm text-sm">
                खोज्नुहोस्
              </button>

              {showSearchResults && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Results ({searchResults.length})</span>
                    <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={14} /></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map(patient => (
                      <div 
                        key={patient.id} 
                        onClick={() => {
                          selectPatient(patient);
                          setShowSearchResults(false);
                        }}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <p className="font-bold text-slate-800 text-sm">{patient.name}</p>
                        <p className="text-[10px] text-slate-500">{patient.uniquePatientId} | {patient.age}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">रेकर्ड भएका बिरामी खोज्नुहोस् (Existing Record Search)</label>
            <form onSubmit={handleExistingSearch} className="flex gap-2 relative">
              <div className="flex-1 relative">
                <History className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={existingSearchId}
                  onChange={(e) => setExistingSearchId(e.target.value)}
                  placeholder="रेकर्ड भएको नाम वा ID"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium shadow-sm text-sm">
                खोज्नुहोस्
              </button>

              {showExistingResults && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Found ({existingSearchResults.length})</span>
                    <button onClick={() => setShowExistingResults(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={14} /></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {existingSearchResults.map(record => {
                      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
                      return (
                        <div 
                          key={record.id} 
                          onClick={() => {
                            if (patient) selectPatient(patient);
                            setShowExistingResults(false);
                          }}
                          className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <p className="font-bold text-slate-800 text-sm">{patient?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">{record.uniquePatientId} | Last Visit: {record.visitDate}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {!currentPatient && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <History size={18} /> भर्खरैका रेकर्डहरू (Recent Records)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">मिति</th>
                  <th className="p-3">बिरामीको नाम</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">वर्गीकरण</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cbimnciRecords.length > 0 ? (
                  cbimnciRecords
                    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                    .slice(0, 10)
                    .map(record => {
                      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-3 font-medium text-primary-600">{record.visitDate}</td>
                          <td className="p-3 font-bold text-slate-800">{patient?.name || 'Unknown'}</td>
                          <td className="p-3 font-mono text-xs">{record.uniquePatientId}</td>
                          <td className="p-3">{record.diagnosis || '-'}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => {
                                if (window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                  onDeleteRecord(record.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">कुनै रेकर्ड भेटिएन</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <User size={18} /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
              </div>
            </div>

            {/* History Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <History size={18} /> उपचार इतिहास (History)
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId).length > 0 ? (
                  cbimnciRecords
                    .filter(r => r.uniquePatientId === currentPatient.uniquePatientId)
                    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                    .map(record => (
                      <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-primary-600">{record.visitDate}</p>
                            <p className="text-sm font-bold text-slate-800">{record.diagnosis || 'No Classification'}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => selectRecordForEdit(record)}
                              className="p-1.5 text-primary-500 hover:bg-primary-50 rounded-lg"
                              title="Edit Record"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                  onDeleteRecord(record.id);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                          {record.chiefComplaints || 'No complaints recorded'}
                        </p>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-slate-400 italic text-sm">
                    कुनै इतिहास भेटिएन
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-lg">CBIMNCI परीक्षण फारम</h3>
                <div className="flex items-center gap-2">
                  {moduleType === 'Infant' ? (
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                      Infant (up to 2m)
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white shadow-md">
                      Child (2m - 5y)
                    </div>
                  )}
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full ml-2">
                    {new NepaliDate().format('YYYY-MM-DD')}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-bold text-indigo-800 text-sm mb-1 flex items-center gap-2">
                      <Baby size={16} /> तौल (Weight in kg)
                    </h4>
                    <p className="text-xs text-indigo-600">औषधिको मात्रा (Dose) हिसाब गर्न तौल अनिवार्य छ।</p>
                  </div>
                  <div className="w-48">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="तौल (kg) राख्नुहोस्"
                      value={assessmentData.weight || ''} 
                      onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} 
                      className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-bold text-indigo-900"
                    />
                  </div>
                </div>

                {renderAssessmentForm()}

                {suggestedClassifications.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Suggested Classifications (Booklet Based)</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestedClassifications.map((cls, idx) => (
                        <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          cls.includes('Severe') || cls.includes('PSBI') || cls.includes('Disease') || cls.includes('CONFIRMED') || cls.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण')
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : cls.includes('Some') || cls.includes('Pneumonia') || cls.includes('Jaundice') || cls.includes('POSSIBLE') || cls.includes('LATENT') || cls.includes('EXPOSED') || cls.includes('SUSPECTED') || cls.includes('REQUIRED') || cls.includes('Local Bacterial Infection')
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {cls}
                        </span>
                      ))}
                    </div>
                    {suggestedNextVisit && (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-bold">Suggested Follow-up:</span> {suggestedNextVisit}
                      </p>
                    )}
                    {suggestedTreatments.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Treatment:</p>
                        {suggestedTreatments.map((t, idx) => (
                          <p key={idx} className="text-xs text-slate-700 flex items-start gap-1">
                            <span className="text-primary-500">•</span> {t}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => setCbimnciData({...cbimnciData, diagnosis: suggestedClassifications.join(', ')})}
                        className="text-xs bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                      >
                        Apply to Classification
                      </button>
                      <button 
                        onClick={() => {
                          const newItems = suggestedTreatments.map((t, idx) => {
                            // Try to extract medicine name and dose
                            // Pattern: "Give [Medicine] for [Duration]: [Dose]" or "Give [Medicine]: [Dose]"
                            let medicineName = t;
                            let dosage = '';
                            let duration = '';

                            if (t.includes(':')) {
                              const parts = t.split(':');
                              const leftPart = parts[0].replace('Give ', '').trim();
                              dosage = parts[1].trim();
                              
                              if (leftPart.includes(' for ')) {
                                const subParts = leftPart.split(' for ');
                                medicineName = subParts[0].trim();
                                duration = subParts[1].trim();
                              } else {
                                medicineName = leftPart;
                              }
                            } else if (t.startsWith('Give ')) {
                              medicineName = t.replace('Give ', '').trim();
                            }

                            return {
                              id: `suggested-${Date.now()}-${idx}`,
                              medicineName,
                              dosage,
                              frequency: dosage.includes('twice daily') ? '2 times a day' : (dosage.includes('once daily') ? '1 time a day' : ''),
                              duration,
                              instructions: ''
                            };
                          });
                          setPrescriptionItems([...prescriptionItems, ...newItems]);
                        }}
                        className="text-xs bg-white border border-primary-300 text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                      >
                        Apply to Prescription
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                  <textarea
                    value={cbimnciData.chiefComplaints}
                    onChange={(e) => setCbimnciData({...cbimnciData, chiefComplaints: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">वर्गीकरण (Classification)</label>
                    <textarea
                      value={cbimnciData.diagnosis}
                      onChange={(e) => setCbimnciData({...cbimnciData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                      placeholder="वर्गीकरण लेख्नुहोस्..."
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                    <div className="relative mb-2">
                       <input
                         type="text"
                         value={investigationSearch}
                         onChange={(e) => {
                           setInvestigationSearch(e.target.value);
                           setShowInvestigationResults(true);
                         }}
                         placeholder="Search Service..."
                         className="w-full p-2 pl-8 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                       />
                       <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       {showInvestigationResults && investigationSearch && (
                         <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                           {filteredServices.map(service => (
                             <div 
                               key={service.id}
                               onClick={() => handleAddInvestigation(service.serviceName)}
                               className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                             >
                               {service.serviceName}
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    <textarea
                      value={cbimnciData.investigation}
                      onChange={(e) => setCbimnciData({...cbimnciData, investigation: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <Pill size={18} className="text-primary-600" /> औषधि सिफारिस (Prescription)
                    </h4>
                    <button 
                      onClick={() => setShowPrescriptionForm(true)}
                      className="text-sm bg-white border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={16} /> औषधि थप्नुहोस्
                    </button>
                  </div>

                  {showPrescriptionForm && (
                    <div className="bg-white p-4 rounded-lg border border-primary-100 mb-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                          <Input 
                            label="औषधिको नाम" 
                            value={currentPrescription.medicineName} 
                            onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})} 
                            list="medicine-list"
                          />
                          <datalist id="medicine-list">
                            {medicineSuggestions.map((med, idx) => (
                              <option key={idx} value={med} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <Input label="मात्रा (Dosage)" value={currentPrescription.dosage} onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})} list="dosage-list" />
                          <datalist id="dosage-list">
                            {dosageSuggestions.map((d, i) => <option key={i} value={d} />)}
                          </datalist>
                        </div>
                        <div>
                          <Input label="पटक (Frequency)" value={currentPrescription.frequency} onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})} list="frequency-list" />
                          <datalist id="frequency-list">
                            {frequencySuggestions.map((f, i) => <option key={i} value={f} />)}
                          </datalist>
                        </div>
                        <Input label="अवधि (Duration)" value={currentPrescription.duration} onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(false)} className="px-4 py-2 text-slate-500 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {prescriptionItems.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item) => (
                            <tr key={item.id}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3">
                                <button onClick={() => handleRemovePrescription(item.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                  <textarea
                    value={cbimnciData.advice}
                    onChange={(e) => setCbimnciData({...cbimnciData, advice: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isRefer"
                      checked={cbimnciData.isRefer}
                      onChange={(e) => setCbimnciData({...cbimnciData, isRefer: e.target.checked})}
                      className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isRefer" className="text-sm font-bold text-slate-700 cursor-pointer">रेफर गरिएको (Referral)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isDeath"
                      checked={cbimnciData.isDeath}
                      onChange={(e) => setCbimnciData({...cbimnciData, isDeath: e.target.checked})}
                      className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="isDeath" className="text-sm font-bold text-red-700 cursor-pointer">मृत्यु भएको (Death)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isFollowup"
                      checked={cbimnciData.isFollowup}
                      onChange={(e) => setCbimnciData({...cbimnciData, isFollowup: e.target.checked})}
                      className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="isFollowup" className="text-sm font-bold text-amber-700 cursor-pointer">फलोअप (Followup)</label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">फलोअप (Follow-up Days)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={cbimnciData.followupDays || ''}
                        onChange={(e) => setCbimnciData({...cbimnciData, followupDays: parseInt(e.target.value) || 0})}
                        className="w-20 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        placeholder="दिन"
                      />
                      <span className="text-xs text-slate-500 font-bold">दिन पछि</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-4 pt-4 border-t">
                  <button onClick={handleRestore} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 shadow-sm font-medium border border-amber-200 w-full sm:w-auto justify-center">
                    <History size={18} /> Restore Previous
                  </button>
                  <button onClick={() => {
                    setEditingRecordId(null);
                    setCbimnciData({
                      chiefComplaints: '',
                      diagnosis: '',
                      investigation: '',
                      prescriptions: [],
                      advice: '',
                      nextVisitDate: '',
                      isRefer: false,
                      isDeath: false,
                      isFollowup: false,
                      followupDays: 0
                    });
                    setAssessmentData({
                      dangerSigns: [],
                      localInfection: [],
                      jaundiceSigns: [],
                      dehydrationSigns: [],
                      feedingProblems: [],
                      generalDangerSigns: [],
                      respiratorySigns: [],
                      feverSigns: [],
                      nutritionSigns: [],
                      immunization: [],
                      breathingRate: '',
                      temperature: '',
                      diarrheaDays: '',
                      weight: '',
                      muac: '',
                      coughDays: '',
                      feverDays: '',
                      earDischargeDays: '',
                      malariaRisk: 'None',
                      pallor: '',
                      attachment: '',
                      suckling: '',
                      earPain: false,
                      earDischarge: false,
                      mastoidSwelling: false,
                      bloodInStool: false,
                      hivStatus: false,
                      parotidSwellingOrLymphNodes: false,
                      hivTestStatus: '',
                      motherHivStatus: '',
                      isBreastfeeding: false,
                      stoppedBreastfeedingLessThan3Months: false,
                      tbContact: false,
                      tbSymptoms: [],
                      tbDiagnosis: false,
                      weightLoss: false,
                      fatigue: false
                    });
                    setPrescriptionItems([]);
                  }} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 shadow-sm font-medium border border-slate-200 w-full sm:w-auto justify-center">
                    <Trash2 size={18} /> Clear Form
                  </button>
                  <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center">
                    <Printer size={18} /> प्रिन्ट (Print)
                  </button>
                  <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium w-full sm:w-auto justify-center">
                    <Save size={18} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute -top-[9999px] left-0">
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-300">
                <Baby size={32} className="text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentUser?.organizationName || 'स्वास्थ्य संस्थाको नाम'}</h1>
                <p className="text-sm text-slate-600">CBIMNCI Department</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new NepaliDate().format('YYYY-MM-DD')}</p>
            </div>
          </div>

          {currentPatient && (
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
              <div><span className="font-bold text-slate-600">Name:</span> {currentPatient.name}</div>
              <div><span className="font-bold text-slate-600">Age/Sex:</span> {currentPatient.age} / {currentPatient.gender}</div>
              <div><span className="font-bold text-slate-600">PID:</span> {currentPatient.uniquePatientId}</div>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1">
                Assessment ({moduleType === 'Infant' ? 'Infant up to 2m' : 'Child 2m-5y'})
              </h4>
              <div className="grid grid-cols-1 gap-y-4 text-sm">
                {suggestedClassifications.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2">
                      <span className="font-bold">Classifications:</span> {suggestedClassifications.join(', ')}
                    </div>
                    {suggestedTreatments.length > 0 && (
                      <div className="text-xs text-slate-600 italic">
                        <span className="font-bold not-italic">Recommended Actions:</span> {suggestedTreatments.join('; ')}
                      </div>
                    )}
                    {suggestedNextVisit && (
                      <div className="mt-2 text-xs font-bold text-primary-700">
                        Follow-up suggested in: {suggestedNextVisit}
                      </div>
                    )}
                  </div>
                )}
                {moduleType === 'Infant' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="font-bold">Danger Signs:</span> {assessmentData.dangerSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Breathing Rate:</span> {assessmentData.breathingRate || '-'} bpm</div>
                      <div><span className="font-bold">Temperature:</span> {assessmentData.temperature || '-'} °C</div>
                      <div><span className="font-bold">Local Infection:</span> {assessmentData.localInfection?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Jaundice:</span> {assessmentData.jaundiceSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Diarrhea:</span> {assessmentData.diarrheaDays ? `${assessmentData.diarrheaDays} days` : '-'} {assessmentData.bloodInStool ? '(Blood)' : ''}</div>
                      <div><span className="font-bold">Dehydration:</span> {assessmentData.dehydrationSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Weight:</span> {assessmentData.weight || '-'} kg</div>
                      <div><span className="font-bold">Feeding:</span> {assessmentData.feedingProblems?.join(', ') || 'Normal'}</div>
                      <div><span className="font-bold">Attachment/Suckling:</span> {assessmentData.attachment || '-'}/{assessmentData.suckling || '-'}</div>
                      <div><span className="font-bold">Immunization:</span> {assessmentData.immunization?.join(', ') || 'None'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="font-bold">General Danger Signs:</span> {assessmentData.generalDangerSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Cough/Breathing:</span> {assessmentData.coughDays ? `${assessmentData.coughDays} days` : '-'} {assessmentData.breathingRate ? `(${assessmentData.breathingRate} bpm)` : ''}</div>
                      <div><span className="font-bold">Respiratory Signs:</span> {assessmentData.respiratorySigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Diarrhea:</span> {assessmentData.diarrheaDays ? `${assessmentData.diarrheaDays} days` : '-'} {assessmentData.bloodInStool ? '(Blood)' : ''}</div>
                      <div><span className="font-bold">Dehydration:</span> {assessmentData.dehydrationSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Fever:</span> {assessmentData.temperature || '-'} °C ({assessmentData.feverDays || '0'} days)</div>
                      <div><span className="font-bold">Malaria Risk:</span> {assessmentData.malariaRisk || '-'}</div>
                      <div><span className="font-bold">Fever Signs:</span> {assessmentData.feverSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Ear Problem:</span> {assessmentData.earPain ? 'Pain' : ''} {assessmentData.earDischarge ? `Discharge (${assessmentData.earDischargeDays}d)` : ''} {assessmentData.mastoidSwelling ? 'Mastoid Swelling' : ''}</div>
                      <div><span className="font-bold">Nutrition:</span> {assessmentData.weight || '-'}kg, MUAC: {assessmentData.muac || '-'}mm, Pallor: {assessmentData.pallor || '-'}</div>
                      <div><span className="font-bold">Immunization:</span> {assessmentData.immunization?.join(', ') || 'None'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {cbimnciData.chiefComplaints && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Chief Complaints</h4>
                <p className="text-sm whitespace-pre-wrap">{cbimnciData.chiefComplaints}</p>
              </div>
            )}
            
            {/* Growth Monitoring Chart */}
            <div className="border border-slate-300 p-4 rounded-lg">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Growth Monitoring Chart</h4>
              <img 
                src={currentPatient?.gender === 'Male' ? growthCharts.Male : growthCharts.Female}
                alt="Growth Monitoring Chart" 
                className="w-full h-auto object-contain border border-slate-200 rounded"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Nutrition and Breastfeeding Advice */}
            <div className="border border-blue-300 p-4 rounded-lg bg-blue-50">
              <h4 className="font-bold text-blue-800 border-b border-blue-200 mb-2 pb-1">पोषण तथा स्तनपान सम्बन्धी सल्लाह (Nutrition & Breastfeeding Advice)</h4>
              
              {/* Feeding Chart */}
              <div className="mb-4">
                <h5 className="font-bold text-blue-700 text-sm mb-1">खाना सम्बन्धि तालिका (Feeding Chart)</h5>
                <img 
                  src="https://raw.githubusercontent.com/swastikkhatiwada/imnci-assets/main/feeding-chart.png" 
                  alt="Feeding Chart" 
                  className="w-full h-auto object-contain border border-blue-200 rounded"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Breastfeeding Advice for infants < 2 months */}
              {moduleType === 'Infant' && (
                <div className="flex gap-4 items-center">
                  <img 
                    src="https://picsum.photos/seed/breastfeeding/200/200" 
                    alt="Breastfeeding" 
                    className="w-24 h-24 rounded-full border border-blue-200"
                    referrerPolicy="no-referrer"
                  />
                  <ul className="text-sm text-blue-900 list-disc pl-5 space-y-1">
                    <li>शिशुलाई ६ महिनासम्म आमाको दूध मात्र खुवाउनुहोस्।</li>
                    <li>दिनमा कम्तिमा ८-१२ पटक स्तनपान गराउनुहोस्।</li>
                    <li>शिशुले दूध राम्रोसँग चुसेको सुनिश्चित गर्नुहोस्।</li>
                    <li>आमाले पोषिलो खाना र प्रशस्त पानी पिउनुपर्छ।</li>
                  </ul>
                </div>
              )}
            </div>

            {cbimnciData.diagnosis && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Classification</h4>
                <p className="text-sm whitespace-pre-wrap">{cbimnciData.diagnosis}</p>
              </div>
            )}
          </div>

          {prescriptionItems.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-slate-800 border-b-2 border-slate-800 mb-4 pb-1">Prescription</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-2 font-bold">Medicine</th>
                    <th className="py-2 font-bold">Dosage</th>
                    <th className="py-2 font-bold">Freq.</th>
                    <th className="py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptionItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3">{item.medicineName}</td>
                      <td className="py-3">{item.dosage}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto pt-8">
            <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-400">Printed on: {new Date().toLocaleString()}</div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 w-48 mb-2"></div>
                <p className="text-sm font-bold text-slate-700">Medical Officer Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
