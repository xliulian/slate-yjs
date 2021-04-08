import node from './node';
import text from './text';
const nullOp = (doc) => doc;
const opMappers = Object.assign(Object.assign(Object.assign({}, text), node), { 
    // SetSelection is currently a null op since we don't support cursors
    set_selection: nullOp });
/**
 * Applies a slate operation to a SharedType
 *
 * @param doc
 * @param op
 */
export function applySlateOp(doc, op) {
    const apply = opMappers[op.type];
    if (!apply) {
        throw new Error(`Unknown operation: ${op.type}`);
    }
    return apply(doc, op);
}
/**
 * Applies a slate operations to a SharedType
 *
 * @param doc
 * @param op
 */
export function applySlateOps(doc, operations) {
    return operations.reduce(applySlateOp, doc);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwbHkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxJQUFJLE1BQU0sUUFBUSxDQUFDO0FBQzFCLE9BQU8sSUFBSSxNQUFNLFFBQVEsQ0FBQztBQUcxQixNQUFNLE1BQU0sR0FBYyxDQUFDLEdBQWUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDO0FBRW5ELE1BQU0sU0FBUyxpREFDVixJQUFJLEdBQ0osSUFBSTtJQUVQLHFFQUFxRTtJQUNyRSxhQUFhLEVBQUUsTUFBTSxHQUN0QixDQUFDO0FBRUY7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQWUsRUFBRSxFQUFhO0lBQ3pELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUF5QixDQUFDO0lBQ3pELElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDVixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUVELE9BQU8sS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUMzQixHQUFlLEVBQ2YsVUFBdUI7SUFFdkIsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM5QyxDQUFDIn0=