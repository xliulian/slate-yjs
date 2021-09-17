import { Operation } from 'slate';
import { SharedType } from '../model';
/**
 * Applies a slate operation to a SharedType
 *
 * @param doc
 * @param op
 */
export declare function applySlateOp(doc: SharedType, op: Operation): SharedType;
/**
 * Applies a slate operations to a SharedType
 *
 * @param doc
 * @param op
 */
export declare function applySlateOps(doc: SharedType, operations: Operation[]): SharedType;
