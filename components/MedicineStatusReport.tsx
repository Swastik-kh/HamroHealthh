
import React, { useMemo } from 'react';
import { TBPatient, InventoryItem } from '../types';
import { calculatePatientRequirements, MedicineRequirement } from '../lib/medicineUtils';
import { Pill, Package, AlertTriangle, CheckCircle, Info, Database, User, Trash2 } from 'lucide-react';

interface MedicineStatusReportProps {
  patients: TBPatient[];
  inventory: InventoryItem[];
  onDeletePatient?: (id: string) => void;
}

export const MedicineStatusReport: React.FC<MedicineStatusReportProps> = ({ patients, inventory, onDeletePatient }) => {
  const activePatients = useMemo(() => 
    patients.filter(p => p.status === 'Active' || !p.status), 
    [patients]
  );

  const handleDelete = (id: string, name: string) => {
    if (onDeletePatient && window.confirm(`${name} को सम्पूर्ण विवरण हटाउन चाहनुहुन्छ?`)) {
      onDeletePatient(id);
    }
  };

  const patientRequirements = useMemo(() => {
    return activePatients.map(patient => ({
      patient,
      requirements: calculatePatientRequirements(patient, inventory)
    }));
  }, [activePatients, inventory]);

  const aggregateRequirements = useMemo(() => {
    const aggregate: Record<string, { totalNeeded: number, totalRemaining: number, stock: number }> = {};
    
    patientRequirements.forEach(({ requirements }) => {
      requirements.forEach(req => {
        if (!aggregate[req.itemName]) {
          aggregate[req.itemName] = { totalNeeded: 0, totalRemaining: 0, stock: req.availableStock };
        }
        aggregate[req.itemName].totalNeeded += req.totalNeeded;
        aggregate[req.itemName].totalRemaining += req.remainingNeeded;
      });
    });
    
    return aggregate;
  }, [patientRequirements]);

  return (
    <div className="space-y-8 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Pill className="text-blue-600" />
          औषधि अवस्था विवरण (Medicine Status Report)
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Pill size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">सक्रिय बिरामी (Active Patients)</p>
              <p className="text-2xl font-bold">{activePatients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <Package size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">कुल औषधि प्रकार (Medicine Types)</p>
              <p className="text-2xl font-bold">{Object.keys(aggregateRequirements).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">स्टक कम भएका औषधि (Low Stock)</p>
              <p className="text-2xl font-bold">
                {Object.values(aggregateRequirements).filter((a: any) => a.stock < a.totalRemaining).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Stock View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Database size={18} />
            कुल मौज्दात र आवश्यकता (Total Stock vs Requirement)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                <th className="px-6 py-3 font-medium">औषधिको नाम (Medicine)</th>
                <th className="px-6 py-3 font-medium">कुल आवश्यकता (Total Course)</th>
                <th className="px-6 py-3 font-medium">बाँकी आवश्यकता (Remaining)</th>
                <th className="px-6 py-3 font-medium">हालको मौज्दात (Current Stock)</th>
                <th className="px-6 py-3 font-medium">अवस्था (Status)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(aggregateRequirements).map(([name, data]: [string, any]) => {
                const isShortage = data.stock < data.totalRemaining;
                return (
                  <tr key={name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{name}</td>
                    <td className="px-6 py-4 text-gray-600">{data.totalNeeded}</td>
                    <td className="px-6 py-4 text-gray-600 font-semibold">{data.totalRemaining}</td>
                    <td className="px-6 py-4 text-gray-600">{data.stock}</td>
                    <td className="px-6 py-4">
                      {isShortage ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle size={12} />
                          अपुग (Shortage: {data.totalRemaining - data.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} />
                          पर्याप्त (Sufficient)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient-wise Detail View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <User size={18} />
            बिरामी अनुसार औषधि विवरण (Patient-wise Requirement)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                <th className="px-6 py-3 font-medium">बिरामीको नाम (Patient)</th>
                <th className="px-6 py-3 font-medium">सेवा (Service)</th>
                <th className="px-6 py-3 font-medium">तौल (Weight)</th>
                <th className="px-6 py-3 font-medium">दैनिक मात्रा (Daily Dose)</th>
                <th className="px-6 py-3 font-medium text-right">कार्य (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patientRequirements.map(({ patient, requirements }) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{patient.name}</div>
                    <div className="text-xs text-gray-500">ID: {patient.patientId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${patient.serviceType === 'TB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {patient.serviceType} {patient.leprosyType ? `(${patient.leprosyType})` : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{patient.weight || '-'} kg</td>
                  <td className="px-6 py-4">
                    {requirements.map(r => (
                      <div key={r.itemName} className="text-sm">
                        {r.itemName}: <span className="font-semibold">{r.dailyQuantity}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    {requirements.map(r => (
                      <div key={r.itemName} className="text-sm font-semibold text-blue-600">
                        {r.itemName}: {r.remainingNeeded}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(patient.id, patient.name)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Patient"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
        <Info className="text-blue-600 shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          <strong>नोट:</strong> यो गणना बिरामीको तौल र उपचारको अवस्था (Completed Schedule) को आधारमा गरिएको हो। 
          मौज्दात गणना गर्दा सबै गोदामहरूको डाटालाई औषधि नामको आधारमा मिलान (Fuzzy Match) गरिएको छ।
        </p>
      </div>
    </div>
  );
};
