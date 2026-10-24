import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLogDocument extends Document {
  actor: mongoose.Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      default: '',
    },
    beforeState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
  }
);

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

export interface IAiLogDocument extends Document {
  user: mongoose.Types.ObjectId;
  userRole: string;
  prompt: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  response: string;
  status: 'success' | 'error' | 'refused';
  durationMs: number;
  createdAt: Date;
}

const AiLogSchema = new Schema<IAiLogDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    toolCalls: {
      type: Schema.Types.Mixed,
      default: [],
    },
    response: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'refused'],
      default: 'success',
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AiLog = mongoose.model<IAiLogDocument>('AiLog', AiLogSchema);
