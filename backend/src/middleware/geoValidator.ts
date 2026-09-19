import { Request, Response, NextFunction } from 'express';

export const METRO_BOUNDS = {
  minLng: -122.52,
  maxLng: -122.35,
  minLat: 37.70,
  maxLat: 37.83,
};

export const isWithinMetroBounds = (lng: number, lat: number): boolean => {
  return (
    lng >= METRO_BOUNDS.minLng &&
    lng <= METRO_BOUNDS.maxLng &&
    lat >= METRO_BOUNDS.minLat &&
    lat <= METRO_BOUNDS.maxLat
  );
};

export const validateCoordinatesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const location = req.body.location;

  // If coordinates are provided, validate them
  if (location && location.coordinates) {
    const coords = location.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Coordinates must be an array of two numbers [longitude, latitude].',
        },
      });
      return;
    }

    const [lng, lat] = coords.map(Number);

    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Coordinates must contain valid numerical values for [longitude, latitude].',
        },
      });
      return;
    }

    if (!isWithinMetroBounds(lng, lat)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_BOUNDS',
          message: 'Coordinates are outside the designated metropolitan emergency district.',
          bounds: METRO_BOUNDS,
          received: { lng, lat },
        },
      });
      return;
    }
  }

  next();
};
