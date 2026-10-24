import { CompanySettings } from '../models/CompanySettings.js';
import { Holiday } from '../models/Holiday.js';

export interface WorkingDaysCalculation {
  totalDays: number;
  weekendDaysCount: number;
  holidayDaysCount: number;
  effectiveWorkingDays: number;
}

export class PolicyService {
  /**
   * Calculate effective working days between two dates (inclusive),
   * excluding configured weekends and registered public holidays.
   */
  static async calculateWorkingDays(startDateStr: string, endDateStr: string): Promise<WorkingDaysCalculation> {
    const settings = await CompanySettings.findOne() || {
      weekendDays: ['saturday', 'sunday'],
    };

    const holidays = await Holiday.find({
      date: { $gte: startDateStr, $lte: endDateStr },
    });
    const holidayDates = new Set(holidays.map((h) => h.date));

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const weekendNames = (settings.weekendDays || ['saturday', 'sunday']).map((w: string) => w.toLowerCase());

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    let totalDays = 0;
    let weekendDaysCount = 0;
    let holidayDaysCount = 0;
    let effectiveWorkingDays = 0;

    const current = new Date(start);
    while (current <= end) {
      totalDays++;
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = dayNames[current.getDay()];

      if (weekendNames.includes(dayOfWeek)) {
        weekendDaysCount++;
      } else if (holidayDates.has(dateStr)) {
        holidayDaysCount++;
      } else {
        effectiveWorkingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      totalDays,
      weekendDaysCount,
      holidayDaysCount,
      effectiveWorkingDays: Math.max(1, effectiveWorkingDays),
    };
  }

  /**
   * Calculate number of total working days in a month.
   */
  static async getMonthWorkingDays(year: number, month: number): Promise<number> {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const result = await this.calculateWorkingDays(startStr, endStr);
    return result.effectiveWorkingDays;
  }

  /**
   * Challenge annual tax slab calculation converted to monthly tax.
   */
  static calculateMonthlyTax(monthlyGross: number): number {
    const annualGross = monthlyGross * 12;
    let annualTax = 0;

    if (annualGross <= 600000) {
      annualTax = 0;
    } else if (annualGross <= 1200000) {
      annualTax = (annualGross - 600000) * 0.025;
    } else if (annualGross <= 2400000) {
      annualTax = 15000 + (annualGross - 1200000) * 0.125;
    } else if (annualGross <= 3600000) {
      annualTax = 165000 + (annualGross - 2400000) * 0.225;
    } else {
      annualTax = 435000 + (annualGross - 3600000) * 0.35;
    }

    return Math.round(annualTax / 12);
  }

  /**
   * Structured policy repository for Policy Q&A.
   */
  static getStructuredPolicies(): string {
    return `
### SAYLANI HCM LITE OFFICIAL COMPANY POLICIES:

1. WORK HOURS & ATTENDANCE:
   - Official Office Start Time: 09:00 AM.
   - Grace Period: 15 minutes (Arrivals between 09:00 AM and 09:15 AM are counted as Present).
   - Late Attendance: Arrivals after 09:15 AM are strictly marked as 'Late'.
   - Half Day Threshold: Total work duration less than 5 hours is marked as 'Half Day' (deducts 0.5 day pay).
   - Missing Checkout: An attendance check-in without an evening check-out is marked as 'Missing Checkout'.
   - Absent: No check-in record and no approved leave on a working day marks the employee as 'Absent' (full day pay deducted).
   - Check-in Rule: Web check-in creates exactly 1 record per employee per day. Duplicate check-ins return HTTP 409 conflict.
   - Attendance Correction: Employees may submit an attendance correction request specifying date, revised times, and reason. HR must approve or reject with a comment.

2. LEAVE ENTITLEMENTS & RULES:
   - Annual Leave: 14 days per calendar year (Paid).
   - Sick Leave: 8 days per calendar year (Paid).
   - Casual Leave: 10 days per calendar year (Paid).
   - Unpaid Leave: Unlimited days, subject to managerial approval (Deducted from payroll).
   - Working Days Calculation: Leaves exclude company weekends (Saturday & Sunday by default) and registered Public Holidays.
   - Leave Submission: Requires leave type, start date, end date, and reason. Overlapping leaves and requests exceeding remaining balances are rejected (HTTP 422).
   - Approval Flow: Employee submits -> Status is Pending -> HR approves or rejects with comment -> Balance decremented only upon approval.

3. PAYROLL & COMPENSATION RULES:
   - Salary Structure:
     * Gross Salary = 1.5 × Basic Salary (plus any approved custom allowances).
     * House Rent Allowance (HRA) = 40% of Basic Salary.
     * Medical Allowance = 10% of Basic Salary.
   - Per-Day Salary Formula: Gross Salary ÷ Total Working Days in the calendar month.
   - Attendance Deductions:
     * Full Day Absent = 1 × Per-Day Salary.
     * Unpaid Leave = 1 × Per-Day Salary per day taken.
     * Half Day = 0.5 × Per-Day Salary per half day recorded.
   - Income Tax Slabs:
     * Annual income up to 600,000 PKR: 0% tax.
     * 600,001 to 1,200,000 PKR: 2.5% of amount exceeding 600,000.
     * 1,200,001 to 2,400,000 PKR: 15,000 PKR + 12.5% of amount exceeding 1,200,000.
     * 2,400,001 to 3,600,000 PKR: 165,000 PKR + 22.5% of amount exceeding 2,400,000.
     * Above 3,600,000 PKR: 435,000 PKR + 35% of amount exceeding 3,600,000.
     * Monthly tax deduction is calculated as Annual Tax ÷ 12.
   - Net Salary Formula: Gross Salary − Attendance Deductions − Leave Deductions − Income Tax.
   - Payroll Roles: HR can generate and review drafts. Only Admin can finalize payroll. Once finalized, payroll is locked permanently against modifications.

4. PRIVACY & SECURITY POLICIES:
   - Employees may ONLY view their own personal attendance, leave balances, leave history, and payslips.
   - Employees are STRICTLY FORBIDDEN from viewing other employees' salaries, attendance, or personal data.
   - Any question from an employee regarding another staff member's remuneration will be politely refused.
`;
  }
}
