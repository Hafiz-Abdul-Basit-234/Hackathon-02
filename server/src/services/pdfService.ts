import { jsPDF } from 'jspdf';
import { CompanySettings } from '../models/CompanySettings.js';
import { IPayslipDocument } from '../models/Payroll.js';
import { IEmployeeDocument } from '../models/Employee.js';

export class PdfService {
  static async generatePayslipPdf(payslip: IPayslipDocument, employee: IEmployeeDocument): Promise<Buffer> {
    const company = (await CompanySettings.findOne()) || {
      name: 'Saylani HCM Enterprise',
      email: 'hr@saylani.org',
      phone: '+92 21 111 729 526',
      address: 'Saylani Head Office, Karachi',
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
    const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
    const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200

    // Header Background
    doc.setFillColor(...lightBg);
    doc.rect(0, 0, 210, 42, 'F');

    // Accent line
    doc.setFillColor(...accentColor);
    doc.rect(0, 41, 210, 1.5, 'F');

    // Company Name & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(company.name || 'Saylani HCM Lite', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(company.address || 'Karachi, Pakistan', 15, 25);
    doc.text(`Email: ${company.email} | Phone: ${company.phone || 'N/A'}`, 15, 30);

    // Payslip Title & Month
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...accentColor);
    doc.text('OFFICIAL PAYSLIP', 195, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(`Period: ${payslip.month}`, 195, 25, { align: 'right' });
    doc.text(`Status: ${payslip.status.toUpperCase()}`, 195, 31, { align: 'right' });

    // Employee Information Block
    doc.setDrawColor(...borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 48, 180, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('Employee Information', 20, 55);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    doc.text(`Employee Name:`, 20, 62);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${employee.fullName}`, 55, 62);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Employee Code:`, 20, 69);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${employee.employeeCode}`, 55, 69);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Working Days:`, 120, 62);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${payslip.workingDays} Days`, 160, 62);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Daily Rate:`, 120, 69);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`PKR ${payslip.dailySalary.toLocaleString()}`, 160, 69);

    // Earnings and Deductions Table
    // Left Box: Earnings
    doc.setFillColor(...lightBg);
    doc.roundedRect(15, 82, 87, 85, 2, 2, 'FD');
    doc.setFillColor(...primaryColor);
    doc.rect(15, 82, 87, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('EARNINGS & ALLOWANCES', 20, 87.5);
    doc.text('AMOUNT (PKR)', 98, 87.5, { align: 'right' });

    doc.setFontSize(9);
    let y = 98;
    const earnings = [
      { label: 'Basic Salary', val: payslip.basicSalary },
      { label: 'House Rent Allowance (HRA)', val: payslip.hra },
      { label: 'Medical Allowance', val: payslip.medicalAllowance },
      { label: 'Other Allowances', val: payslip.otherAllowances },
    ];

    earnings.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(item.label, 20, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(item.val.toLocaleString(), 98, y, { align: 'right' });
      y += 10;
    });

    // Total Gross Line
    doc.setDrawColor(...borderColor);
    doc.line(18, 145, 99, 145);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.text('GROSS SALARY', 20, 155);
    doc.text(`PKR ${payslip.grossSalary.toLocaleString()}`, 98, 155, { align: 'right' });

    // Right Box: Deductions
    doc.setFillColor(...lightBg);
    doc.roundedRect(108, 82, 87, 85, 2, 2, 'FD');
    doc.setFillColor(220, 38, 38); // Red 600
    doc.rect(108, 82, 87, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DEDUCTIONS & TAXES', 113, 87.5);
    doc.text('AMOUNT (PKR)', 191, 87.5, { align: 'right' });

    y = 98;
    const deductions = [
      { label: `Absent Deductions (${payslip.absentDays}d)`, val: payslip.attendanceDeductions },
      { label: `Unpaid Leave (${payslip.unpaidLeaveDays}d)`, val: payslip.leaveDeductions },
      { label: `Half-Day Penalties (${payslip.halfDays})`, val: Math.round(payslip.halfDays * 0.5 * payslip.dailySalary) },
      { label: 'Income Tax', val: payslip.tax },
    ];

    deductions.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(item.label, 113, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(item.val.toLocaleString(), 191, y, { align: 'right' });
      y += 10;
    });

    const totalDeductions =
      payslip.attendanceDeductions +
      payslip.leaveDeductions +
      Math.round(payslip.halfDays * 0.5 * payslip.dailySalary) +
      payslip.tax;

    doc.line(111, 145, 192, 145);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text('TOTAL DEDUCTIONS', 113, 155);
    doc.text(`PKR ${totalDeductions.toLocaleString()}`, 191, 155, { align: 'right' });

    // Net Salary Banner
    doc.setFillColor(...primaryColor);
    doc.roundedRect(15, 175, 180, 24, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('NET SALARY PAYABLE:', 25, 189);

    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94); // Emerald 500
    doc.text(`PKR ${payslip.netSalary.toLocaleString()}`, 190, 189, { align: 'right' });

    // Footer & Disclaimer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated document from Saylani HCM Lite and does not require a physical signature.', 105, 245, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Record ID: ${payslip._id}`, 105, 250, { align: 'center' });

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
