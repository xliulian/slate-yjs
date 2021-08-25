import invariant from 'tiny-invariant';
import { SyncNode } from '../../model';
import { getParent } from '../../path';
import { toSyncElement } from '../../utils/convert';
/**
 * Applies an insert node operation to a SharedType.
 *
 * @param doc
 * @param op
 */
export default function insertNode(doc, op) {
    const [parent, index] = getParent(doc, op.path);
    const children = SyncNode.getChildren(parent);
    if (SyncNode.getText(parent) !== undefined || !children) {
        throw new TypeError("Can't insert node into text node");
    }
    invariant(children, 'cannot apply insert node operation to text node');
    children.insert(index, [toSyncElement(op.node)]);
    return doc;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Tm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hcHBseS9ub2RlL2luc2VydE5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxTQUFTLE1BQU0sZ0JBQWdCLENBQUM7QUFDdkMsT0FBTyxFQUFjLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVwRDs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxPQUFPLFVBQVUsVUFBVSxDQUNoQyxHQUFlLEVBQ2YsRUFBdUI7SUFFdkIsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVoRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDdkQsTUFBTSxJQUFJLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0tBQ3pEO0lBRUQsU0FBUyxDQUFDLFFBQVEsRUFBRSxpREFBaUQsQ0FBQyxDQUFDO0lBRXZFLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIn0=