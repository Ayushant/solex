import { create } from 'zustand';
import {
  type AuthenticatedUser,
  DEMO_USERS,
  fetchAndSyncFromSupabase,
  seedAllTablesToSupabase,
  upsertUnitInSupabase,
  upsertLeadInSupabase,
  upsertBookingInSupabase,
  insertActivityInSupabase,
  supabase,
} from '../lib/supabase';

export type UserRole = 'Admin' | 'Broker';
export type UnitStatus = 'Available' | 'Hold' | 'Sold';
export type LeadStage = 'New' | 'Site Visit' | 'Negotiation' | 'Booked';
export type CommissionStatus = 'Pending Approval' | 'Approved' | 'Released';

export type ScreenId =
  | 'command-centre'
  | 'projects'
  | 'leads'
  | 'brokers'
  | 'finance'
  | 'architecture'
  | 'broker-leads'
  | 'broker-commissions';

export interface Project {
  id: string;
  name: string;
  location: string;
  developerName: string;
  reraNumber: string;
  mandateType: 'Exclusive Mandate' | 'Joint Mandate';
  mandateTermsSummary: string;
  mandateCommissionPct: number;
  brokerSharePct: number;
  totalUnits: number;
  floors: number;
  unitsPerFloor: number;
  wings: string[];
  possessionDate: string;
}

export interface PropertyUnit {
  id: string;
  projectId: string;
  unitNumber: string;
  wing: string;
  floor: number;
  stackIndex: number; // 1..4 per floor for 2D & 3D positioning
  bhk: '2 BHK Luxury' | '3 BHK Grand' | '4 BHK Sky Villa';
  carpetAreaSqFt: number;
  basePriceInr: number;
  floorRiseInr: number;
  plcInr: number;
  facing: string;
  status: UnitStatus;
  heldByLeadId?: string;
  bookedByLeadId?: string;
  bookedByBrokerId?: string;
  version: number;
}

export interface Broker {
  id: string;
  name: string;
  firmName: string;
  reraId: string;
  phone: string;
  email: string;
  tier: 'Platinum' | 'Gold' | 'Silver';
  city: string;
}

export interface Lead {
  id: string;
  buyerName: string;
  phone: string;
  email: string;
  projectId: string;
  interestedBhk: '2 BHK Luxury' | '3 BHK Grand' | '4 BHK Sky Villa';
  budgetInr: number;
  stage: LeadStage;
  assignedBrokerId: string;
  preferredUnitId?: string;
  bookedUnitId?: string;
  notes: string;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  projectId: string;
  unitId: string;
  leadId: string;
  brokerId: string;
  agreementValueInr: number;
  commissionPct: number;
  commissionAmountInr: number;
  commissionStatus: CommissionStatus;
  bookedAt: string;
}

export interface MonthlySalesPoint {
  month: string;
  conversions: number;
  leadsGenerated: number;
  salesVolumeCr: number;
  activeProjectsCount: number;
  pendingCommissionsInr: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  category: 'Booking' | 'Lead' | 'Inventory' | 'Commission';
  actorName: string;
  actorRole: 'Mandate HQ' | 'Channel Partner' | 'Site Sales';
  projectId: string;
  message: string;
  amountInr?: number;
}

export interface ToastNotification {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'warning';
  actionLabel?: string;
  actionScreen?: ScreenId;
}

interface BookingModalPreset {
  isOpen: boolean;
  preselectedLeadId?: string;
  preselectedUnitId?: string;
  preselectedProjectId?: string;
}

interface SolexState {
  currentUser: AuthenticatedUser | null;
  role: UserRole;
  activeBrokerId: string;
  activeScreen: ScreenId;
  selectedProjectId: string;
  selectedUnitId: string | null;
  bookingModal: BookingModalPreset;
  isCopilotOpen: boolean;
  isSupabaseModalOpen: boolean;
  supabaseTablesReady: boolean;
  isSyncingSupabase: boolean;
  toast: ToastNotification | null;

  projects: Project[];
  units: PropertyUnit[];
  brokers: Broker[];
  leads: Lead[];
  bookings: BookingRecord[];
  monthlySales: MonthlySalesPoint[];
  activities: ActivityEvent[];

  // Auth & Supabase Actions
  loginUser: (user: AuthenticatedUser) => void;
  logoutUser: () => Promise<void>;
  setSupabaseModalOpen: (open: boolean) => void;
  initializeFromSupabase: () => Promise<void>;
  seedToSupabaseNow: () => Promise<{ success: boolean; error?: string }>;

  // Actions
  setRole: (role: UserRole) => void;
  setActiveBrokerId: (brokerId: string) => void;
  setActiveScreen: (screen: ScreenId) => void;
  setSelectedProjectId: (projectId: string) => void;
  setSelectedUnitId: (unitId: string | null) => void;
  openBookingModal: (preset?: { leadId?: string; unitId?: string; projectId?: string }) => void;
  closeBookingModal: () => void;
  setCopilotOpen: (open: boolean) => void;
  dismissToast: () => void;

  // Domain Mutations
  updateUnitStatus: (unitId: string, status: UnitStatus, heldByLeadId?: string) => void;
  updateLeadStage: (leadId: string, stage: LeadStage) => void;
  registerNewLead: (input: {
    buyerName: string;
    phone: string;
    email: string;
    projectId: string;
    interestedBhk: '2 BHK Luxury' | '3 BHK Grand' | '4 BHK Sky Villa';
    budgetInr: number;
    assignedBrokerId: string;
    notes: string;
  }) => void;
  convertLeadToBooking: (payload: {
    leadId: string;
    unitId: string;
    brokerId: string;
    bookingNotes?: string;
  }) => { success: boolean; error?: string; bookingId?: string };
  advanceCommissionStatus: (bookingId: string) => void;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-skyline',
    name: 'Skyline Towers',
    location: 'Worli South, Mumbai',
    developerName: 'Oberoi & Prestige Joint Venture',
    reraNumber: 'P51900048291',
    mandateType: 'Exclusive Mandate',
    mandateTermsSummary: 'Exclusive 18-Month Master Mandate · 4.5% Gross Mandate Fee · 2.0% Channel Partner Pass-Through · 90-Day Price Protection',
    mandateCommissionPct: 4.5,
    brokerSharePct: 2.0,
    totalUnits: 24,
    floors: 6,
    unitsPerFloor: 4,
    wings: ['Wing A (Sea View)', 'Wing B (Park View)'],
    possessionDate: 'Dec 2028',
  },
  {
    id: 'proj-emerald',
    name: 'Emerald Crest',
    location: 'Whitefield Main Rd, Bengaluru',
    developerName: 'Sobha & Brigade Consortium',
    reraNumber: 'PRM/KA/RERA/1251/446',
    mandateType: 'Exclusive Mandate',
    mandateTermsSummary: 'Exclusive IT-Corridor Mandate · 4.0% Gross Mandate Fee · 1.75% Channel Partner Pass-Through · Subvention Scheme Active',
    mandateCommissionPct: 4.0,
    brokerSharePct: 1.75,
    totalUnits: 16,
    floors: 4,
    unitsPerFloor: 4,
    wings: ['East Tower', 'West Tower'],
    possessionDate: 'Jun 2028',
  },
  {
    id: 'proj-aurelia',
    name: 'Aurelia One',
    location: 'Golf Course Ext., Gurugram',
    developerName: 'DLF & Godrej Signature',
    reraNumber: 'RC/REP/HARERA/GGM/712',
    mandateType: 'Joint Mandate',
    mandateTermsSummary: 'Luxury Golf-Facing Mandate · 5.0% Gross Mandate Fee · 2.25% Channel Partner Pass-Through · Club Membership Waived',
    mandateCommissionPct: 5.0,
    brokerSharePct: 2.25,
    totalUnits: 16,
    floors: 4,
    unitsPerFloor: 4,
    wings: ['Signature North', 'Signature South'],
    possessionDate: 'Mar 2029',
  },
];

const INITIAL_BROKERS: Broker[] = [
  {
    id: 'brk-rahul',
    name: 'Rahul Sharma',
    firmName: 'Apex Realty Advisors',
    reraId: 'MAHARERA-A519000192',
    phone: '+91 98201 44810',
    email: 'rahul.sharma@apexrealty.in',
    tier: 'Platinum',
    city: 'Mumbai',
  },
  {
    id: 'brk-priya',
    name: 'Priya Nair',
    firmName: 'Zenith Wealth & Estates',
    reraId: 'PRM/KA/RERA/AGT/084',
    phone: '+91 98450 77231',
    email: 'priya@zenithestamb.in',
    tier: 'Gold',
    city: 'Bengaluru',
  },
  {
    id: 'brk-vikram',
    name: 'Vikram Malhotra',
    firmName: 'PropVantage NCR',
    reraId: 'HARERA/GGM/AGT/319',
    phone: '+91 98112 90342',
    email: 'vikram@propvantage.co.in',
    tier: 'Platinum',
    city: 'Gurugram',
  },
  {
    id: 'brk-ankit',
    name: 'Ankit Deshmukh',
    firmName: 'PrimeSquare Channel Partners',
    reraId: 'MAHARERA-A519000441',
    phone: '+91 97693 11509',
    email: 'ankit@primesquare.in',
    tier: 'Silver',
    city: 'Mumbai',
  },
];

function generateInitialUnits(): PropertyUnit[] {
  const units: PropertyUnit[] = [];

  // 1. Skyline Towers (6 floors x 4 units = 24 units)
  const skylineSoldNumbers = new Set(['101', '104', '202', '301', '303', '404', '502', '601']);
  const skylineHoldNumbers = new Set(['203', '401', '504']);

  for (let floor = 1; floor <= 6; floor++) {
    for (let stack = 1; stack <= 4; stack++) {
      const unitNumber = `${floor}0${stack}`;
      const isTopFloor = floor === 6;
      const bhk: PropertyUnit['bhk'] = isTopFloor
        ? '4 BHK Sky Villa'
        : stack === 1 || stack === 4
        ? '3 BHK Grand'
        : '2 BHK Luxury';

      const carpetAreaSqFt =
        bhk === '4 BHK Sky Villa' ? 2680 : bhk === '3 BHK Grand' ? 1640 : 1180;

      const baseRatePerSqFt = 22500;
      const basePriceInr = carpetAreaSqFt * baseRatePerSqFt;
      const floorRiseInr = (floor - 1) * 650000;
      const plcInr = stack === 1 || stack === 2 ? 850000 : 350000;

      let status: UnitStatus = 'Available';
      if (skylineSoldNumbers.has(unitNumber)) status = 'Sold';
      else if (skylineHoldNumbers.has(unitNumber)) status = 'Hold';

      units.push({
        id: `unit-skyline-${unitNumber}`,
        projectId: 'proj-skyline',
        unitNumber,
        wing: stack <= 2 ? 'Wing A (Sea View)' : 'Wing B (Park View)',
        floor,
        stackIndex: stack,
        bhk,
        carpetAreaSqFt,
        basePriceInr,
        floorRiseInr,
        plcInr,
        facing:
          stack === 1
            ? 'Arabian Sea West'
            : stack === 2
            ? 'Sea Link North-West'
            : stack === 3
            ? 'Central Botanical Deck'
            : 'Eastern Harbour View',
        status,
        heldByLeadId: unitNumber === '401' ? 'lead-102' : unitNumber === '203' ? 'lead-103' : undefined,
        bookedByLeadId: unitNumber === '301' ? 'lead-107' : unitNumber === '601' ? 'lead-108' : undefined,
        bookedByBrokerId: unitNumber === '301' ? 'brk-rahul' : unitNumber === '601' ? 'brk-vikram' : undefined,
        version: 1,
      });
    }
  }

  // 2. Emerald Crest (4 floors x 4 units = 16 units)
  const emeraldSoldNumbers = new Set(['102', '201', '204', '302', '401']);
  const emeraldHoldNumbers = new Set(['304', '403']);

  for (let floor = 1; floor <= 4; floor++) {
    for (let stack = 1; stack <= 4; stack++) {
      const unitNumber = `${floor}0${stack}`;
      const bhk: PropertyUnit['bhk'] =
        floor === 4 && stack >= 3
          ? '4 BHK Sky Villa'
          : stack % 2 === 1
          ? '3 BHK Grand'
          : '2 BHK Luxury';

      const carpetAreaSqFt =
        bhk === '4 BHK Sky Villa' ? 2350 : bhk === '3 BHK Grand' ? 1520 : 1120;
      const basePriceInr = carpetAreaSqFt * 12800;
      const floorRiseInr = (floor - 1) * 320000;
      const plcInr = stack <= 2 ? 450000 : 200000;

      let status: UnitStatus = 'Available';
      if (emeraldSoldNumbers.has(unitNumber)) status = 'Sold';
      else if (emeraldHoldNumbers.has(unitNumber)) status = 'Hold';

      units.push({
        id: `unit-emerald-${unitNumber}`,
        projectId: 'proj-emerald',
        unitNumber,
        wing: stack <= 2 ? 'East Tower' : 'West Tower',
        floor,
        stackIndex: stack,
        bhk,
        carpetAreaSqFt,
        basePriceInr,
        floorRiseInr,
        plcInr,
        facing: stack <= 2 ? 'Sunrise Lake East' : 'Clubhouse Pool Courtyard',
        status,
        bookedByLeadId: unitNumber === '401' ? 'lead-109' : undefined,
        bookedByBrokerId: unitNumber === '401' ? 'brk-priya' : undefined,
        version: 1,
      });
    }
  }

  // 3. Aurelia One (4 floors x 4 units = 16 units)
  const aureliaSoldNumbers = new Set(['101', '203', '301', '304', '402']);
  const aureliaHoldNumbers = new Set(['202']);

  for (let floor = 1; floor <= 4; floor++) {
    for (let stack = 1; stack <= 4; stack++) {
      const unitNumber = `${floor}0${stack}`;
      const bhk: PropertyUnit['bhk'] =
        floor === 4 ? '4 BHK Sky Villa' : stack <= 2 ? '3 BHK Grand' : '2 BHK Luxury';

      const carpetAreaSqFt =
        bhk === '4 BHK Sky Villa' ? 2850 : bhk === '3 BHK Grand' ? 1780 : 1290;
      const basePriceInr = carpetAreaSqFt * 16500;
      const floorRiseInr = (floor - 1) * 480000;
      const plcInr = 600000;

      let status: UnitStatus = 'Available';
      if (aureliaSoldNumbers.has(unitNumber)) status = 'Sold';
      else if (aureliaHoldNumbers.has(unitNumber)) status = 'Hold';

      units.push({
        id: `unit-aurelia-${unitNumber}`,
        projectId: 'proj-aurelia',
        unitNumber,
        wing: stack <= 2 ? 'Signature North' : 'Signature South',
        floor,
        stackIndex: stack,
        bhk,
        carpetAreaSqFt,
        basePriceInr,
        floorRiseInr,
        plcInr,
        facing: stack <= 2 ? '18-Hole Championship Golf Course' : 'Aravalli Ridge South',
        status,
        version: 1,
      });
    }
  }

  return units;
}

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
    buyerName: 'Siddharth & Meera Kapoor',
    phone: '+91 98204 11920',
    email: 'siddharth.kapoor@finvest.in',
    projectId: 'proj-skyline',
    interestedBhk: '3 BHK Grand',
    budgetInr: 41000000,
    stage: 'Negotiation',
    assignedBrokerId: 'brk-rahul',
    preferredUnitId: 'unit-skyline-401',
    notes: 'Second site visit completed with family. Ready with ₹15L booking cheque for sea-facing 3 BHK on 4th or 5th floor.',
    createdAt: '2026-10-18T11:20:00Z',
  },
  {
    id: 'lead-102',
    buyerName: 'Dr. Arvind Krishnan',
    phone: '+91 98451 62091',
    email: 'arvind.krishnan@apollohealth.org',
    projectId: 'proj-skyline',
    interestedBhk: '3 BHK Grand',
    budgetInr: 39500000,
    stage: 'Negotiation',
    assignedBrokerId: 'brk-rahul',
    preferredUnitId: 'unit-skyline-201',
    notes: 'Evaluating 20:80 developer subvention schedule. Prefers Wing A stack 01.',
    createdAt: '2026-10-19T14:45:00Z',
  },
  {
    id: 'lead-103',
    buyerName: 'Rohan & Tanyaania Singhania',
    phone: '+91 98110 88432',
    email: 'rohan@singhaniaventures.com',
    projectId: 'proj-skyline',
    interestedBhk: '4 BHK Sky Villa',
    budgetInr: 68000000,
    stage: 'Site Visit',
    assignedBrokerId: 'brk-vikram',
    preferredUnitId: 'unit-skyline-602',
    notes: 'Private deck inspection scheduled for Saturday 11:00 AM. Looking at Penthouse 602 or 603.',
    createdAt: '2026-10-19T16:10:00Z',
  },
  {
    id: 'lead-104',
    buyerName: 'Neha & Kunal Verma',
    phone: '+91 98802 34119',
    email: 'kunal.verma@cloudscale.io',
    projectId: 'proj-emerald',
    interestedBhk: '3 BHK Grand',
    budgetInr: 22000000,
    stage: 'Negotiation',
    assignedBrokerId: 'brk-priya',
    preferredUnitId: 'unit-emerald-301',
    notes: 'Pre-approved HDFC home loan up to ₹1.8 Cr. Negotiating car park allocation on Unit 301.',
    createdAt: '2026-10-17T09:30:00Z',
  },
  {
    id: 'lead-105',
    buyerName: 'Gaurav Bhatia',
    phone: '+91 98188 73001',
    email: 'gbhatia@deloitte-advisory.in',
    projectId: 'proj-aurelia',
    interestedBhk: '3 BHK Grand',
    budgetInr: 32500000,
    stage: 'Site Visit',
    assignedBrokerId: 'brk-vikram',
    preferredUnitId: 'unit-aurelia-201',
    notes: 'Visited sample flat with channel partner Vikram Malhotra. Impressed with golf course view.',
    createdAt: '2026-10-20T10:05:00Z',
  },
  {
    id: 'lead-106',
    buyerName: 'Ananya Deshpande',
    phone: '+91 97690 55210',
    email: 'ananya.d@tatadigital.com',
    projectId: 'proj-skyline',
    interestedBhk: '2 BHK Luxury',
    budgetInr: 29000000,
    stage: 'New',
    assignedBrokerId: 'brk-ankit',
    preferredUnitId: 'unit-skyline-102',
    notes: 'NRI buyer returning from Singapore next week. Requested virtual 3D tower walkthrough.',
    createdAt: '2026-10-21T06:40:00Z',
  },
  {
    id: 'lead-110',
    buyerName: 'Karanveer & Pooja Gill',
    phone: '+91 98209 31044',
    email: 'karan.gill@gilllogistics.in',
    projectId: 'proj-skyline',
    interestedBhk: '2 BHK Luxury',
    budgetInr: 28500000,
    stage: 'New',
    assignedBrokerId: 'brk-rahul',
    preferredUnitId: 'unit-skyline-302',
    notes: 'Registered via Apex Realty CP desk. Looking for mid-floor 2 BHK investment unit.',
    createdAt: '2026-10-21T07:15:00Z',
  },
  {
    id: 'lead-107',
    buyerName: 'Harshvardhan Parekh',
    phone: '+91 98200 10092',
    email: 'hparekh@parekhgroup.in',
    projectId: 'proj-skyline',
    interestedBhk: '3 BHK Grand',
    budgetInr: 40000000,
    stage: 'Booked',
    assignedBrokerId: 'brk-rahul',
    bookedUnitId: 'unit-skyline-301',
    notes: 'Booked Unit 301 (Wing A). 10% booking token cleared via RTGS.',
    createdAt: '2026-10-12T12:00:00Z',
  },
  {
    id: 'lead-108',
    buyerName: 'Sanjay & Ritu Jindal',
    phone: '+91 98111 45002',
    email: 'sanjay@jindalsteelcorp.in',
    projectId: 'proj-skyline',
    interestedBhk: '4 BHK Sky Villa',
    budgetInr: 65000000,
    stage: 'Booked',
    assignedBrokerId: 'brk-vikram',
    bookedUnitId: 'unit-skyline-601',
    notes: 'Booked Sky Villa 601. Allotment letter issued.',
    createdAt: '2026-10-10T15:30:00Z',
  },
  {
    id: 'lead-109',
    buyerName: 'Prashanth Subramanian',
    phone: '+91 98452 99812',
    email: 'prashanth.s@infosys.com',
    projectId: 'proj-emerald',
    interestedBhk: '3 BHK Grand',
    budgetInr: 21500000,
    stage: 'Booked',
    assignedBrokerId: 'brk-priya',
    bookedUnitId: 'unit-emerald-401',
    notes: 'Booked Unit 401 in Emerald Crest. Stamp duty registration scheduled.',
    createdAt: '2026-10-14T11:15:00Z',
  },
];

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: 'bkg-901',
    projectId: 'proj-skyline',
    unitId: 'unit-skyline-301',
    leadId: 'lead-107',
    brokerId: 'brk-rahul',
    agreementValueInr: 39050000, // 3.905 Cr
    commissionPct: 2.0,
    commissionAmountInr: 781000, // 7.81 Lakh
    commissionStatus: 'Pending Approval',
    bookedAt: '2026-10-14T16:20:00Z',
  },
  {
    id: 'bkg-902',
    projectId: 'proj-skyline',
    unitId: 'unit-skyline-601',
    leadId: 'lead-108',
    brokerId: 'brk-vikram',
    agreementValueInr: 64400000, // 6.44 Cr
    commissionPct: 2.0,
    commissionAmountInr: 1288000, // 12.88 Lakh
    commissionStatus: 'Approved',
    bookedAt: '2026-10-11T18:05:00Z',
  },
  {
    id: 'bkg-903',
    projectId: 'proj-emerald',
    unitId: 'unit-emerald-401',
    leadId: 'lead-109',
    brokerId: 'brk-priya',
    agreementValueInr: 20866000, // 2.086 Cr
    commissionPct: 1.75,
    commissionAmountInr: 365155, // 3.65 Lakh
    commissionStatus: 'Pending Approval',
    bookedAt: '2026-10-15T13:10:00Z',
  },
  {
    id: 'bkg-904',
    projectId: 'proj-skyline',
    unitId: 'unit-skyline-101',
    leadId: 'lead-107',
    brokerId: 'brk-rahul',
    agreementValueInr: 37750000, // 3.775 Cr
    commissionPct: 2.0,
    commissionAmountInr: 755000, // 7.55 Lakh
    commissionStatus: 'Released',
    bookedAt: '2026-10-04T11:00:00Z',
  },
];

const INITIAL_MONTHLY_SALES: MonthlySalesPoint[] = [
  {
    month: "May '26",
    conversions: 6,
    leadsGenerated: 38,
    salesVolumeCr: 19.4,
    activeProjectsCount: 1,
    pendingCommissionsInr: 780000,
  },
  {
    month: "Jun '26",
    conversions: 8,
    leadsGenerated: 44,
    salesVolumeCr: 26.8,
    activeProjectsCount: 2,
    pendingCommissionsInr: 1120000,
  },
  {
    month: "Jul '26",
    conversions: 7,
    leadsGenerated: 41,
    salesVolumeCr: 23.1,
    activeProjectsCount: 2,
    pendingCommissionsInr: 960000,
  },
  {
    month: "Aug '26",
    conversions: 11,
    leadsGenerated: 56,
    salesVolumeCr: 36.5,
    activeProjectsCount: 2,
    pendingCommissionsInr: 1540000,
  },
  {
    month: "Sep '26",
    conversions: 14,
    leadsGenerated: 62,
    salesVolumeCr: 45.2,
    activeProjectsCount: 2,
    pendingCommissionsInr: 1940000,
  },
  {
    month: "Oct '26",
    conversions: 18,
    leadsGenerated: 71,
    salesVolumeCr: 58.6,
    activeProjectsCount: 3,
    pendingCommissionsInr: 2434155,
  },
];

const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    timestamp: '12 mins ago',
    category: 'Lead',
    actorName: 'Rahul Sharma (Apex Realty)',
    actorRole: 'Channel Partner',
    projectId: 'proj-skyline',
    message: "Channel Partner 'Rahul Sharma' registered a new lead (Karanveer & Pooja Gill) for Skyline Towers.",
  },
  {
    id: 'act-2',
    timestamp: '48 mins ago',
    category: 'Inventory',
    actorName: 'Rahul Sharma (Apex Realty)',
    actorRole: 'Channel Partner',
    projectId: 'proj-skyline',
    message: "Unit 401 in Skyline Towers placed on 24h Hold for buyer 'Siddharth & Meera Kapoor'.",
  },
  {
    id: 'act-3',
    timestamp: '2 hours ago',
    category: 'Lead',
    actorName: 'Vikram Malhotra (PropVantage)',
    actorRole: 'Channel Partner',
    projectId: 'proj-aurelia',
    message: "Site Visit completed for buyer 'Gaurav Bhatia' at Aurelia One (Unit 201).",
  },
  {
    id: 'act-4',
    timestamp: '1 day ago',
    category: 'Booking',
    actorName: 'Priya Nair (Zenith Estates)',
    actorRole: 'Channel Partner',
    projectId: 'proj-emerald',
    message: "Confirmed booking on Unit 401 (Emerald Crest) for buyer 'Prashanth Subramanian'.",
    amountInr: 20866000,
  },
  {
    id: 'act-5',
    timestamp: '2 days ago',
    category: 'Commission',
    actorName: 'Mandate Finance Desk',
    actorRole: 'Mandate HQ',
    projectId: 'proj-skyline',
    message: "Approved ₹12.88 L brokerage payout for Vikram Malhotra on Skyline Towers Unit 601.",
    amountInr: 1288000,
  },
];

export function getUnitAllInclusivePrice(unit: PropertyUnit): number {
  return unit.basePriceInr + unit.floorRiseInr + unit.plcInr;
}

export function formatInrCompact(amountInr: number): string {
  if (amountInr >= 10000000) {
    const cr = amountInr / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (amountInr >= 100000) {
    const lakh = amountInr / 100000;
    return `₹${lakh.toFixed(2)} L`;
  }
  return `₹${amountInr.toLocaleString('en-IN')}`;
}

const SAVED_USER_KEY = 'solex_authenticated_user_v1';

function loadSavedUser(): AuthenticatedUser | null {
  try {
    const raw = localStorage.getItem(SAVED_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export const useSolexStore = create<SolexState>((set, get) => {
  const savedUser = loadSavedUser();
  const initialRole: UserRole = savedUser?.role || 'Admin';
  const initialBrokerId = savedUser?.brokerId || 'brk-rahul';
  const initialScreen: ScreenId =
    initialRole === 'Broker' ? 'broker-leads' : 'command-centre';

  return {
    currentUser: savedUser,
    role: initialRole,
    activeBrokerId: initialBrokerId,
    activeScreen: initialScreen,
    selectedProjectId: 'proj-skyline',
    selectedUnitId: null,
    bookingModal: {
      isOpen: false,
    },
    isCopilotOpen: false,
    isSupabaseModalOpen: false,
    supabaseTablesReady: false,
    isSyncingSupabase: false,
    toast: null,

    projects: INITIAL_PROJECTS,
    units: generateInitialUnits(),
    brokers: INITIAL_BROKERS,
    leads: INITIAL_LEADS,
    bookings: INITIAL_BOOKINGS,
    monthlySales: INITIAL_MONTHLY_SALES,
    activities: INITIAL_ACTIVITIES,

    loginUser: (user) => {
      try {
        localStorage.setItem(SAVED_USER_KEY, JSON.stringify(user));
      } catch {
        // Ignore storage error
      }
      set({
        currentUser: user,
        role: user.role,
        activeBrokerId: user.brokerId || 'brk-rahul',
        activeScreen: user.role === 'Broker' ? 'broker-leads' : 'command-centre',
        selectedUnitId: null,
        toast: {
          id: `toast-${Date.now()}`,
          title: `Authenticated as ${user.fullName}`,
          description:
            user.role === 'Admin'
              ? 'Full Mandate HQ Administrative Access Active.'
              : `Channel Partner Portal Scoped to ${user.firmName || user.fullName}.`,
          type: 'success',
        },
      });
    },

    logoutUser: async () => {
      try {
        localStorage.removeItem(SAVED_USER_KEY);
        await supabase.auth.signOut();
      } catch {
        // Ignore signout errors
      }
      set({
        currentUser: null,
        selectedUnitId: null,
        bookingModal: { isOpen: false },
        isCopilotOpen: false,
        toast: null,
      });
    },

    setSupabaseModalOpen: (open) => set({ isSupabaseModalOpen: open }),

    initializeFromSupabase: async () => {
      const state = get();
      if (state.isSyncingSupabase) return;
      set({ isSyncingSupabase: true });

      const result = await fetchAndSyncFromSupabase({
        projects: state.projects,
        units: state.units,
        brokers: state.brokers,
        leads: state.leads,
        bookings: state.bookings,
        activities: state.activities,
      });

      if (result.tablesReady && result.data) {
        set({
          supabaseTablesReady: true,
          isSyncingSupabase: false,
          projects: result.data.projects || state.projects,
          units: result.data.units || state.units,
          brokers: result.data.brokers || state.brokers,
          leads: result.data.leads || state.leads,
          bookings: result.data.bookings || state.bookings,
          activities: result.data.activities || state.activities,
        });
      } else {
        set({
          supabaseTablesReady: false,
          isSyncingSupabase: false,
        });
      }
    },

    seedToSupabaseNow: async () => {
      const state = get();
      set({ isSyncingSupabase: true });
      const res = await seedAllTablesToSupabase({
        projects: state.projects,
        units: state.units,
        brokers: state.brokers,
        leads: state.leads,
        bookings: state.bookings,
        activities: state.activities,
      });
      set({
        isSyncingSupabase: false,
        supabaseTablesReady: res.success,
        toast: res.success
          ? {
              id: `toast-${Date.now()}`,
              title: 'Supabase Cloud Database Synchronized',
              description:
                'All Projects, 56 Units, Brokers, Leads, and Bookings are synced to your Supabase instance.',
              type: 'success',
            }
          : undefined,
      });
      return res;
    },

    setRole: (role) =>
      set((state) => {
        const nextScreen: ScreenId =
          role === 'Broker'
            ? state.activeScreen === 'broker-leads' ||
              state.activeScreen === 'broker-commissions'
              ? state.activeScreen
              : 'broker-leads'
            : state.activeScreen === 'broker-leads' ||
              state.activeScreen === 'broker-commissions'
            ? 'command-centre'
            : state.activeScreen;

        const matchingDemoUser =
          role === 'Admin'
            ? DEMO_USERS[0]
            : DEMO_USERS.find((u) => u.brokerId === state.activeBrokerId) ||
              DEMO_USERS[1];

        const updatedUser: AuthenticatedUser | null = state.currentUser
          ? {
              ...state.currentUser,
              role,
              fullName: matchingDemoUser.fullName,
              email: matchingDemoUser.email,
              brokerId:
                role === 'Broker' ? state.activeBrokerId : undefined,
              firmName: matchingDemoUser.firmName,
            }
          : null;

        if (updatedUser) {
          try {
            localStorage.setItem(SAVED_USER_KEY, JSON.stringify(updatedUser));
          } catch {
            // ignore
          }
        }

        return {
          role,
          currentUser: updatedUser,
          activeScreen: nextScreen,
          selectedUnitId: null,
        };
      }),

    setActiveBrokerId: (brokerId) =>
      set((state) => {
        const broker = state.brokers.find((b) => b.id === brokerId);
        const updatedUser: AuthenticatedUser | null =
          state.currentUser && state.role === 'Broker' && broker
            ? {
                ...state.currentUser,
                brokerId: broker.id,
                fullName: broker.name,
                email: broker.email,
                firmName: broker.firmName,
              }
            : state.currentUser;

        if (updatedUser) {
          try {
            localStorage.setItem(SAVED_USER_KEY, JSON.stringify(updatedUser));
          } catch {
            // ignore
          }
        }

        return { activeBrokerId: brokerId, currentUser: updatedUser };
      }),

    setActiveScreen: (screen) => set({ activeScreen: screen }),

    setSelectedProjectId: (projectId) =>
      set({
        selectedProjectId: projectId,
        selectedUnitId: null,
      }),

    setSelectedUnitId: (unitId) => set({ selectedUnitId: unitId }),

    openBookingModal: (preset) =>
      set({
        bookingModal: {
          isOpen: true,
          preselectedLeadId: preset?.leadId,
          preselectedUnitId: preset?.unitId,
          preselectedProjectId: preset?.projectId,
        },
      }),

    closeBookingModal: () =>
      set({
        bookingModal: {
          isOpen: false,
        },
      }),

    setCopilotOpen: (open) => set({ isCopilotOpen: open }),

    dismissToast: () => set({ toast: null }),

    updateUnitStatus: (unitId, status, heldByLeadId) =>
      set((state) => {
        const targetUnit = state.units.find((u) => u.id === unitId);
        if (!targetUnit) return state;

        const project = state.projects.find(
          (p) => p.id === targetUnit.projectId
        );
        const updatedUnitObj: PropertyUnit = {
          ...targetUnit,
          status,
          heldByLeadId: status === 'Hold' ? heldByLeadId : undefined,
          version: targetUnit.version + 1,
        };

        const updatedUnits = state.units.map((u) =>
          u.id === unitId ? updatedUnitObj : u
        );

        const newActivity: ActivityEvent = {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          category: 'Inventory',
          actorName:
            state.role === 'Admin'
              ? 'Mandate Inventory Desk'
              : 'Channel Partner Desk',
          actorRole: state.role === 'Admin' ? 'Mandate HQ' : 'Channel Partner',
          projectId: targetUnit.projectId,
          message: `Unit ${targetUnit.unitNumber} in ${project?.name || 'Project'} marked as '${status}'.`,
        };

        void upsertUnitInSupabase(updatedUnitObj);
        void insertActivityInSupabase(newActivity);

        return {
          units: updatedUnits,
          activities: [newActivity, ...state.activities],
          toast: {
            id: `toast-${Date.now()}`,
            title: `Unit ${targetUnit.unitNumber} Updated to ${status}`,
            description: `${project?.name} · Floor ${targetUnit.floor} (${targetUnit.bhk}) is now ${status}.`,
            type: status === 'Hold' ? 'warning' : 'info',
          },
        };
      }),

    updateLeadStage: (leadId, stage) =>
      set((state) => {
        const lead = state.leads.find((l) => l.id === leadId);
        if (!lead) return state;

        const project = state.projects.find((p) => p.id === lead.projectId);
        const broker = state.brokers.find(
          (b) => b.id === lead.assignedBrokerId
        );

        const updatedLeadObj: Lead = { ...lead, stage };
        const updatedLeads = state.leads.map((l) =>
          l.id === leadId ? updatedLeadObj : l
        );

        const newActivity: ActivityEvent = {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          category: 'Lead',
          actorName: broker
            ? `${broker.name} (${broker.firmName})`
            : 'Sales Team',
          actorRole: state.role === 'Admin' ? 'Site Sales' : 'Channel Partner',
          projectId: lead.projectId,
          message: `Lead '${lead.buyerName}' moved to '${stage}' stage for ${project?.name}.`,
        };

        void upsertLeadInSupabase(updatedLeadObj);
        void insertActivityInSupabase(newActivity);

        return {
          leads: updatedLeads,
          activities: [newActivity, ...state.activities],
        };
      }),

    registerNewLead: (input) =>
      set((state) => {
        const project = state.projects.find((p) => p.id === input.projectId);
        const broker = state.brokers.find(
          (b) => b.id === input.assignedBrokerId
        );

        const newLead: Lead = {
          id: `lead-${Date.now()}`,
          buyerName: input.buyerName,
          phone: input.phone,
          email: input.email,
          projectId: input.projectId,
          interestedBhk: input.interestedBhk,
          budgetInr: input.budgetInr,
          stage: 'New',
          assignedBrokerId: input.assignedBrokerId,
          notes:
            input.notes || 'Registered via soleX Channel Partner portal.',
          createdAt: new Date().toISOString(),
        };

        const newActivity: ActivityEvent = {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          category: 'Lead',
          actorName: broker
            ? `${broker.name} (${broker.firmName})`
            : 'Mandate Desk',
          actorRole: 'Channel Partner',
          projectId: input.projectId,
          message: `Channel Partner '${broker?.name || 'Partner'}' registered a new lead (${input.buyerName}) for ${project?.name || 'Mandate'}.`,
        };

        const updatedMonthly = state.monthlySales.map((m, idx) =>
          idx === state.monthlySales.length - 1
            ? { ...m, leadsGenerated: m.leadsGenerated + 1 }
            : m
        );

        void upsertLeadInSupabase(newLead);
        void insertActivityInSupabase(newActivity);

        return {
          leads: [newLead, ...state.leads],
          monthlySales: updatedMonthly,
          activities: [newActivity, ...state.activities],
          toast: {
            id: `toast-${Date.now()}`,
            title: 'New Buyer Lead Registered',
            description: `${input.buyerName} assigned to ${broker?.name} for ${project?.name}.`,
            type: 'info',
          },
        };
      }),

    convertLeadToBooking: ({ leadId, unitId, brokerId, bookingNotes }) => {
      const state = get();
      const lead = state.leads.find((l) => l.id === leadId);
      const unit = state.units.find((u) => u.id === unitId);
      const broker = state.brokers.find((b) => b.id === brokerId);

      if (!lead || !unit || !broker) {
        return {
          success: false,
          error: 'Invalid lead, unit, or channel partner selection.',
        };
      }

      if (unit.status === 'Sold') {
        return {
          success: false,
          error: `Concurrency Guard: Unit ${unit.unitNumber} is already Sold (version ${unit.version}).`,
        };
      }

      const project = state.projects.find((p) => p.id === unit.projectId);
      const agreementValueInr = getUnitAllInclusivePrice(unit);
      const commissionPct = project?.brokerSharePct ?? 2.0;
      const commissionAmountInr = Math.round(
        (agreementValueInr * commissionPct) / 100
      );
      const agreementCr = Number((agreementValueInr / 10000000).toFixed(2));
      const bookingId = `bkg-${Date.now()}`;

      const newBooking: BookingRecord = {
        id: bookingId,
        projectId: unit.projectId,
        unitId: unit.id,
        leadId: lead.id,
        brokerId: broker.id,
        agreementValueInr,
        commissionPct,
        commissionAmountInr,
        commissionStatus: 'Pending Approval',
        bookedAt: new Date().toISOString(),
      };

      const updatedUnitObj: PropertyUnit = {
        ...unit,
        status: 'Sold' as UnitStatus,
        heldByLeadId: undefined,
        bookedByLeadId: lead.id,
        bookedByBrokerId: broker.id,
        version: unit.version + 1,
      };

      const updatedUnits = state.units.map((u) =>
        u.id === unit.id ? updatedUnitObj : u
      );

      const updatedLeadObj: Lead = {
        ...lead,
        stage: 'Booked' as LeadStage,
        projectId: unit.projectId,
        assignedBrokerId: broker.id,
        bookedUnitId: unit.id,
        notes: bookingNotes
          ? `${lead.notes} | Booking Confirmed: Unit ${unit.unitNumber} (${bookingNotes})`
          : `${lead.notes} | Confirmed allotment for Unit ${unit.unitNumber}.`,
      };

      const updatedLeads = state.leads.map((l) =>
        l.id === lead.id ? updatedLeadObj : l
      );

      const updatedMonthlySales = state.monthlySales.map((m, idx) =>
        idx === state.monthlySales.length - 1
          ? {
              ...m,
              conversions: m.conversions + 1,
              salesVolumeCr: Number((m.salesVolumeCr + agreementCr).toFixed(2)),
              pendingCommissionsInr:
                m.pendingCommissionsInr + commissionAmountInr,
            }
          : m
      );

      const bookingEvent: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: 'Just now',
        category: 'Booking',
        actorName: `${broker.name} (${broker.firmName})`,
        actorRole: 'Channel Partner',
        projectId: unit.projectId,
        message: `Unit ${unit.unitNumber} (${project?.name}) booked by '${lead.buyerName}' via Channel Partner '${broker.name}'. Commission of ${formatInrCompact(commissionAmountInr)} queued.`,
        amountInr: agreementValueInr,
      };

      void upsertUnitInSupabase(updatedUnitObj);
      void upsertLeadInSupabase(updatedLeadObj);
      void upsertBookingInSupabase(newBooking);
      void insertActivityInSupabase(bookingEvent);

      set({
        units: updatedUnits,
        leads: updatedLeads,
        bookings: [newBooking, ...state.bookings],
        monthlySales: updatedMonthlySales,
        activities: [bookingEvent, ...state.activities],
        selectedProjectId: unit.projectId,
        bookingModal: { isOpen: false },
        toast: {
          id: `toast-${Date.now()}`,
          title: `Booking Confirmed — Unit ${unit.unitNumber} Marked Sold`,
          description: `${formatInrCompact(agreementValueInr)} added to Monthly Sales Volume · ${formatInrCompact(commissionAmountInr)} commission credited to ${broker.name}.`,
          type: 'success',
          actionLabel: 'Inspect Inventory Matrix',
          actionScreen: 'projects',
        },
      });

      return { success: true, bookingId };
    },

    advanceCommissionStatus: (bookingId) =>
      set((state) => {
        const target = state.bookings.find((b) => b.id === bookingId);
        if (!target) return state;

        const nextStatus: CommissionStatus =
          target.commissionStatus === 'Pending Approval'
            ? 'Approved'
            : target.commissionStatus === 'Approved'
            ? 'Released'
            : 'Released';

        const broker = state.brokers.find((b) => b.id === target.brokerId);
        const unit = state.units.find((u) => u.id === target.unitId);
        const project = state.projects.find((p) => p.id === target.projectId);

        const updatedBookingObj: BookingRecord = {
          ...target,
          commissionStatus: nextStatus,
        };

        const updatedBookings = state.bookings.map((b) =>
          b.id === bookingId ? updatedBookingObj : b
        );

        const nextPendingCommissionsInr = updatedBookings
          .filter((b) => b.commissionStatus !== 'Released')
          .reduce((sum, b) => sum + b.commissionAmountInr, 0);

        const updatedMonthlySales = state.monthlySales.map((m, idx) =>
          idx === state.monthlySales.length - 1
            ? {
                ...m,
                pendingCommissionsInr: nextPendingCommissionsInr,
              }
            : m
        );

        const newActivity: ActivityEvent = {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          category: 'Commission',
          actorName: 'Mandate Finance Desk',
          actorRole: 'Mandate HQ',
          projectId: target.projectId,
          message: `Commission of ${formatInrCompact(target.commissionAmountInr)} for ${broker?.name} (${project?.name} Unit ${unit?.unitNumber}) updated to '${nextStatus}'.`,
          amountInr: target.commissionAmountInr,
        };

        void upsertBookingInSupabase(updatedBookingObj);
        void insertActivityInSupabase(newActivity);

        return {
          bookings: updatedBookings,
          monthlySales: updatedMonthlySales,
          activities: [newActivity, ...state.activities],
          toast: {
            id: `toast-${Date.now()}`,
            title: `Commission Status: ${nextStatus}`,
            description: `${formatInrCompact(target.commissionAmountInr)} payout for ${broker?.firmName} is now ${nextStatus}.`,
            type: 'info',
          },
        };
      }),
  };
});
