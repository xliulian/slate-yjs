import { Node } from 'slate';
import { toSlateNode, toSlatePath } from '../utils/convert';
/**
 * Converts a Yjs Array event into Slate operations.
 *
 * @param event
 */
export default function arrayEvent(event, doc) {
    const eventTargetPath = toSlatePath(event.path);
    console.log('arrayEvent', event, eventTargetPath, event.changes);
    function createRemoveNode(index) {
        const path = [...eventTargetPath, index];
        return { type: 'remove_node', path, node: { text: '' } };
    }
    function createInsertNode(index, element) {
        const path = [...eventTargetPath, index];
        const node = toSlateNode(element);
        return { type: 'insert_node', path, node };
    }
    let removeIndex = 0;
    let addIndex = 0;
    const removeOps = [];
    const addOps = [];
    event.changes.delta.forEach((delta) => {
        if ('retain' in delta) {
            removeIndex += delta.retain;
            addIndex += delta.retain;
            return;
        }
        if ('delete' in delta) {
            for (let i = 0; i < delta.delete; i += 1) {
                removeOps.push(createRemoveNode(removeIndex));
            }
            return;
        }
        if ('insert' in delta) {
            addOps.push(
            // eslint-disable-next-line no-loop-func
            ...delta.insert.map((e, i) => createInsertNode(addIndex + i, e)));
            addIndex += delta.insert.length;
        }
    });
    const ops = [...removeOps, ...addOps];
    if (ops.length) {
        const parent = Node.get({ children: doc }, eventTargetPath);
        ops.forEach(op => {
            if (op.type === 'remove_node') {
                op.node = parent.children.splice(op.path[op.path.length - 1], 1)[0];
            }
            else if (op.type === 'insert_node') {
                parent.children.splice(op.path[op.path.length - 1], 0, op.node);
            }
        });
    }
    return ops;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb252ZXJ0L2FycmF5RXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUEyRCxJQUFJLEVBQVcsTUFBTSxPQUFPLENBQUM7QUFHL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUU1RDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sVUFBVSxVQUFVLENBQ2hDLEtBQWlDLEVBQ2pDLEdBQVE7SUFFUixNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRWhFLFNBQVMsZ0JBQWdCLENBQUMsS0FBYTtRQUNyQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUMzRCxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsS0FBYSxFQUNiLE9BQW9CO1FBRXBCLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQXNCLENBQUMsQ0FBQztRQUNqRCxPQUFPLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDakIsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztJQUN0QyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0lBRW5DLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ3BDLElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixXQUFXLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZQUM3QixRQUFRLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZQUMxQixPQUFPO1NBQ1I7UUFFRCxJQUFJLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1lBRUQsT0FBTztTQUNSO1FBRUQsSUFBSSxRQUFRLElBQUksS0FBSyxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJO1lBQ1Qsd0NBQXdDO1lBQ3hDLEdBQUksS0FBSyxDQUFDLE1BQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBYyxFQUFFLENBQVMsRUFBRSxFQUFFLENBQzNELGdCQUFnQixDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xDLENBQ0YsQ0FBQztZQUVGLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTyxDQUFDLE1BQU0sQ0FBQztTQUNsQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLFNBQVMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ3JDLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNkLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFDLEVBQUUsZUFBZSxDQUFZLENBQUE7UUFDcEUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNmLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhLEVBQUU7Z0JBQzdCLEVBQUUsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNwRTtpQkFBTSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFO2dCQUNwQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7YUFDaEU7UUFDSCxDQUFDLENBQUMsQ0FBQTtLQUNIO0lBQ0QsT0FBTyxHQUFHLENBQUE7QUFDWixDQUFDIn0=