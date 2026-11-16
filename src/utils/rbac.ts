import { UserRole } from '../types/audit';

export interface RolePermissions {
  role: UserRole;
  labelAr: string;
  labelEn: string;
  labelFr: string;
  canViewDashboard: boolean;
  canCreateLedger: boolean;
  canReconcileLedger: boolean;
  canApproveRebates: boolean;
  canArchiveRecords: boolean;
  canManageRooms: boolean;
  canPostRoomCashier: boolean;
  canLockDay: boolean;
  canUnlockDay: boolean;
  canOverrideDayClose: boolean;
  canEditKwentra: boolean;
  canEditSettings: boolean;
  canManageSecurity: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  Administrator: {
    role: 'Administrator',
    labelAr: 'مدير النظام (Administrator)',
    labelEn: 'Administrator',
    labelFr: 'Administrateur',
    canViewDashboard: true,
    canCreateLedger: true,
    canReconcileLedger: true,
    canApproveRebates: true,
    canArchiveRecords: true,
    canManageRooms: true,
    canPostRoomCashier: true,
    canLockDay: true,
    canUnlockDay: true,
    canOverrideDayClose: true,
    canEditKwentra: true,
    canEditSettings: true,
    canManageSecurity: true,
  },
  IncomeAuditor: {
    role: 'IncomeAuditor',
    labelAr: 'مراجع الإيرادات (Income Auditor)',
    labelEn: 'Income Auditor',
    labelFr: 'Auditeur Revenus',
    canViewDashboard: true,
    canCreateLedger: true,
    canReconcileLedger: true,
    canApproveRebates: true,
    canArchiveRecords: true,
    canManageRooms: true,
    canPostRoomCashier: true,
    canLockDay: true,
    canUnlockDay: true,
    canOverrideDayClose: true,
    canEditKwentra: true,
    canEditSettings: true,
    canManageSecurity: false,
  },
  NightAuditor: {
    role: 'NightAuditor',
    labelAr: 'المراجع الليلي (Night Auditor)',
    labelEn: 'Night Auditor',
    labelFr: 'Auditeur de Nuit',
    canViewDashboard: true,
    canCreateLedger: true,
    canReconcileLedger: true,
    canApproveRebates: false,
    canArchiveRecords: false,
    canManageRooms: true,
    canPostRoomCashier: true,
    canLockDay: true,
    canUnlockDay: false,
    canOverrideDayClose: false,
    canEditKwentra: true,
    canEditSettings: false,
    canManageSecurity: false,
  },
  FrontOffice: {
    role: 'FrontOffice',
    labelAr: 'الاستقبال (Front Office)',
    labelEn: 'Front Office',
    labelFr: 'Réception (Front Office)',
    canViewDashboard: true,
    canCreateLedger: true,
    canReconcileLedger: false,
    canApproveRebates: false,
    canArchiveRecords: false,
    canManageRooms: true,
    canPostRoomCashier: true,
    canLockDay: false,
    canUnlockDay: false,
    canOverrideDayClose: false,
    canEditKwentra: false,
    canEditSettings: false,
    canManageSecurity: false,
  },
  Cashier: {
    role: 'Cashier',
    labelAr: 'كاشير (Cashier / POS)',
    labelEn: 'Cashier',
    labelFr: 'Caissier',
    canViewDashboard: true,
    canCreateLedger: true,
    canReconcileLedger: false,
    canApproveRebates: false,
    canArchiveRecords: false,
    canManageRooms: false,
    canPostRoomCashier: true,
    canLockDay: false,
    canUnlockDay: false,
    canOverrideDayClose: false,
    canEditKwentra: false,
    canEditSettings: false,
    canManageSecurity: false,
  },
  ReadOnly: {
    role: 'ReadOnly',
    labelAr: 'قراءة فقط (Read Only)',
    labelEn: 'Read Only',
    labelFr: 'Lecture Seule',
    canViewDashboard: true,
    canCreateLedger: false,
    canReconcileLedger: false,
    canApproveRebates: false,
    canArchiveRecords: false,
    canManageRooms: false,
    canPostRoomCashier: false,
    canLockDay: false,
    canUnlockDay: false,
    canOverrideDayClose: false,
    canEditKwentra: false,
    canEditSettings: false,
    canManageSecurity: false,
  },
};

export function getRolePermissions(role?: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role ?? 'Administrator'] ?? ROLE_PERMISSIONS.Administrator;
}
