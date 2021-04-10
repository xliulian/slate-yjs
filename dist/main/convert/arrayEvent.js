"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slate_1 = require("slate");
const convert_1 = require("../utils/convert");
/**
 * Converts a Yjs Array event into Slate operations.
 *
 * @param event
 */
function arrayEvent(event, doc) {
    const eventTargetPath = convert_1.toSlatePath(event.path);
    console.log('arrayEvent', event, eventTargetPath, event.changes);
    function createRemoveNode(index) {
        const path = [...eventTargetPath, index];
        return { type: 'remove_node', path, node: { text: '' } };
    }
    function createInsertNode(index, element) {
        const path = [...eventTargetPath, index];
        const node = convert_1.toSlateNode(element);
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
        const parent = slate_1.Node.get({ children: doc }, eventTargetPath);
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
exports.default = arrayEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb252ZXJ0L2FycmF5RXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBK0Y7QUFHL0YsOENBQTREO0FBRTVEOzs7O0dBSUc7QUFDSCxTQUF3QixVQUFVLENBQ2hDLEtBQWlDLEVBQ2pDLEdBQVE7SUFFUixNQUFNLGVBQWUsR0FBRyxxQkFBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUVoRSxTQUFTLGdCQUFnQixDQUFDLEtBQWE7UUFDckMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxPQUFPLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDM0QsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQ3ZCLEtBQWEsRUFDYixPQUFvQjtRQUVwQixNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLHFCQUFXLENBQUMsT0FBc0IsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUNqQixNQUFNLFNBQVMsR0FBb0IsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7SUFFbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxRQUFRLElBQUksS0FBSyxFQUFFO1lBQ3JCLFdBQVcsSUFBSSxLQUFLLENBQUMsTUFBTyxDQUFDO1lBQzdCLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTyxDQUFDO1lBQzFCLE9BQU87U0FDUjtRQUVELElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN6QyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDL0M7WUFFRCxPQUFPO1NBQ1I7UUFFRCxJQUFJLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDckIsTUFBTSxDQUFDLElBQUk7WUFDVCx3Q0FBd0M7WUFDeEMsR0FBSSxLQUFLLENBQUMsTUFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFjLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FDM0QsZ0JBQWdCLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDbEMsQ0FDRixDQUFDO1lBRUYsUUFBUSxJQUFJLEtBQUssQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsU0FBUyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUE7SUFDckMsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO1FBQ2QsTUFBTSxNQUFNLEdBQUcsWUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUMsRUFBRSxlQUFlLENBQVksQ0FBQTtRQUNwRSxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2YsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRTtnQkFDN0IsRUFBRSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2FBQ3BFO2lCQUFNLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhLEVBQUU7Z0JBQ3BDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTthQUNoRTtRQUNILENBQUMsQ0FBQyxDQUFBO0tBQ0g7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNaLENBQUM7QUFqRUQsNkJBaUVDIn0=