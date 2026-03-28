
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, Baby, HeartHandshake, Users } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { GarbhawotiRecord, PrasutiRecord, OrganizationSettings } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MCHReportProps {
  currentFiscalYear: string;
  garbhawotiRecords: GarbhawotiRecord[];
  prasutiRecords: PrasutiRecord[];
  generalSettings: OrganizationSettings;
}

const nepaliMonthOptions = [
  { id: '01', value: '01', label: 'बैशाख (Baishakh)' },
  { id: '02', value: '02', label: 'जेठ (Jestha)' },
  { id: '03', value: '03', label: 'असार (Ashad)' },
  { id: '04', value: '04', label: 'साउन (Shrawan)' },
  { id: '05', value: '05', label: 'भदौ (Bhadra)' },
  { id: '06', value: '06', label: 'असोज (Ashwin)' },
  { id: '07', value: '07', label: 'कार्तिक (Kartik)' },
  { id: '08', value: '08', label: 'मंसिर (Mangsir)' },
  { id: '09', value: '09', label: 'पुष (Poush)' },
  { id: '10', value: '10', label: 'माघ (Magh)' },
  { id: '11', value: '11', label: 'फागुन (Falgun)' },
  { id: '12', value: '12', label: 'चैत्र (Caitra)' },
];

export const MCHReport: React.FC<MCHReportProps> = ({ 
  currentFiscalYear, 
  garbhawotiRecords, 
  prasutiRecords, 
  generalSettings 
}) => {
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  const reportStats = useMemo(() => {
    const stats = {
      anc: {
        first: { under20: 0, over20: 0 },
        within12Weeks: { under20: 0, over20: 0 },
        fourTimes: { under20: 0, over20: 0 },
        eightTimes: { under20: 0, over20: 0 },
        rousg: { under20: 0, over20: 0 },
      },
      delivery: {
        sba: { under20: 0, over20: 0 },
        shp: { under20: 0, over20: 0 },
        other: { under20: 0, over20: 0 },
        home: { under20: 0, over20: 0 },
      },
      deliveryType: {
        spontaneous: 0,
        vacuum: 0,
        cs: 0,
      },
      presentation: {
        cephalic: 0,
        shoulder: 0,
        breech: 0,
      }
    };

    // Filter records by fiscal year and month
    const filteredANC = garbhawotiRecords.filter(r => 
      r.fiscalYear === selectedFiscalYear && 
      r.ancDate.split('-')[1] === selectedMonth
    );

    const filteredPrasuti = prasutiRecords.filter(r => 
      r.fiscalYear === selectedFiscalYear && 
      r.deliveryDate.split('-')[1] === selectedMonth
    );

    // Group ANC visits by woman (using name and address as proxy for unique ID)
    const ancByWoman: Record<string, GarbhawotiRecord[]> = {};
    garbhawotiRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(r => {
        const key = `${r.name}-${r.address}`;
        if (!ancByWoman[key]) ancByWoman[key] = [];
        ancByWoman[key].push(r);
      });

    // Process ANC Stats
    Object.values(ancByWoman).forEach(visits => {
      // Sort visits by date
      const sortedVisits = [...visits].sort((a, b) => a.ancDate.localeCompare(b.ancDate));
      const firstVisit = sortedVisits[0];
      
      // Only count if the first visit happened in the selected month
      if (firstVisit.ancDate.split('-')[1] === selectedMonth) {
        const isUnder20 = firstVisit.age < 20;
        if (isUnder20) stats.anc.first.under20++;
        else stats.anc.first.over20++;

        // Check if within 12 weeks of LMP
        if (firstVisit.lmp && firstVisit.ancDate) {
            try {
                // Simplified check: if month difference is <= 3
                const lmpParts = firstVisit.lmp.split('-');
                const ancParts = firstVisit.ancDate.split('-');
                const lmpYear = parseInt(lmpParts[0]);
                const lmpMonth = parseInt(lmpParts[1]);
                const ancYear = parseInt(ancParts[0]);
                const ancMonth = parseInt(ancParts[1]);
                
                const monthDiff = (ancYear - lmpYear) * 12 + (ancMonth - lmpMonth);
                if (monthDiff <= 3) {
                    if (isUnder20) stats.anc.within12Weeks.under20++;
                    else stats.anc.within12Weeks.over20++;
                }
            } catch (e) {}
        }
      }

      // Check for 4th and 8th visits in the selected month
      visits.forEach((v, index) => {
          if (v.ancDate.split('-')[1] === selectedMonth) {
              const isUnder20 = v.age < 20;
              if (index === 3) { // 4th visit
                  if (isUnder20) stats.anc.fourTimes.under20++;
                  else stats.anc.fourTimes.over20++;
              }
              if (index === 7) { // 8th visit
                  if (isUnder20) stats.anc.eightTimes.under20++;
                  else stats.anc.eightTimes.over20++;
              }
          }
      });
    });

    // Process Delivery Stats
    filteredPrasuti.forEach(r => {
      // Find corresponding ANC record to get age
      const ancRecord = garbhawotiRecords.find(g => g.id === r.garbhawotiId);
      const age = ancRecord ? ancRecord.age : 30; // Default to 30 if not found
      const isUnder20 = age < 20;

      const place = r.deliveryPlace.toLowerCase();
      const by = r.deliveredBy.toLowerCase();

      if (place.includes('home')) {
          if (isUnder20) stats.delivery.home.under20++;
          else stats.delivery.home.over20++;
      } else if (by.includes('sba') || by.includes('anm')) {
          if (isUnder20) stats.delivery.sba.under20++;
          else stats.delivery.sba.over20++;
      } else if (place.includes('shp') || place.includes('health post')) {
          if (isUnder20) stats.delivery.shp.under20++;
          else stats.delivery.shp.over20++;
      } else {
          if (isUnder20) stats.delivery.other.under20++;
          else stats.delivery.other.over20++;
      }

      // Delivery Type
      const outcome = r.deliveryOutcome.toLowerCase();
      if (outcome.includes('c/s') || outcome.includes('cesarean')) {
          stats.deliveryType.cs++;
      } else if (outcome.includes('vacuum') || outcome.includes('forceps')) {
          stats.deliveryType.vacuum++;
      } else {
          stats.deliveryType.spontaneous++;
      }
    });

    return stats;
  }, [garbhawotiRecords, prasutiRecords, selectedFiscalYear, selectedMonth]);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';

  const handlePrint = () => {
    const printContent = document.getElementById('mch-report-print-content');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MCH Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { margin: 10mm; size: A4 portrait; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 20px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
          thead th { background-color: #f3f4f6; font-weight: bold; }
          .text-left { text-align: left; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 800);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-40"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
          <div className="w-48"><Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} /></div>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm"><Printer size={18} /> प्रिन्ट</button>
      </div>

      <div id="mch-report-print-content" className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto">
        <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold mt-1">७. मातृ तथा नवजात शिशु स्वास्थ्य कार्यक्रम</h2>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-600">
                <span>आ.व.: {selectedFiscalYear}</span>
                <span>महिना: {currentMonthLabel}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 7.1 Garbhawati Janch */}
            <div>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-left">गर्भवती जाँच (पटक)</th>
                            <th colSpan={2}>महिलाको संख्या</th>
                        </tr>
                        <tr>
                            <th>{'<'} २० वर्ष</th>
                            <th>≥ २० वर्ष</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="text-left">पहिलो (जुनसुकै समयको)</td><td>{reportStats.anc.first.under20}</td><td>{reportStats.anc.first.over20}</td></tr>
                        <tr><td className="text-left">१२ हप्ता सम्म</td><td>{reportStats.anc.within12Weeks.under20}</td><td>{reportStats.anc.within12Weeks.over20}</td></tr>
                        <tr><td className="text-left">४ पटक (१६, २०-२४, ३२ र ३६ हप्ता)</td><td>{reportStats.anc.fourTimes.under20}</td><td>{reportStats.anc.fourTimes.over20}</td></tr>
                        <tr><td className="text-left">८ पटक (प्रोटोकल अनुसार)</td><td>{reportStats.anc.eightTimes.under20}</td><td>{reportStats.anc.eightTimes.over20}</td></tr>
                        <tr><td className="text-left">पहिलो पटक ROUSG गरेका</td><td>{reportStats.anc.rousg.under20}</td><td>{reportStats.anc.rousg.over20}</td></tr>
                    </tbody>
                </table>

                <table className="w-full mt-4">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-left">प्रसूति सेवा</th>
                            <th colSpan={2}>महिलाको संख्या</th>
                        </tr>
                        <tr>
                            <th>{'<'} २० वर्ष</th>
                            <th>≥ २० वर्ष</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="text-left">दक्ष प्रसुतिकर्मीबाट (SBA trained ANM)</td><td>{reportStats.delivery.sba.under20}</td><td>{reportStats.delivery.sba.over20}</td></tr>
                        <tr><td className="text-left">दक्ष स्वास्थ्यकर्मीबाट (SHP)</td><td>{reportStats.delivery.shp.under20}</td><td>{reportStats.delivery.shp.over20}</td></tr>
                        <tr><td className="text-left">अन्य स्वास्थ्यकर्मीबाट</td><td>{reportStats.delivery.other.under20}</td><td>{reportStats.delivery.other.over20}</td></tr>
                        <tr><td className="text-left">घरमा प्रसूति संख्या</td><td>{reportStats.delivery.home.under20}</td><td>{reportStats.delivery.home.over20}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* 7.3 Delivery Type & Presentation */}
            <div>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-left">प्रसूतिको किसिम</th>
                            <th colSpan={3}>Foetal Presentation</th>
                        </tr>
                        <tr>
                            <th>Cephalic</th>
                            <th>Shoulder</th>
                            <th>Breech</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="text-left">सामान्य (Spontaneous)</td>
                            <td>{reportStats.deliveryType.spontaneous}</td>
                            <td>0</td>
                            <td>0</td>
                        </tr>
                        <tr>
                            <td className="text-left">भ्याकुम/फोरसेप</td>
                            <td>{reportStats.deliveryType.vacuum}</td>
                            <td>0</td>
                            <td>0</td>
                        </tr>
                        <tr>
                            <td className="text-left">शल्यक्रिया (C/S)</td>
                            <td>{reportStats.deliveryType.cs}</td>
                            <td>0</td>
                            <td>0</td>
                        </tr>
                    </tbody>
                </table>

                {/* Placeholder for other tables as per HMIS 7 */}
                <div className="mt-4 p-4 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500">
                    अन्य तथ्याङ्कहरू (Complications, Deaths, Abortion) उपलब्ध रेकर्डहरू अनुसार थपिनेछन्।
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
            <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
            <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};
