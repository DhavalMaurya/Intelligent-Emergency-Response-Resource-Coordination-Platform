import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Hospital } from '../models/Hospital.js';
import { IncidentUpdate } from '../models/IncidentUpdate.js';
import { AuthRequest } from '../middleware/auth.js';

// Zod Validation Schema for Hospital Status Update
export const updateHospitalStatusSchema = z.object({
  availableBeds: z.number().min(0).optional(),
  icuAvailable: z.number().min(0).optional(),
  totalBeds: z.number().min(1).optional(),
  status: z.enum(['NORMAL', 'HIGH_OCCUPANCY', 'DIVERT_STATUS']).optional(),
  contactPhone: z.string().optional(),
  coordinates: z
    .tuple([
      z.number().min(-180).max(180), // longitude
      z.number().min(-90).max(90),   // latitude
    ])
    .optional(),
});

/**
 * GET /api/v1/hospitals
 * List trauma centers with bed availability and status filters
 */
export const getHospitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { zone, status, minTraumaLevel } = req.query;

    const query: any = {};
    if (zone && zone !== 'ALL') {
      query.zone = zone;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (minTraumaLevel) {
      query.traumaLevel = { $gte: Number(minTraumaLevel) };
    }

    const hospitals = await Hospital.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: {
        hospitals,
        count: hospitals.length,
      },
    });
  } catch (error: any) {
    console.error('[Hospital Controller] Failed to fetch hospitals:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve hospital capacity records.', details: error.message },
    });
  }
};

/**
 * GET /api/v1/hospitals/nearest
 * Find nearest non-diverted hospital with available ICU/trauma beds using 2D geospatial query.
 * EXCLUDES DIVERT_STATUS hospitals automatically.
 */
export const getNearestHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lng, lat, requireICU, maxDistanceKm } = req.query;

    if (!lng || !lat) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required query parameters: lng, lat coordinates are required.' },
      });
      return;
    }

    const longitude = Number(lng);
    const latitude = Number(lat);

    if (isNaN(longitude) || isNaN(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid coordinate bounds. Longitude must be [-180, 180] and Latitude [-90, 90].' },
      });
      return;
    }

    const maxDistanceMeters = (Number(maxDistanceKm) || 15) * 1000;

    // Build query excluding DIVERT_STATUS and requiring positive bed capacity
    const query: any = {
      status: { $ne: 'DIVERT_STATUS' },
      availableBeds: { $gt: 0 },
    };

    if (requireICU === 'true') {
      query.icuAvailable = { $gt: 0 };
    }

    const candidateHospitals = await Hospital.find(query).lean();

    // Calculate distance for candidates and filter by max distance
    const rankedHospitals = candidateHospitals
      .map((h) => {
        const hLng = h.location.coordinates[0];
        const hLat = h.location.coordinates[1];
        const distKm = Math.sqrt(Math.pow((hLng - longitude) * 111, 2) + Math.pow((hLat - latitude) * 111, 2));
        return {
          ...h,
          estimatedDistanceKm: Number(distKm.toFixed(1)),
          estimatedTransportMinutes: Math.round((distKm / 35) * 60) + 2,
        };
      })
      .filter((h) => h.estimatedDistanceKm <= (Number(maxDistanceKm) || 15))
      .sort((a, b) => a.estimatedDistanceKm - b.estimatedDistanceKm);

    if (rankedHospitals.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          recommendedHospital: null,
          message: 'No suitable non-diverted hospital with available beds found within range.',
          alternatives: [],
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        recommendedHospital: rankedHospitals[0],
        alternatives: rankedHospitals.slice(1, 5),
        advisoryNotice: 'Hospital routing is advisory only. Human EMS operator confirmation required before transport.',
      },
    });
  } catch (error: any) {
    console.error('[Hospital Controller] Failed to find nearest hospital:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to find nearest non-diverted hospital.', details: error.message },
    });
  }
};

/**
 * PATCH /api/v1/hospitals/:id/status
 * Update hospital bed capacity or divert status.
 * Requires JWT & RBAC (CONTROL_ROOM, ADMIN, HOSPITAL).
 * Enforces Zod validation: availableBeds <= totalBeds AND icuAvailable <= totalBeds.
 */
export const updateHospitalStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const parseResult = updateHospitalStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid hospital status payload bounds.',
          details: parseResult.error.errors,
        },
      });
      return;
    }

    const updates = parseResult.data;

    const hospital = await Hospital.findById(id);
    if (!hospital) {
      res.status(404).json({
        success: false,
        error: { message: `Hospital not found with ID ${id}` },
      });
      return;
    }

    const newTotal = updates.totalBeds !== undefined ? updates.totalBeds : hospital.totalBeds;
    const newAvailable = updates.availableBeds !== undefined ? updates.availableBeds : hospital.availableBeds;
    const newICU = updates.icuAvailable !== undefined ? updates.icuAvailable : hospital.icuAvailable;

    // Enforce strict bounds validation: availableBeds <= totalBeds AND icuAvailable <= totalBeds
    if (newAvailable > newTotal) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid capacity bounds: availableBeds (${newAvailable}) cannot exceed totalBeds (${newTotal}).`,
        },
      });
      return;
    }

    if (newICU > newTotal) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid capacity bounds: icuAvailable (${newICU}) cannot exceed totalBeds (${newTotal}).`,
        },
      });
      return;
    }

    // Apply updates
    if (updates.totalBeds !== undefined) hospital.totalBeds = updates.totalBeds;
    if (updates.availableBeds !== undefined) hospital.availableBeds = updates.availableBeds;
    if (updates.icuAvailable !== undefined) hospital.icuAvailable = updates.icuAvailable;
    if (updates.status !== undefined) hospital.status = updates.status;
    if (updates.contactPhone !== undefined) hospital.contactPhone = updates.contactPhone;
    if (updates.coordinates !== undefined) hospital.location.coordinates = updates.coordinates;

    hospital.lastUpdated = new Date();
    await hospital.save();

    // Log audit entry
    const validActorId = mongoose.Types.ObjectId.isValid(req.user?.id || '')
      ? req.user?.id
      : new mongoose.Types.ObjectId();

    await IncidentUpdate.create({
      incidentId: id, // System entity ID reference
      actorId: validActorId,
      actorName: req.user?.name || 'Medical Operator',
      actorRole: req.user?.role || 'HOSPITAL',
      action: 'FIELD_NOTE',
      summary: `Hospital capacity updated for ${hospital.name}: Status=${hospital.status}, Beds=${hospital.availableBeds}/${hospital.totalBeds}, ICU=${hospital.icuAvailable}`,
    });

    res.status(200).json({
      success: true,
      data: {
        hospital,
        message: `Hospital ${hospital.name} status updated successfully.`,
      },
    });
  } catch (error: any) {
    console.error('[Hospital Controller] Failed to update hospital status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update hospital status.', details: error.message },
    });
  }
};
