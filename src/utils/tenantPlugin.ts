import mongoose, { Schema } from 'mongoose';
import { tenantLocalStorage } from '../services/tenantContext.service';

export const tenantPlugin = (schema: Schema) => {
  // 1. Add tenantId field definition to the schema
  schema.add({
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  });

  // 2. Query middleware helper to auto-scope queries
  const scopeQuery = function (this: any, next: (err?: Error) => void) {
    const options = this.getOptions();
    if (options.bypassTenantQuery) {
      return next();
    }

    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return next(new Error(`Tenant context missing for operation on collection: ${this.model?.modelName || 'Unknown'}`));
    }

    const currentQuery = this.getQuery();
    // Only apply if the query doesn't already filter by tenantId explicitly
    if (currentQuery.tenantId === undefined) {
      this.where({ tenantId: context.tenantId });
    }
    next();
  };

  schema.pre('find', scopeQuery);
  schema.pre('findOne', scopeQuery);
  schema.pre('findOneAndUpdate', scopeQuery);
  schema.pre('findOneAndDelete', scopeQuery);
  schema.pre('countDocuments', scopeQuery);
  schema.pre('updateOne', scopeQuery);
  schema.pre('updateMany', scopeQuery);
  schema.pre('deleteOne', scopeQuery);
  schema.pre('deleteMany', scopeQuery);
  schema.pre('distinct', scopeQuery);
  schema.pre('replaceOne', scopeQuery);
  schema.pre('findOneAndReplace', scopeQuery);

  // 3. Pre-validate middleware helper to auto-inject tenantId on document creation
  schema.pre('validate', function (next) {
    const context = tenantLocalStorage.getStore();
    if (context?.tenantId && !this.tenantId) {
      this.tenantId = context.tenantId as any;
    }
    next();
  });

  // 4. Aggregation pipeline auto-scoping hook
  schema.pre('aggregate', function (this: any, next: (err?: Error) => void) {
    const options = this.options || {};
    if (options.bypassTenantQuery) {
      return next();
    }

    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return next(new Error('Tenant context missing for aggregation pipeline'));
    }

    // Prepend a $match stage to enforce tenant isolation at the beginning of the pipeline
    const pipeline = this.pipeline();
    pipeline.unshift({ $match: { tenantId: new mongoose.Types.ObjectId(context.tenantId) } });
    next();
  });
};
