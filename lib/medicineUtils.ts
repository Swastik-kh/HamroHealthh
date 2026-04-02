
import { TBPatient, InventoryItem } from '../types';

export interface MedicineRequirement {
  itemName: string;
  dailyQuantity: number;
  totalNeeded: number;
  remainingNeeded: number;
  availableStock: number;
}

const MEDICINE_MAPPINGS: Record<string, string[]> = {
  'HRZE (Adult)': ['HRZE', 'HRZE Adult', 'Isoniazid+Rifampicin+Pyrazinamide+Ethambutol', 'TB Intensive', '4FDC', 'Fixed Dose Combination Adult', 'RHZE'],
  'HR (Adult)': ['HR', 'HR Adult', 'Isoniazid+Rifampicin', 'TB Continuation', '2FDC', 'RH'],
  'HRE (Adult)': ['HRE', 'HRE Adult', 'Isoniazid+Rifampicin+Ethambutol', 'TB Continuation EP', '3FDC'],
  'HRZE (Child)': ['HRZE Child', 'Pediatric HRZE', 'H50/R75/Z150/E100', 'Child TB Intensive', 'RHZE Child', 'HRZ'],
  'HR (Child)': ['HR Child', 'Pediatric HR', 'H50/R75', 'Child TB Continuation', 'RH Child'],
  'Levofloxacin 250/500mg': ['Levofloxacin', 'Lfx', 'Levo', 'Levofloxacin 500', 'Levofloxacin 250'],
  'Dapsone 100mg': ['Dapsone', 'Dapsone 100mg', 'DDS', 'Leprosy Dapsone'],
  'Clofazimine 50mg': ['Clofazimine', 'Clofazimine 50mg', 'Lamprene', 'Clofazimine 50'],
  'Clofazimine 100mg': ['Clofazimine 100mg', 'Clofazimine 100'],
  'Rifampicin 600mg': ['Rifampicin', 'Rifampicin 600mg', 'Rifampin', 'Rifampicin 600'],
  'Rifampicin 450mg': ['Rifampicin 450mg', 'Rifampicin 450'],
};

export const fuzzyMatch = (stockName: string, targetName: string): boolean => {
  const stock = stockName.toLowerCase().trim();
  const target = targetName.toLowerCase().trim();
  
  if (stock.includes(target) || target.includes(stock)) return true;
  
  // Check mappings
  for (const [key, variations] of Object.entries(MEDICINE_MAPPINGS)) {
    if (key.toLowerCase() === target.toLowerCase()) {
      return variations.some(v => stock.includes(v.toLowerCase()));
    }
  }
  
  return false;
};

export const calculatePatientRequirements = (patient: TBPatient, inventory: InventoryItem[]): MedicineRequirement[] => {
  const requirements: MedicineRequirement[] = [];
  const weight = parseFloat(patient.weight || '0');
  const isChild = patient.regimen === 'Child';
  const isLeprosy = patient.serviceType === 'Leprosy';
  
  if (patient.serviceType === 'TB') {
    const treatmentType = patient.treatmentType || '2HRZE+4HR';
    
    let intensivePhaseDays = 60;
    let continuationPhaseDays = 120;
    let cpMedicineType: 'HR' | 'HRE' | 'HRZE' | 'None' = 'HR';
    let needsLfx = false;

    // Determine regimen based on treatmentType
    if (treatmentType.includes('6HRZE')) {
      intensivePhaseDays = 180;
      continuationPhaseDays = 0;
      cpMedicineType = 'None';
      if (treatmentType.includes('Lfx')) needsLfx = true;
    } else if (treatmentType.includes('7HRE')) {
      intensivePhaseDays = 60;
      continuationPhaseDays = 210;
      cpMedicineType = 'HRE';
    } else if (treatmentType.includes('10HRE')) {
      intensivePhaseDays = 60;
      continuationPhaseDays = 300;
      cpMedicineType = 'HRE';
    } else {
      // Default 2HRZE+4HR
      intensivePhaseDays = 60;
      continuationPhaseDays = 120;
      cpMedicineType = 'HR';
    }
    
    const completedDays = (patient.completedSchedule?.length || 0) * 30;
    
    // Intensive Phase Medicine (HRZE)
    const ipMedicineName = isChild ? 'HRZE (Child)' : 'HRZE (Adult)';
    let ipDailyQty = 0;
    if (!isChild) {
      if (weight >= 30 && weight <= 39) ipDailyQty = 2;
      else if (weight >= 40 && weight <= 54) ipDailyQty = 3;
      else if (weight >= 55 && weight <= 70) ipDailyQty = 4;
      else if (weight > 70) ipDailyQty = 5;
      else ipDailyQty = 2;
    } else {
      if (weight >= 4 && weight <= 7.9) ipDailyQty = 1;
      else if (weight >= 8 && weight <= 11.9) ipDailyQty = 2;
      else if (weight >= 12 && weight <= 15.9) ipDailyQty = 3;
      else if (weight >= 16 && weight <= 24.9) ipDailyQty = 4;
      else ipDailyQty = 1;
    }

    const ipRemainingDays = Math.max(0, intensivePhaseDays - completedDays);
    const ipStock = inventory
      .filter(item => fuzzyMatch(item.itemName, ipMedicineName))
      .reduce((sum, item) => sum + item.currentQuantity, 0);

    requirements.push({
      itemName: ipMedicineName,
      dailyQuantity: ipDailyQty,
      totalNeeded: ipDailyQty * intensivePhaseDays,
      remainingNeeded: ipDailyQty * ipRemainingDays,
      availableStock: ipStock
    });

    // Levofloxacin if needed
    if (needsLfx) {
      const lfxStock = inventory
        .filter(item => fuzzyMatch(item.itemName, 'Levofloxacin 250/500mg'))
        .reduce((sum, item) => sum + item.currentQuantity, 0);
      
      requirements.push({
        itemName: 'Levofloxacin 250/500mg',
        dailyQuantity: 1, // Usually 1 tab daily
        totalNeeded: 1 * intensivePhaseDays,
        remainingNeeded: 1 * ipRemainingDays,
        availableStock: lfxStock
      });
    }

    // Continuation Phase Medicine
    if (cpMedicineType !== 'None') {
      const cpMedicineName = cpMedicineType === 'HRE' ? 'HRE (Adult)' : (isChild ? 'HR (Child)' : 'HR (Adult)');
      let cpDailyQty = ipDailyQty;

      const cpCompletedDays = Math.max(0, completedDays - intensivePhaseDays);
      const cpRemainingDays = Math.max(0, continuationPhaseDays - cpCompletedDays);
      const cpStock = inventory
        .filter(item => fuzzyMatch(item.itemName, cpMedicineName))
        .reduce((sum, item) => sum + item.currentQuantity, 0);

      requirements.push({
        itemName: cpMedicineName,
        dailyQuantity: cpDailyQty,
        totalNeeded: cpDailyQty * continuationPhaseDays,
        remainingNeeded: cpDailyQty * cpRemainingDays,
        availableStock: cpStock
      });
    }
  } else if (isLeprosy) {
    const isMB = patient.leprosyType === 'MB';
    const totalMonths = isMB ? 12 : 6;
    const completedMonths = patient.completedSchedule?.length || 0;
    const remainingMonths = Math.max(0, totalMonths - completedMonths);

    // Dapsone (Daily)
    const dapsoneStock = inventory
      .filter(item => fuzzyMatch(item.itemName, 'Dapsone 100mg'))
      .reduce((sum, item) => sum + item.currentQuantity, 0);
    
    requirements.push({
      itemName: 'Dapsone 100mg',
      dailyQuantity: 1,
      totalNeeded: 1 * totalMonths * 30,
      remainingNeeded: 1 * remainingMonths * 30,
      availableStock: dapsoneStock
    });

    if (isMB) {
      // Clofazimine (Daily)
      const clofStock = inventory
        .filter(item => fuzzyMatch(item.itemName, 'Clofazimine 50mg'))
        .reduce((sum, item) => sum + item.currentQuantity, 0);
      
      requirements.push({
        itemName: 'Clofazimine 50mg',
        dailyQuantity: 1,
        totalNeeded: 1 * totalMonths * 30,
        remainingNeeded: 1 * remainingMonths * 30,
        availableStock: clofStock
      });
    }
  }

  return requirements;
};
