import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Employee } from '../models/Employee.js';
import { generateToken, AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('employeeProfile');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User does not exist.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your company administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          status: user.status,
          isTemporaryPassword: user.isTemporaryPassword,
          employeeProfile: user.employeeProfile,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await User.findById(req.user._id).populate({
      path: 'employeeProfile',
      populate: [{ path: 'department' }, { path: 'designation' }],
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch user';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If not temporary password, require current password
    if (!user.isTemporaryPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }
    }

    user.password = newPassword;
    user.isTemporaryPassword = false;
    await user.save();

    await logAuditEvent(req, 'PASSWORD_CHANGED', 'User', user._id.toString());

    res.json({
      success: true,
      message: 'Password changed successfully. You may now continue using your account.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Password change failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createHrAccount(req: AuthRequest, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'HR email is required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const temporaryPassword = password || `HR_${crypto.randomBytes(4).toString('hex')}!`;

    const hrUser = new User({
      email: email.toLowerCase().trim(),
      password: temporaryPassword,
      role: 'hr',
      status: 'active',
      isTemporaryPassword: true,
    });

    await hrUser.save();

    await logAuditEvent(req, 'HR_ACCOUNT_CREATED', 'User', hrUser._id.toString(), undefined, { email });

    res.status(201).json({
      success: true,
      message: 'HR account created successfully.',
      data: {
        user: {
          _id: hrUser._id,
          email: hrUser.email,
          role: hrUser.role,
          status: hrUser.status,
          isTemporaryPassword: hrUser.isTemporaryPassword,
        },
        temporaryPassword,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'HR creation failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function resetUserPassword(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tempPassword = newPassword || `Reset_${crypto.randomBytes(4).toString('hex')}!`;
    user.password = tempPassword;
    user.isTemporaryPassword = true;
    await user.save();

    await logAuditEvent(req, 'PASSWORD_RESET_BY_ADMIN', 'User', user._id.toString(), undefined, {
      targetEmail: user.email,
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${user.email}.`,
      data: {
        temporaryPassword: tempPassword,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Password reset failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function toggleUserStatus(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent Admin from deactivating themselves
    if (user._id.toString() === req.user?._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
    }

    const previousStatus = user.status;
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    await logAuditEvent(req, 'USER_STATUS_TOGGLED', 'User', user._id.toString(), { status: previousStatus }, { status: user.status });

    res.json({
      success: true,
      message: `User ${user.email} is now ${user.status}.`,
      data: user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status update failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function listUsers(req: AuthRequest, res: Response) {
  try {
    const { role, status, search } = req.query;
    const query: Record<string, unknown> = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.email = { $regex: String(search), $options: 'i' };
    }

    const users = await User.find(query)
      .populate('employeeProfile', 'fullName employeeCode')
      .sort({ createdAt: -1 })
      .select('-password');

    res.json({
      success: true,
      data: users,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'List users failed';
    res.status(500).json({ success: false, message: msg });
  }
}
