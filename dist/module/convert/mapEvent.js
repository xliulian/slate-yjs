import { Node } from 'slate';
import { toSlatePath } from '../utils/convert';
/**
 * Converts a Yjs Map event into Slate operations.
 *
 * @param event
 */
export default function mapEvent(event, doc) {
    console.log('mapEvent', event, toSlatePath(event.path), event.changes);
    const convertMapOp = (actionEntry) => {
        const [key, action] = actionEntry;
        const targetElement = event.target;
        return {
            newProperties: { [key]: targetElement.get(key) },
            properties: { [key]: action.oldValue },
        };
    };
    const combineMapOp = (op, props) => {
        return Object.assign(Object.assign({}, op), { newProperties: Object.assign(Object.assign({}, op.newProperties), props.newProperties), properties: Object.assign(Object.assign({}, op.properties), props.properties) });
    };
    const { keys } = event.changes;
    const changes = Array.from(keys.entries(), convertMapOp);
    const baseOp = {
        type: 'set_node',
        newProperties: {},
        properties: {},
        path: toSlatePath(event.path),
    };
    // Combine changes into a single set node operation
    return [changes.reduce(combineMapOp, baseOp)].map(op => {
        const node = Node.get({ children: doc }, op.path);
        for (const key in op.newProperties) {
            const val = op.newProperties[key];
            if (val !== null && val !== undefined) {
                node[key] = val;
            }
            else {
                delete node[key];
            }
        }
        return op;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9tYXBFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQW9CLElBQUksRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUcvQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFRL0M7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxPQUFPLFVBQVUsUUFBUSxDQUM5QixLQUEyQixFQUMzQixHQUFRO0lBRVIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RFLE1BQU0sWUFBWSxHQUFHLENBQ25CLFdBQWdDLEVBQ0osRUFBRTtRQUM5QixNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBcUIsQ0FBQztRQUVsRCxPQUFPO1lBQ0wsYUFBYSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2hELFVBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtTQUN2QyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsRUFBb0IsRUFDcEIsS0FBaUMsRUFDZixFQUFFO1FBQ3BCLHVDQUNLLEVBQUUsS0FDTCxhQUFhLGtDQUFPLEVBQUUsQ0FBQyxhQUFhLEdBQUssS0FBSyxDQUFDLGFBQWEsR0FDNUQsVUFBVSxrQ0FBTyxFQUFFLENBQUMsVUFBVSxHQUFLLEtBQUssQ0FBQyxVQUFVLEtBQ25EO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFekQsTUFBTSxNQUFNLEdBQXFCO1FBQy9CLElBQUksRUFBRSxVQUFVO1FBQ2hCLGFBQWEsRUFBRSxFQUFFO1FBQ2pCLFVBQVUsRUFBRSxFQUFFO1FBQ2QsSUFBSSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0tBQzlCLENBQUM7SUFFRixtREFBbUQ7SUFDbkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQW1CLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUN2RSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxLQUFLLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDbEMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtnQkFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQTthQUNoQjtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTthQUNqQjtTQUNGO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDWCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMifQ==