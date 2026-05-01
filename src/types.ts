export enum UserRole {
  RIDER = 'rider',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum RideStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DriverAvailability {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
}

export interface VehicleInfo {
  make: string;
  model: string;
  color: string;
  plate: string;
  type: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  rating?: number;
  totalRatings?: number;
  phone?: string;
  vehicle?: VehicleInfo;
  onboarded?: boolean;
  createdAt: any;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export enum RideType {
  RIDE = 'ride',
  DISPATCH = 'dispatch',
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  type: RideType;
  status: RideStatus;
  pickup: Location;
  destination: Location;
  price: number;
  surgeMultiplier: number;
  vehicleType: string;
  promoCode?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface DriverStatus {
  driverId: string;
  location: Location;
  status: DriverAvailability;
  lastUpdate: any;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
