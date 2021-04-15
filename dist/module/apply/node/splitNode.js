import invariant from 'tiny-invariant';
import * as Y from 'yjs';
import { SyncNode } from '../../model';
import { getParent } from '../../path';
import cloneSyncElement from '../../utils/clone';
/**
 * Applies a split node operation to a SharedType
 *
 * @param doc
 * @param op
 */
export default function splitNode(doc, op) {
    const [parent, index] = getParent(doc, op.path);
    const children = SyncNode.getChildren(parent);
    invariant(children, 'Parent of node should have children');
    const target = children.get(index);
    const inject = new Y.Map();
    children.insert(index + 1, [inject]);
    Object.entries(op.properties).forEach(([key, value]) => inject.set(key, value));
    const targetText = SyncNode.getText(target);
    if (targetText !== undefined) {
        const injectText = new Y.Text(targetText.toString().slice(op.position));
        inject.set('text', injectText);
        invariant(targetText);
        invariant(injectText);
        if (targetText.length > op.position) {
            targetText.delete(op.position, targetText.length - op.position);
        }
    }
    else {
        const targetChildren = SyncNode.getChildren(target);
        const injectChildren = new Y.Array();
        inject.set('children', injectChildren);
        invariant(targetChildren);
        invariant(injectChildren);
        // XXX: we have to clone the array elements since yjs does not support move element from one array to the other.
        const childElements = [];
        targetChildren.forEach((child, idx) => {
            if (idx >= op.position) {
                childElements.push(cloneSyncElement(child));
            }
        });
        injectChildren.insert(0, childElements);
        targetChildren.delete(op.position, targetChildren.length - op.position);
    }
    return doc;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXROb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2FwcGx5L25vZGUvc3BsaXROb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sU0FBUyxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO0FBQ3pCLE9BQU8sRUFBYyxRQUFRLEVBQWUsTUFBTSxhQUFhLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN2QyxPQUFPLGdCQUFnQixNQUFNLG1CQUFtQixDQUFDO0FBRWpEOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sVUFBVSxTQUFTLENBQy9CLEdBQWUsRUFDZixFQUFzQjtJQUV0QixNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUF1QixTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVwRSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLFNBQVMsQ0FBQyxRQUFRLEVBQUUscUNBQXFDLENBQUMsQ0FBQztJQUUzRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzNCLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFckMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUNyRCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FDdkIsQ0FBQztJQUVGLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0MsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1FBQzVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRS9CLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QixTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdEIsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7WUFDbkMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2pFO0tBQ0Y7U0FBTTtRQUNMLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFdkMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFCLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxQixnSEFBZ0g7UUFDaEgsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQTtRQUN2QyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RCLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM3QztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFeEMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3pFO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIn0=