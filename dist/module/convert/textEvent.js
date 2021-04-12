import { Node } from 'slate';
import * as Y from 'yjs';
import { toSlatePath } from '../utils/convert';
/**
 * Converts a Yjs Text event into Slate operations.
 *
 * @param event
 */
export default function textEvent(event, doc) {
    const eventTargetPath = toSlatePath(event.path);
    console.log('textEvent', event, eventTargetPath, event.changes);
    const createTextOp = (type, offset, text) => {
        return {
            type,
            offset,
            text,
            path: eventTargetPath,
        };
    };
    const removedValues = event.changes.deleted.values();
    let removeOffset = 0;
    let addOffset = 0;
    const removeOps = [];
    const addOps = [];
    event.changes.delta.forEach((delta) => {
        if ('retain' in delta) {
            removeOffset += delta.retain;
            addOffset += delta.retain;
            return;
        }
        if ('delete' in delta) {
            let text = '';
            while (text.length < delta.delete) {
                const item = removedValues.next().value;
                const { content } = item;
                if (!(content instanceof Y.ContentString)) {
                    throw new TypeError(`Unsupported content type ${item.content}`);
                }
                text = text.concat(content.str);
            }
            if (text.length !== delta.delete) {
                throw new Error(`Unexpected length: expected ${delta.delete}, got ${text.length}`);
            }
            removeOps.push(createTextOp('remove_text', removeOffset, text));
            return;
        }
        if ('insert' in delta) {
            const text = delta.insert.join('');
            addOps.push(createTextOp('insert_text', addOffset, text));
            addOffset += delta.insert.length;
        }
    });
    const ops = [...removeOps, ...addOps];
    if (ops.length) {
        const node = Node.get({ children: doc }, eventTargetPath);
        ops.forEach(op => {
            if (op.type === 'remove_text') {
                node.text = node.text.slice(0, op.offset) + node.text.slice(op.offset + op.text.length);
            }
            else if (op.type === 'insert_text') {
                node.text = node.text.slice(0, op.offset) + op.text + node.text.slice(op.offset);
            }
        });
    }
    return ops;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnZlcnQvdGV4dEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBaUIsSUFBSSxFQUFRLE1BQU0sT0FBTyxDQUFDO0FBQ2xELE9BQU8sS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sVUFBVSxTQUFTLENBQUMsS0FBbUIsRUFBRSxHQUFRO0lBQzdELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFL0QsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsSUFBbUMsRUFDbkMsTUFBYyxFQUNkLElBQVksRUFDRyxFQUFFO1FBQ2pCLE9BQU87WUFDTCxJQUFJO1lBQ0osTUFBTTtZQUNOLElBQUk7WUFDSixJQUFJLEVBQUUsZUFBZTtTQUN0QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckQsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixNQUFNLFNBQVMsR0FBb0IsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7SUFFbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxRQUFRLElBQUksS0FBSyxFQUFFO1lBQ3JCLFlBQVksSUFBSSxL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