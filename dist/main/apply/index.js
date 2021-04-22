"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySlateOps = exports.applySlateOp = void 0;
const node_1 = __importDefault(require("./node"));
const text_1 = __importDefault(require("./text"));
const nullOp = (doc) => doc;
const opMappers = Object.assign(Object.assign(Object.assign({}, text_1.default), node_1.default), { 
    // SetSelection is currently a null op since we don't support cursors
    set_selection: nullOp });
/**
 * Applies a slate operation to a SharedType
 *
 * @param doc
 * @param op
 */
function applySlateOp(doc, op) {
    const apply = opMappers[op.type];
    if (!apply) {
        throw new Error(`Unknown operation: ${op.type}`);
    }
    return apply(doc, op);
}
exports.applySlateOp = applySlateOp;
/**
 * Applies a slate operations to a SharedType
 *
 * @param doc
 * @param op
 */
function applySlateOps(doc, operations) {
    return operations.reduce(applySlateOp, doc);
}
exports.applySlateOps = applySlateOps;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwbHkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLGtEQUEwQjtBQUcxQixNQUFNLE1BQU0sR0FBYyxDQUFDLEdBQWUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDO0FBRW5ELE1BQU0sU0FBUyxpREFDVixjQUFJLEdBQ0osY0FBSTtJQUVQLHFFQUFxRTtJQUNyRSxhQUFhLEVBQUUsTUFBTSxHQUN0QixDQUFDO0FBRUY7Ozs7O0dBS0c7QUFDSCxTQUFnQixZQUFZLENBQUMsR0FBZSxFQUFFLEVBQWE7SUFDekQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQXlCLENBQUM7SUFDekQsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFQRCxvQ0FPQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBZ0IsYUFBYSxDQUMzQixHQUFlLEVBQ2YsVUFBdUI7SUFFdkIsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBTEQsc0NBS0MifQ==