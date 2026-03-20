
import React, { useMemo, useState } from 'react';
import { PariwarSewaRecord, OrganizationSettings } from '../types';
import { Printer, FileDown, Calendar, Building2 } from 'lucide-react';

interface FamilyPlanningReportProps {
  records: PariwarSewaRecord[];
  settings: OrganizationSettings;
  fiscalYear: string;
}

export const FamilyPlanningReport: React.FC<FamilyPlanningReportProps> = ({ records, settings, fiscalYear }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const months = [
    'All', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत', 'वैशाख', 'जेठ', 'असार'
  ];

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedMonth === 'All') return true;
      return r.dateBs.includes(selectedMonth);
    });
  }, [records, selectedMonth]);

  const parseAge = (ageStr: string): number => {
    const age = parseInt(ageStr);
    return isNaN(age) ? 0 : age;
  };

  const getStats = (method: string) => {
    const methodRecords = filteredRecords.filter(r => r.tempMethod === method);
    
    const newUnder20 = methodRecords.filter(r => r.userType === 'New' && parseAge(r.age) < 20).length;
    const newOver20 = methodRecords.filter(r => r.userType === 'New' && parseAge(r.age) >= 20).length;
    const current = methodRecords.filter(r => r.userType === 'Current').length;
    const discontinued = methodRecords.filter(r => r.userType === 'Discontinued').length;
    const totalQuantity = methodRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);

    return { newUnder20, newOver20, current, discontinued, totalQuantity };
  };

  const tempMethods = [
    { label: 'कण्डम', value: 'Condom', unit: 'गोटा' },
    { label: 'आकस्मिक गर्भनिरोधक चक्की', value: 'Emergency Contraceptive', unit: 'डोज' },
    { label: 'पिल्स', value: 'Pills', unit: 'साइकल' },
    { label: 'डिपो', value: 'Depo', unit: 'भायल' },
    { label: 'साया प्रेस', value: 'Sayana Press', unit: 'डोज' },
    { label: 'आई. यु. सी. डी.', value: 'IUCD', unit: 'सेट' },
    { label: 'इम्प्लान्ट (५ वर्ष अवधिको)', value: 'Implant 5 yrs', unit: 'सेट' },
    { label: 'इम्प्लान्ट (३ वर्ष अवधिको)', value: 'Implant 3 yrs', unit: 'सेट' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <Calendar size={18} className="text-primary-600" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm font-bold text-slate-700 focus:outline-none bg-transparent"
            >
              {months.map(m => <option key={m} value={m}>{m === 'All' ? 'सबै महिना' : m}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all shadow-sm">
            <Printer size={18} /> प्रिन्ट गर्नुहोस्
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-xl font-bold font-nepali">{settings.orgNameNepali}</h1>
          <h2 className="text-lg font-bold font-nepali">परिवार नियोजन कार्यक्रम प्रतिवेदन</h2>
          <p className="text-sm text-slate-500 font-nepali">आ.व. {fiscalYear} | महिना: {selectedMonth === 'All' ? 'सबै' : selectedMonth}</p>
        </div>

        <div className="space-y-8">
          {/* Table 1: Temporary Methods */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">८. परिवार नियोजन कार्यक्रम</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">अस्थायी साधन</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">नयाँ प्रयोगकर्ता</th>
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">हाल अपनाई रहेका</th>
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">सेवामा नियमित नभएका</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">साधन वितरण</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali text-xs">{'<'} २० वर्ष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">{'≥'} २० वर्ष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">इकाई</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">परिमाण</th>
                  </tr>
                </thead>
                <tbody>
                  {tempMethods.map((m, idx) => {
                    const stats = getStats(m.value);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 p-2 font-nepali">{m.label}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.newUnder20 || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.newOver20 || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.current || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.discontinued || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center font-nepali text-xs">{m.unit}</td>
                        <td className="border border-slate-300 p-2 text-center">{stats.totalQuantity || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Table 2: New Users by Institution/Location */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">नयाँ प्रयोगकर्ता (संस्था र स्थान अनुसार)</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th rowSpan={2} className="border border-slate-300 p-2 font-nepali">गन्तव्य/संस्था</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">स्वास्थ्य संस्था</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">शिविर</th>
                    <th colSpan={2} className="border border-slate-300 p-2 font-nepali">हाल अपनाईरहेका</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">महिला</th>
                    <th className="border border-slate-300 p-2 font-nepali text-xs">पुरुष</th>
                  </tr>
                </thead>
                <tbody>
                  {['Government', 'Non-Government'].map((inst, idx) => {
                    const instRecords = filteredRecords.filter(r => r.institutionType === inst);
                    const hf_female = instRecords.filter(r => r.location === 'Health Facility' && r.userType === 'New' && r.permMethod?.includes('Female')).length;
                    const hf_male = instRecords.filter(r => r.location === 'Health Facility' && r.userType === 'New' && r.permMethod?.includes('Male')).length;
                    const camp_female = instRecords.filter(r => r.location === 'Camp' && r.userType === 'New' && r.permMethod?.includes('Female')).length;
                    const camp_male = instRecords.filter(r => r.location === 'Camp' && r.userType === 'New' && r.permMethod?.includes('Male')).length;
                    const current_female = instRecords.filter(r => r.userType === 'Current' && r.permMethod?.includes('Female')).length;
                    const current_male = instRecords.filter(r => r.userType === 'Current' && r.permMethod?.includes('Male')).length;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 p-2 font-nepali">{inst === 'Government' ? 'सरकारी' : 'गैर सरकारी'}</td>
                        <td className="border border-slate-300 p-2 text-center">{hf_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{hf_male || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{camp_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{camp_male || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{current_female || '-'}</td>
                        <td className="border border-slate-300 p-2 text-center">{current_male || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Table 3: Postpartum FP */}
          <section>
            <h3 className="font-bold text-slate-800 mb-3 font-nepali">सुत्केरी पश्चात परिवार नियोजन सेवा</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-nepali">विवरण</th>
                    <th className="border border-slate-300 p-2 font-nepali">आई. यु. सी. डी.</th>
                    <th className="border border-slate-300 p-2 font-nepali">इम्प्लान्ट</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-nepali">सुत्केरी भएको ४८ घण्टा भित्र</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === 'Within 48 hrs' && r.tempMethod === 'IUCD').length || '-'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === 'Within 48 hrs' && r.tempMethod?.includes('Implant')).length || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-nepali">४८ घण्टा देखि एक वर्ष भित्र</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === '48 hrs to 1 yr' && r.tempMethod === 'IUCD').length || '-'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {filteredRecords.filter(r => r.postPartumFP === '48 hrs to 1 yr' && r.tempMethod?.includes('Implant')).length || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-between items-end">
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">तयार गर्ने</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">रुजु गर्ने</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs font-nepali">स्वीकृत गर्ने</p>
          </div>
        </div>
      </div>
    </div>
  );
};
