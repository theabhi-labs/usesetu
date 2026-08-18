import mongoose, { Schema, Document, Model } from 'mongoose';

interface IWidgetLayout {
  widgetKey: string;
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
  refreshIntervalSeconds: number;
}

export interface IDashboardWidget extends Document {
  user: mongoose.Types.ObjectId;
  widgets: IWidgetLayout[];
  createdAt: Date;
  updatedAt: Date;
}

const widgetLayoutSchema = new Schema<IWidgetLayout>(
  {
    widgetKey: { type: String, required: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4 },
      h: { type: Number, default: 2 },
    },
    isVisible: { type: Boolean, default: true },
    refreshIntervalSeconds: { type: Number, default: 60 },
  },
  { _id: false },
);

const dashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    widgets: {
      type: [widgetLayoutSchema],
      default: [
        { widgetKey: 'todays_revenue', position: { x: 0, y: 0, w: 3, h: 2 }, isVisible: true, refreshIntervalSeconds: 60 },
        { widgetKey: 'pending_requests', position: { x: 3, y: 0, w: 3, h: 2 }, isVisible: true, refreshIntervalSeconds: 60 },
        { widgetKey: 'completed_requests', position: { x: 6, y: 0, w: 3, h: 2 }, isVisible: true, refreshIntervalSeconds: 60 },
        { widgetKey: 'new_customers', position: { x: 9, y: 0, w: 3, h: 2 }, isVisible: true, refreshIntervalSeconds: 60 },
        { widgetKey: 'top_services', position: { x: 0, y: 2, w: 6, h: 4 }, isVisible: true, refreshIntervalSeconds: 60 },
        { widgetKey: 'revenue_trend', position: { x: 6, y: 2, w: 6, h: 4 }, isVisible: true, refreshIntervalSeconds: 60 },
      ] as IWidgetLayout[],
    },
  },
  { timestamps: true },
);

// One layout per user — user already unique-indexed above.
export const DashboardWidget: Model<IDashboardWidget> = mongoose.model<IDashboardWidget>(
  'DashboardWidget',
  dashboardWidgetSchema,
);
