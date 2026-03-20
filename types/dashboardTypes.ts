
import { User, OrganizationSettings, LeaveApplication, LeaveStatus, LeaveBalance, Darta, Chalani, BharmanAdeshEntry } from './coreTypes';
import { 
  MagFormEntry, PurchaseOrderEntry, IssueReportEntry, FirmEntry, QuotationEntry, 
  InventoryItem, Store, StockEntryRequest, DakhilaPratibedanEntry, ReturnEntry, 
  MarmatEntry, DhuliyaunaEntry, LogBookEntry
} from './inventoryTypes';
import { RabiesPatient, TBPatient, GarbhawatiPatient, ChildImmunizationRecord } from './healthTypes';

export interface LoginFormProps {
  users: User[];
  onLoginSuccess: (user: User, fiscalYear: string) => void;
  initialFiscalYear: string;
}

export interface UserManagementProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  isDbLocked: boolean;
}

export interface SahayakJinshiKhataProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  generalSettings: OrganizationSettings;
  users: User[];
}

export interface JinshiKhataProps {
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  stockEntryRequests: StockEntryRequest[];
  generalSettings: OrganizationSettings;
  stores: Store[];
}

export interface DashboardProps {
  onLogout: () => void;
  currentUser: User | null; 
  currentFiscalYear: string;
  users: User[];
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onChangePassword: (userId: string, newPassword: string) => void;
  isDbLocked: boolean;
  
  generalSettings: OrganizationSettings;
  onUpdateGeneralSettings: (settings: OrganizationSettings) => void;

  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  onDeleteMagForm: (formId: string) => void; 
  
  purchaseOrders: PurchaseOrderEntry[];
  onUpdatePurchaseOrder: (order: PurchaseOrderEntry) => void; 

  issueReports: IssueReportEntry[];
  onUpdateIssueReport: (report: IssueReportEntry) => void; 

  rabiesPatients: RabiesPatient[];
  onAddRabiesPatient: (patient: RabiesPatient) => void;
  onUpdatePatient: (patient: RabiesPatient) => void;
  onDeletePatient: (patientId: string) => void; 

  tbPatients: TBPatient[];
  onAddTbPatient: (patient: TBPatient) => void;
  onUpdateTbPatient: (patient: TBPatient) => void;
  onDeleteTbPatient: (patientId: string) => void;

  garbhawatiPatients: GarbhawatiPatient[];
  onAddGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onUpdateGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onDeleteGarbhawatiPatient: (patientId: string) => void;

  bachhaImmunizationRecords: ChildImmunizationRecord[];
  onAddBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onUpdateBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onDeleteBachhaImmunizationRecord: (recordId: string) => void;

  firms: FirmEntry[];
  onAddFirm: (firm: FirmEntry) => void;

  quotations: QuotationEntry[];
  onAddQuotation: (quotation: QuotationEntry) => void;

  inventoryItems: InventoryItem[];
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (itemId: string) => void; 

  stockEntryRequests: StockEntryRequest[];
  onRequestStockEntry: (request: StockEntryRequest) => void;
  onApproveStockEntry: (requestId: string, approverName: string, approverDesignation: string) => void;
  onRejectStockEntry: (requestId: string, reason: string, approverName: string) => void;

  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;

  dakhilaReports: DakhilaPratibedanEntry[];
  onSaveDakhilaReport: (report: DakhilaPratibedanEntry) => void;

  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;

  marmatEntries: MarmatEntry[];
  onSaveMarmatEntry: (entry: MarmatEntry) => void;

  dhuliyaunaEntries: DhuliyaunaEntry[];
  onSaveDhuliyaunaEntry: (entry: DhuliyaunaEntry) => void;

  logBookEntries: LogBookEntry[];
  onSaveLogBookEntry: (entry: LogBookEntry) => void;

  leaveApplications: LeaveApplication[];
  onAddLeaveApplication: (app: LeaveApplication) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, rejectionReason?: string) => void;
  onDeleteLeaveApplication: (id: string) => void;
  
  leaveBalances: LeaveBalance[];
  onSaveLeaveBalance: (balance: LeaveBalance) => Promise<void>;

  dartaEntries: Darta[];
  onSaveDarta: (darta: Darta) => void;
  onDeleteDarta: (id: string) => void;

  chalaniEntries: Chalani[];
  onSaveChalani: (chalani: Chalani) => void;
  onDeleteChalani: (id: string) => void;

  bharmanAdeshEntries: BharmanAdeshEntry[];
  onSaveBharmanAdesh: (entry: BharmanAdeshEntry) => void;
  onDeleteBharmanAdesh: (id: string) => void;

  onClearData: (sectionId: string) => void; 
  onUploadData?: (sectionId: string, data: any[]) => void;
}
