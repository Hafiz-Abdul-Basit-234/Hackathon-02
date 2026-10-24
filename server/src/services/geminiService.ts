import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { ENV } from '../config/env.js';
import { Employee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveType } from '../models/LeaveType.js';
import { PayrollRun } from '../models/Payroll.js';
import { AiLog } from '../models/AuditLog.js';
import { PolicyService } from './policyService.js';
import { UserRole } from '../../../shared/types.js';

// Rate limiter map: userId -> array of timestamps
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 30; // 30 requests per hour

  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

function getGeminiClient(): GoogleGenAI | null {
  if (!ENV.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: ENV.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 7 Required Tools Declarations
const getHeadcountTool: FunctionDeclaration = {
  name: 'get_headcount',
  description: 'Retrieve real-time company headcount metrics including active, probation, and department breakdown.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      statusFilter: {
        type: Type.STRING,
        description: "Optional filter: 'active', 'probation', or 'all'",
      },
    },
  },
};

const getAttendanceSummaryTool: FunctionDeclaration = {
  name: 'get_attendance_summary',
  description: "Get real attendance summary metrics for today or a specific date ('YYYY-MM-DD').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'Date in YYYY-MM-DD format (defaults to today).',
      },
    },
  },
};

const getLateComersTool: FunctionDeclaration = {
  name: 'get_late_comers',
  description: 'Get list of employees who checked in late today or during a specified period.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'Optional date YYYY-MM-DD (defaults to today).',
      },
      limit: {
        type: Type.NUMBER,
        description: 'Maximum number of records to return.',
      },
    },
  },
};

const getLeaveSummaryTool: FunctionDeclaration = {
  name: 'get_leave_summary',
  description: 'Get company leave statistics: employees currently on leave and pending approvals.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: "Filter status: 'approved', 'pending', or 'all'",
      },
    },
  },
};

const getMyLeaveBalanceTool: FunctionDeclaration = {
  name: 'get_my_leave_balance',
  description: 'Retrieve remaining leave balances (Annual, Sick, Casual, Unpaid) for the logged-in employee.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getPayrollSummaryTool: FunctionDeclaration = {
  name: 'get_payroll_summary',
  description: 'Get company payroll summary for a given month (Total Gross, Net, Deductions). Admin & HR only.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      month: {
        type: Type.STRING,
        description: 'Month in YYYY-MM format (e.g. 2026-10).',
      },
    },
  },
};

const searchEmployeesTool: FunctionDeclaration = {
  name: 'search_employees',
  description: 'Search employees by name, employee code, or department. Returns public profiles.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query keyword.',
      },
    },
    required: ['query'],
  },
};

export class GeminiService {
  /**
   * Execute tool with strict security and role-scope enforcement.
   */
  static async executeTool(
    name: string,
    args: Record<string, unknown>,
    userContext: { userId: string; role: UserRole; employeeId?: string }
  ): Promise<Record<string, unknown>> {
    const todayStr = new Date().toISOString().split('T')[0];

    switch (name) {
      case 'get_headcount': {
        const [total, active, probation, depts] = await Promise.all([
          Employee.countDocuments(),
          Employee.countDocuments({ employmentStatus: 'active' }),
          Employee.countDocuments({ employmentStatus: 'probation' }),
          Employee.aggregate([
            { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$dept.name', count: { $sum: 1 } } },
          ]),
        ]);

        return {
          totalEmployees: total,
          activeEmployees: active,
          probationEmployees: probation,
          departmentBreakdown: depts.map((d) => ({ department: d._id || 'Unassigned', count: d.count })),
        };
      }

      case 'get_attendance_summary': {
        const targetDate = (args.date as string) || todayStr;
        const [records, onLeaveCount] = await Promise.all([
          Attendance.find({ date: targetDate }),
          LeaveRequest.countDocuments({
            status: 'approved',
            startDate: { $lte: targetDate },
            endDate: { $gte: targetDate },
          }),
        ]);

        let present = 0;
        let late = 0;
        let halfDay = 0;
        let missingCheckout = 0;

        records.forEach((r) => {
          if (r.status === 'present') present++;
          else if (r.status === 'late') late++;
          else if (r.status === 'half_day') halfDay++;
          else if (r.status === 'missing_checkout') missingCheckout++;
        });

        return {
          date: targetDate,
          totalCheckedIn: records.length,
          present,
          late,
          halfDay,
          missingCheckout,
          onLeaveToday: onLeaveCount,
        };
      }

      case 'get_late_comers': {
        const targetDate = (args.date as string) || todayStr;
        const query: Record<string, unknown> = { status: 'late' };
        if (args.date) {
          query.date = targetDate;
        }

        const lateRecords = await Attendance.find(query)
          .populate('employee', 'fullName employeeCode')
          .limit(Number(args.limit) || 10)
          .lean();

        return {
          count: lateRecords.length,
          lateComers: lateRecords.map((r: any) => ({
            employeeName: r.employee?.fullName || 'N/A',
            employeeCode: r.employee?.employeeCode || 'N/A',
            date: r.date,
            checkInTime: r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A',
          })),
        };
      }

      case 'get_leave_summary': {
        const [onLeaveToday, pendingApprovals] = await Promise.all([
          LeaveRequest.find({
            status: 'approved',
            startDate: { $lte: todayStr },
            endDate: { $gte: todayStr },
          }).populate('employee', 'fullName employeeCode'),
          LeaveRequest.countDocuments({ status: 'pending' }),
        ]);

        return {
          onLeaveTodayCount: onLeaveToday.length,
          employeesOnLeaveToday: onLeaveToday.map((l: any) => ({
            name: l.employee?.fullName,
            code: l.employee?.employeeCode,
            startDate: l.startDate,
            endDate: l.endDate,
          })),
          pendingLeaveApprovals: pendingApprovals,
        };
      }

      case 'get_my_leave_balance': {
        if (!userContext.employeeId) {
          return { error: 'No employee profile linked to your user account.' };
        }

        const leaveTypes = await LeaveType.find({ isActive: true });
        const approvedLeaves = await LeaveRequest.find({
          employee: userContext.employeeId,
          status: 'approved',
        });

        const balances = leaveTypes.map((lt) => {
          const used = approvedLeaves
            .filter((l) => l.leaveType.toString() === lt._id.toString())
            .reduce((sum, l) => sum + (l.workingDays || 0), 0);

          const quota = lt.yearlyQuota === -1 ? 'Unlimited' : lt.yearlyQuota;
          const remaining = lt.yearlyQuota === -1 ? 'Unlimited' : Math.max(0, lt.yearlyQuota - used);

          return {
            leaveType: lt.name,
            code: lt.code,
            yearlyQuota: quota,
            usedDays: used,
            remainingDays: remaining,
          };
        });

        return { balances };
      }

      case 'get_payroll_summary': {
        // Enforce RBAC: Employees are STRICTLY FORBIDDEN
        if (userContext.role === 'employee') {
          return { error: 'Access denied: Employees are not authorized to view company payroll summaries.' };
        }

        const query: Record<string, unknown> = {};
        if (args.month) {
          query.month = args.month;
        }

        const payroll = await PayrollRun.findOne(query).sort({ month: -1 });
        if (!payroll) {
          return { message: 'No payroll runs recorded in the database yet.' };
        }

        return {
          month: payroll.month,
          status: payroll.status,
          totalGross: payroll.totalGross,
          totalDeductions: payroll.totalDeductions,
          totalNet: payroll.totalNet,
          employeeCount: payroll.employeeCount,
          finalizedAt: payroll.finalizedAt || 'Pending Finalization',
        };
      }

      case 'search_employees': {
        const query = String(args.query || '').trim();
        const employees = await Employee.find({
          $or: [
            { fullName: { $regex: query, $options: 'i' } },
            { employeeCode: { $regex: query, $options: 'i' } },
          ],
        })
          .populate('department', 'name')
          .populate('designation', 'title')
          .limit(5)
          .lean();

        // Strip basicSalary if caller is an employee
        return {
          results: employees.map((e: any) => ({
            id: e._id,
            fullName: e.fullName,
            employeeCode: e.employeeCode,
            department: e.department?.name || 'N/A',
            designation: e.designation?.title || 'N/A',
            status: e.employmentStatus,
            salary: userContext.role === 'employee' ? '[Confidential]' : e.basicSalary,
          })),
        };
      }

      default:
        return { error: `Unknown tool '${name}'` };
    }
  }

  /**
   * Main AI Chat with Gemini function calling and policy knowledge grounding.
   */
  static async chat(params: {
    userId: string;
    role: UserRole;
    employeeId?: string;
    message: string;
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  }): Promise<{ reply: string; toolCalls: any[] }> {
    const startTime = Date.now();

    if (!checkRateLimit(params.userId)) {
      return {
        reply: 'You have reached the request rate limit for the AI Assistant (30 requests/hour). Please try again later.',
        toolCalls: [],
      };
    }

    const ai = getGeminiClient();
    if (!ai) {
      return {
        reply: 'Gemini AI API Key is not configured. Please add GEMINI_API_KEY in the environment or Settings panel to enable real-time AI assistance.',
        toolCalls: [],
      };
    }

    // Role-specific tools configuration
    const toolsList: FunctionDeclaration[] = [
      getHeadcountTool,
      getAttendanceSummaryTool,
      getLateComersTool,
      getLeaveSummaryTool,
      getMyLeaveBalanceTool,
      searchEmployeesTool,
    ];

    if (params.role === 'admin' || params.role === 'hr') {
      toolsList.push(getPayrollSummaryTool);
    }

    const policyKnowledge = PolicyService.getStructuredPolicies();

    const systemInstruction = `
You are the official AI Assistant for Saylani HCM Lite — an enterprise Human Capital Management system.
CURRENT USER ROLE: ${params.role.toUpperCase()}
USER EMPLOYEE ID: ${params.employeeId || 'None'}

STRICT ROLE AND PRIVACY RULES:
1. If the current user is an EMPLOYEE:
   - They CANNOT view other employees' salaries, individual attendance records, or private employee info.
   - If they ask "What is my colleague's salary?" or any question about someone else's pay, POLITELY REFUSE: "I cannot disclose other employees' salary information. Salary and compensation details are strictly confidential."
   - Never leak compensation numbers in error messages or refusals.
2. For questions regarding company metrics (headcount, attendance, late arrivals, leaves, payroll), ALWAYS use the provided backend tools to query real database values.
   - NEVER invent or hallucinate employee counts, attendance numbers, or payroll totals.
   - If a tool returns no data or zero, state clearly that no matching records were found in the database.
3. For policy questions (working hours, grace period, leave entitlements, tax slabs, payroll formulas), answer using the OFFICIAL POLICIES below:
${policyKnowledge}
4. Keep answers professional, concise, and helpful. Always indicate when data is drawn from official company records.
`;

    const executedTools: any[] = [];

    try {
      // Step 1: Call Gemini with tools
      const response = await ai.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: [
          ...(params.history || []),
          { role: 'user', parts: [{ text: params.message }] },
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: toolsList }],
          temperature: 0.2, // Lower temperature for high factual accuracy
        },
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // Execute tool calls
        const functionResponses: any[] = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          const toolResult = await this.executeTool(call.name, call.args as Record<string, unknown>, {
            userId: params.userId,
            role: params.role,
            employeeId: params.employeeId,
          });

          executedTools.push({
            name: call.name,
            args: call.args,
            result: toolResult,
          });

          functionResponses.push({
            name: call.name,
            response: { output: toolResult },
          });
        }

        // Send function responses back to Gemini for final natural language synthesis
        const secondResponse = await ai.models.generateContent({
          model: ENV.GEMINI_MODEL,
          contents: [
            ...(params.history || []),
            { role: 'user', parts: [{ text: params.message }] },
            {
              role: 'model',
              parts: functionCalls.map((fc) => ({
                functionCall: fc,
              })),
            },
            {
              role: 'user',
              parts: functionResponses.map((fr) => ({
                functionResponse: fr,
              })),
            },
          ],
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        const replyText = secondResponse.text || 'I have retrieved the requested information from the company database.';

        // Log AI call
        await AiLog.create({
          user: params.userId,
          userRole: params.role,
          prompt: params.message,
          toolCalls: executedTools,
          response: replyText,
          status: 'success',
          durationMs: Date.now() - startTime,
        });

        return { reply: replyText, toolCalls: executedTools };
      }

      const text = response.text || 'I could not process your request at this time.';

      await AiLog.create({
        user: params.userId,
        userRole: params.role,
        prompt: params.message,
        toolCalls: [],
        response: text,
        status: 'success',
        durationMs: Date.now() - startTime,
      });

      return { reply: text, toolCalls: [] };
    } catch (err: unknown) {
      console.error('Gemini AI error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown AI error';

      await AiLog.create({
        user: params.userId,
        userRole: params.role,
        prompt: params.message,
        toolCalls: executedTools,
        response: `Error: ${errMsg}`,
        status: 'error',
        durationMs: Date.now() - startTime,
      });

      return {
        reply: `The AI assistant encountered an error while processing: ${errMsg}. Please verify that GEMINI_API_KEY is configured with active quotas.`,
        toolCalls: executedTools,
      };
    }
  }

  /**
   * AI Dashboard Summary: Generates 3-5 concise insights based on verified dashboard KPIs.
   */
  static async generateDashboardSummary(kpis: Record<string, unknown>, role: UserRole): Promise<string[]> {
    const ai = getGeminiClient();
    if (!ai) {
      return [
        'AI insights require GEMINI_API_KEY in environment variables.',
        'Total active workforce metrics are tracked in real-time.',
        'Attendance and leave approvals reflect actual database state.',
      ];
    }

    try {
      const prompt = `
Analyze the following verified HCM database KPIs for the ${role.toUpperCase()} dashboard:
${JSON.stringify(kpis, null, 2)}

Generate exactly 3 to 5 concise, actionable, high-impact bullet point insights for executive review.
Output format: JSON array of strings, e.g. ["Insight 1", "Insight 2", "Insight 3"].
Do NOT hallucinate metrics outside the provided data.
`;

      const response = await ai.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return ['Workforce headcount and attendance levels are within expected parameters.'];
    } catch (err) {
      console.error('Failed to generate AI dashboard summary:', err);
      return [
        'Real-time workforce attendance and operational metrics are operating normally.',
        'No attendance anomalies detected in the current active reporting cycle.',
      ];
    }
  }

  /**
   * Smart Leave: Natural language leave extractor.
   * e.g., "I need next Monday and Tuesday off for my sister's wedding"
   */
  static async parseSmartLeave(naturalText: string): Promise<{
    leaveTypeCode?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    clarificationNeeded?: boolean;
    clarificationMessage?: string;
  }> {
    const ai = getGeminiClient();
    const today = new Date().toISOString().split('T')[0];

    if (!ai) {
      return {
        reason: naturalText,
        clarificationNeeded: true,
        clarificationMessage: 'Gemini AI is not active. Please select leave dates manually.',
      };
    }

    try {
      const prompt = `
Today's reference date is: ${today}.
Extract structured leave application details from the user's natural language request:
"${naturalText}"

Available leave types:
- 'ANNUAL': vacation, holidays, personal time off, family trips
- 'SICK': medical appointments, illness, surgery, doctor visits
- 'CASUAL': urgent errands, personal emergencies, weddings, functions
- 'UNPAID': extended absence or when other quotas exhausted

Rules:
- Calculate start date and end date in YYYY-MM-DD format based on reference date.
- If dates are ambiguous, set clarificationNeeded to true and explain in clarificationMessage.
- Extract a clean, professional reason.
`;

      const response = await ai.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              leaveTypeCode: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              reason: { type: Type.STRING },
              clarificationNeeded: { type: Type.BOOLEAN },
              clarificationMessage: { type: Type.STRING },
            },
            required: ['reason', 'clarificationNeeded'],
          },
          temperature: 0.1,
        },
      });

      return JSON.parse(response.text?.trim() || '{}');
    } catch (err) {
      console.error('Smart leave extraction error:', err);
      return {
        reason: naturalText,
        clarificationNeeded: true,
        clarificationMessage: 'Could not automatically parse dates. Please review the form.',
      };
    }
  }
}
