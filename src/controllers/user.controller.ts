import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { Request as RequestModel } from '../models/request.model';

// ---------------------------------------------------------------------------
// GET /api/v1/users  (Admin/Super Admin — list staff/admins)
// ---------------------------------------------------------------------------
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const search = req.query.search as string;
  const role = req.query.role as string;
  const status = req.query.status as string;

  const query: Record<string, any> = {};

  if (role) {
    query.role = role;
  } else {
    query.role = { $in: [Role.STAFF, Role.ADMIN] };
  }

  if (status) {
    query.isActive = status === 'active';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  if (role === Role.CUSTOMER) {
    for (const u of users) {
      const latestRequest = await RequestModel.findOne({ customer: u._id })
        .populate('service', 'name')
        .sort({ createdAt: -1 })
        .lean();
      if (latestRequest) {
        (u as any).currentRequest = {
          applicationNumber: latestRequest.applicationNumber,
          serviceName: (latestRequest.service as any)?.name || 'Service',
          status: latestRequest.status,
        };
      }
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Users retrieved successfully',
    ),
  );
});

import { Application } from '../models/application.model';
import { EntitlementService } from '../services/entitlement.service';

// ---------------------------------------------------------------------------
// POST /api/v1/users  (Admin/Super Admin — create staff/admins)
// ---------------------------------------------------------------------------
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, mobile, password, role, isActive } = req.body;

  // Check duplicates
  const emailExists = await User.exists({ email: email.toLowerCase().trim() });
  if (emailExists) throw ApiError.conflict('Email is already registered');

  const mobileExists = await User.exists({ mobile: mobile.trim() });
  if (mobileExists) throw ApiError.conflict('Mobile number is already registered');

  // Enforce active user seat quota for staff/admins
  const isCountableSeat = [Role.ADMIN, Role.STAFF].includes(role) && (isActive ?? true);
  let app: any = null;
  if (isCountableSeat && req.tenantId) {
    app = await Application.findOne({ tenantId: req.tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      await EntitlementService.reserveUserSeat(app._id);
    }
  }

  let user: any = null;
  try {
    // Create staff user (with verification flags true by default since admin is provisioning)
    user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password,
      role,
      isActive: isActive ?? true,
      isEmailVerified: true,
    });
  } catch (err) {
    if (isCountableSeat && app) {
      await EntitlementService.releaseUserSeat(app._id);
    }
    throw err;
  }

  const responseUser = user.toObject();
  delete (responseUser as any).password;

  res.status(201).json(new ApiResponse(201, responseUser, 'User created successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/:id  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw ApiError.notFound('User not found');

  if (!user.cardVerificationToken) {
    user.cardVerificationToken = crypto.randomBytes(16).toString('hex');
    await user.save();
  }

  res.status(200).json(new ApiResponse(200, user, 'User retrieved successfully'));
});

// ---------------------------------------------------------------------------
// PUT /api/v1/users/:id  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, mobile, password, role, isActive } = req.body;
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  // Check email duplicate
  if (email && email.toLowerCase().trim() !== user.email) {
    const emailExists = await User.exists({ email: email.toLowerCase().trim(), _id: { $ne: userId } });
    if (emailExists) throw ApiError.conflict('Email is already registered');
    user.email = email.toLowerCase().trim();
  }

  // Check mobile duplicate
  if (mobile && mobile.trim() !== user.mobile) {
    const mobileExists = await User.exists({ mobile: mobile.trim(), _id: { $ne: userId } });
    if (mobileExists) throw ApiError.conflict('Mobile number is already registered');
    user.mobile = mobile.trim();
  }

  if (name) user.name = name;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password && password.trim() !== '') {
    user.password = password;
  }

  await user.save();

  const responseUser = user.toObject();
  delete (responseUser as any).password;

  res.status(200).json(new ApiResponse(200, responseUser, 'User updated successfully'));
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/users/:id  (Admin/Super Admin)
// ---------------------------------------------------------------------------
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Prevent admin from deactivating self
  if (req.user && String(user._id) === req.user.userId) {
    throw ApiError.badRequest('You cannot delete or deactivate your own account');
  }

  const wasCountable = [Role.ADMIN, Role.STAFF].includes(user.role) && user.isActive;
  await User.findByIdAndDelete(user._id);

  if (wasCountable && req.tenantId) {
    const app = await Application.findOne({ tenantId: req.tenantId }).setOptions({ bypassTenantQuery: true });
    if (app) {
      await EntitlementService.releaseUserSeat(app._id);
    }
  }

  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});
