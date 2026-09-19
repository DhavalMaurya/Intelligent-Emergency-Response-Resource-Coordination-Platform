import { Request, Response, NextFunction } from 'express';
import { getGeminiStatus } from '../services/geminiService.js';
import { extractIncidentEntities } from '../services/aiExtractionService.js';
import { generateIncidentSummary } from '../services/aiSummaryService.js';
import { generateRankedResourceRecommendations } from '../services/resourceRecommendationService.js';
import { processAIAssistantQuery } from '../services/aiAssistantService.js';
import { Incident } from '../models/Incident.js';
import { Resource } from '../models/Resource.js';
import { AppError } from '../middleware/errorHandler.js';

export const getAIHealthStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getGeminiStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

export const extractEntitiesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      throw new AppError('rawText field is required', 400, 'BAD_REQUEST');
    }

    if (rawText.length > 8000) {
      throw new AppError('Payload length exceeds token cap limit (Max 8,000 chars)', 400, 'PAYLOAD_TOO_LARGE');
    }

    const extraction = await extractIncidentEntities(rawText);
    res.json({
      success: true,
      data: extraction,
    });
  } catch (err) {
    next(err);
  }
};

export const summarizeIncidentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findById(incidentId);

    if (!incident) {
      throw new AppError(`Incident not found with ID: ${incidentId}`, 404, 'NOT_FOUND');
    }

    const summary = await generateIncidentSummary(incident);
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

export const recommendResourcesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { incidentId, requiredType } = req.body;
    if (!incidentId) {
      throw new AppError('incidentId field is required', 400, 'BAD_REQUEST');
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      throw new AppError(`Incident not found with ID: ${incidentId}`, 404, 'NOT_FOUND');
    }

    const resources = await Resource.find();
    const recommendations = await generateRankedResourceRecommendations(incident, resources, requiredType);

    res.json({
      success: true,
      data: {
        incidentId: incident._id,
        incidentNumber: incident.incidentNumber,
        requiredType: requiredType || incident.type,
        recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const aiAssistantChatHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      throw new AppError('query string is required', 400, 'BAD_REQUEST');
    }

    if (query.length > 2000) {
      throw new AppError('Query length exceeds maximum token cap (Max 2,000 chars)', 400, 'PAYLOAD_TOO_LARGE');
    }

    const assistantResult = await processAIAssistantQuery(query);

    res.json({
      success: true,
      data: assistantResult,
    });
  } catch (err) {
    next(err);
  }
};
