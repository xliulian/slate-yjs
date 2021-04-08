"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slate_1 = require("slate");
const convert_1 = require("../utils/convert");
/**
 * Converts a Yjs Map event into Slate operations.
 *
 * @param event
 */
function mapEvent(event, doc) {
    console.log('mapEvent', event, convert_1.toSlatePath(event.path), event.changes);
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
        path: convert_1.toSlatePath(event.path),
    };
    // Combine changes into a single set node operation
    return [changes.reduce(combineMapOp, baseOp)].map(op => {
        const node = slate_1.Node.get({ children: doc }, op.path);
        for (const key in op.newProperties) {
            const val = op.newProperties[key];
            // same as slate
            if (val == null) {
                delete node[key];
            }
            else {
                node[key] = val;
            }
        }
        return op;
    });
}
exports.default = mapEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9tYXBFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlDQUErQztBQUcvQyw4Q0FBK0M7QUFRL0M7Ozs7R0FJRztBQUNILFNBQXdCLFFBQVEsQ0FDOUIsS0FBMkIsRUFDM0IsR0FBUTtJQUVSLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxxQkFBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdEUsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsV0FBZ0MsRUFDSixFQUFFO1FBQzlCLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFxQixDQUFDO1FBRWxELE9BQU87WUFDTCxhQUFhLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDaEQsVUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO1NBQ3ZDLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxDQUNuQixFQUFvQixFQUNwQixLQUFpQyxFQUNmLEVBQUU7UUFDcEIsdUNBQ0ssRUFBRSxLQUNMLGFBQWEsa0NBQU8sRUFBRSxDQUFDLGFBQWEsR0FBSyxLQUFLLENBQUMsYUFBYSxHQUM1RCxVQUFVLGtDQUFPLEVBQUUsQ0FBQyxVQUFVLEdBQUssS0FBSyxDQUFDLFVBQVUsS0FDbkQ7SUFDSixDQUFDLENBQUM7SUFFRixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUMvQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUV6RCxNQUFNLE1BQU0sR0FBcUI7UUFDL0IsSUFBSSxFQUFFLFVBQVU7UUFDaEIsYUFBYSxFQUFFLEVBQUU7UUFDakIsVUFBVSxFQUFFLEVBQUU7UUFDZCxJQUFJLEVBQUUscUJBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0tBQzlCLENBQUM7SUFFRixtREFBbUQ7SUFDbkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQW1CLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUN2RSxNQUFNLElBQUksR0FBRyxZQUFJLENBQUMsR0FBRyxDQUFDLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxLQUFLLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDbEMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxnQkFBZ0I7WUFDaEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2FBQ2pCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUE7YUFDaEI7U0FDRjtRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBcERELDJCQW9EQyJ9