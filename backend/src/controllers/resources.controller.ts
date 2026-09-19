import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Incident } from '../models/Incident.js';
import { Team } from '../models/Team.js';
import { Vehicle } from '../models/Vehicle.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../server.js';

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, zone, search, page = '1', limit = '30' } = req.query;

    const query: any = {};

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (zone && zone !== 'ALL') {
      query.zone = zone;
    }

    if (search) {
      const searchStr = String(search).trim();
      query.$or = [
        { name: { $regex: searchStr, $options: 'i' } },
        { identifier: { $regex: searchStr, $options: 'i' } },
        { baseStation: { $regex: searchStr, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [resources, total, stats] = await Promise.all([
      Resource.find(query)
        .populate('currentIncidentId', 'incidentNumber title severity status')
        .sort({ status: 1, identifier: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Resource.countDocuments(query),
      Resource.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const availabilityMap: Record<string, number> = {
      AVAILABLE: 0,
      BUSY: 0,
      EN_ROUTE: 0,
      ON_SCENE: 0,
      MAINTENANCE: 0,
    };
    stats.forEach((s) => {
      availabilityMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        resources,
        summary: {
          total,
          available: availabilityMap.AVAILABLE || 0,
          busy: (availabilityMap.BUSY || 0) + (availabilityMap.EN_ROUTE || 0) + (availabilityMap.ON_SCENE || 0),
          enRoute: availabilityMap.EN_ROUTE || 0,
          onScene: availabilityMap.ON_SCENE || 0,
          maintenance: availabilityMap.MAINTENANCE || 0,
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getResourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    let resource;
    if (mongoose.Types.ObjectId.isValid(id)) {
      resource = await Resource.findById(id).populate('currentIncidentId');
    } else {
      resource = await Resource.findOne({ identifier: id }).populate('currentIncidentId');
    }

    if (!resource) {
      throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    }

    const [team, vehicle, pastIncidents] = await Promise.all([
      Team.findOne({ assignedResourceId: resource._id }),
      Vehicle.findOne({ assignedResourceId: resource._id }),
      Incident.find({ assignedResources: resource._id }).sort({ updatedAt: -1 }).limit(5).select('incidentNumber title severity status updatedAt'),
    ]);

    res.json({
      success: true,
      data: {
        resource,
        team,
        vehicle,
        history: pastIncidents,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateResourceStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, fuelLevelPercent, operationalNotes } = req.body;

    const resource = await Resource.findById(id);
    if (!resource) {
      throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (status) resource.status = status;
    if (fuelLevelPercent !== undefined) resource.fuelLevelPercent = fuelLevelPercent;
    if (operationalNotes !== undefined) resource.operationalNotes = operationalNotes;

    await resource.save();

    if (io) {
      io.emit('resource.updated', {
        id: resource._id.toString(),
        identifier: resource.identifier,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        baseStation: resource.baseStation,
        currentLocation: resource.currentLocation,
        capabilities: resource.capabilities,
        capacity: resource.capacity,
        currentIncidentId: resource.currentIncidentId?.toString(),
        zone: resource.zone,
      });
    }

    res.json({
      success: true,
      data: { resource },
    });
  } catch (err) {
    next(err);
  }
};
