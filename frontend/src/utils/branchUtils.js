/**
 * Branch Utilities for Hanara E-School
 * - Zogbeli Branch: Nursery 1, Nursery 2, KG 1, KG 2, Primary 1 to Primary 4
 * - Vittin Branch: Primary 5, Primary 6, JHS 1 to JHS 3
 */

export const ZOGBELI_CLASSES = [
  'Nursery 1', 'Nursery 2',
  'KG 1', 'KG 2',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4',
  'BS1', 'BS2', 'BS3', 'BS4', 'N1', 'N2', 'KG1', 'KG2'
];

export const VITTIN_CLASSES = [
  'Primary 5', 'Primary 6',
  'JHS 1', 'JHS 2', 'JHS 3',
  'BS5', 'BS6', 'BS7', 'BS8', 'BS9'
];

/**
 * Determine branch for a class name or level code.
 * @param {string} className 
 * @returns {'Zogbeli' | 'Vittin'}
 */
export function getBranchForClass(className) {
  if (!className) return 'Zogbeli';
  const nameLower = className.toLowerCase().trim();

  if (
    nameLower.includes('primary 5') ||
    nameLower.includes('primary 6') ||
    nameLower.includes('jhs') ||
    nameLower.includes('bs5') ||
    nameLower.includes('bs6') ||
    nameLower.includes('bs7') ||
    nameLower.includes('bs8') ||
    nameLower.includes('bs9')
  ) {
    return 'Vittin';
  }

  return 'Zogbeli';
}

/**
 * Infer primary branch from assigned classes or staff branch property.
 * Role rules:
 * - Drivers: Stationed at Vittin Branch
 * - Admin / Headmaster & Accountant: Present at Both Branches
 * - Teachers: Inferred from assigned classes (Nursery1-P4: Zogbeli; P5-JHS3: Vittin)
 * @param {object} staff 
 * @returns {'Zogbeli' | 'Vittin' | 'Both'}
 */
export function getStaffBranch(staff) {
  if (!staff) return 'Zogbeli';
  const role = (staff.role || '').toLowerCase();

  // Headmaster / Admin & Accountant are present at both branches
  if (role === 'admin' || role === 'superadmin' || role === 'system_admin' || role === 'accountant') {
    return 'Both';
  }

  // Drivers are stationed at Vittin branch
  if (role === 'driver') {
    return 'Vittin';
  }

  if (staff.branch && (staff.branch === 'Zogbeli' || staff.branch === 'Vittin' || staff.branch === 'Both')) {
    return staff.branch;
  }

  if (Array.isArray(staff.classesAssigned) && staff.classesAssigned.length > 0) {
    const hasVittinClass = staff.classesAssigned.some((c) => {
      const name = c.name || c.displayName || c.level?.displayName || '';
      return getBranchForClass(name) === 'Vittin';
    });
    return hasVittinClass ? 'Vittin' : 'Zogbeli';
  }

  return 'Zogbeli';
}
