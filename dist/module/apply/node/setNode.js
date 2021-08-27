import { getTarget } from '../../path';
/**
 * Applies a setNode operation to a SharedType
 *
 * @param doc
 * @param op
 */
export default function setNode(doc, op) {
    const node = getTarget(doc, op.path);
    Object.entries(op.newProperties).forEach(([key, value]) => {
        if (key === 'children' || key === 'text') {
            throw new Error(`Cannot set the "${key}" property of nodes!`);
        }
        // same as slate
        if (value == null) {
            node.delete(key);
        }
        else {
            node.set(key, value);
        }
    });
    return doc;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0Tm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hcHBseS9ub2RlL3NldE5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV2Qzs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxPQUFPLFVBQVUsT0FBTyxDQUM3QixHQUFlLEVBQ2YsRUFBb0I7SUFFcEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFnQixDQUFDO0lBRXBELE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDeEQsSUFBSSxHQUFHLEtBQUssVUFBVSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQy9EO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtZQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2xCO2FBQU07WUFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIn0=