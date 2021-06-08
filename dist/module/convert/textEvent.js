import { Node } from 'slate';
import invariant from 'tiny-invariant';
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
    //const removedValues = event.changes.deleted.values();
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
            /*let text = '';
      
            while (text.length < delta.delete!) {
              const item = removedValues.next().value;
              const { content } = item;
              if (!(content instanceof Y.ContentString)) {
                throw new TypeError(`Unsupported content type ${item.content}`);
              }
              text = text.concat(content.str);
            }
      
            if (text.length !== delta.delete) {
              throw new Error(
                `Unexpected length: expected ${delta.delete}, got ${text.length}`
              );
            }*/
            const text = Array(delta.delete).fill('*').join('');
            removeOps.push(createTextOp('remove_text', removeOffset, text));
            return;
        }
        if ('insert' in delta) {
            let text;
            if (Array.isArray(delta.insert)) {
                invariant(delta.insert.every(t => typeof t === 'string'), `Unexpected text insert content type: expected string or string[], got ${JSON.stringify(delta.insert)}`);
                text = delta.insert.join('');
            }
            else {
                invariant(typeof delta.insert === 'string', `Unexpected text insert content type: expected string or string[], got ${typeof delta.insert}`);
                text = delta.insert;
            }
            addOps.push(createTextOp('insert_text', addOffset, text));
            addOffset += text.length;
        }
    });
    const ops = [...removeOps, ...addOps];
    if (ops.length) {
        const node = Node.get({ children: doc }, eventTargetPath);
        ops.forEach(op => {
            if (op.type === 'remove_text') {
                op.text = node.text.slice(op.offset, op.offset + op.text.length); // removedValues is not reliable.
                node.text = node.text.slice(0, op.offset) + node.text.slice(op.offset + op.text.length);
            }
            else if (op.type === 'insert_text') {
                node.text = node.text.slice(0, op.offset) + op.text + node.text.slice(op.offset);
            }
        });
    }
    return ops;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnZlcnQvdGV4dEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBaUIsSUFBSSxFQUFRLE1BQU0sT0FBTyxDQUFDO0FBQ2xELE9BQU8sU0FBUyxNQUFNLGdCQUFnQixDQUFDO0FBRXZDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sVUFBVSxTQUFTLENBQUMsS0FBbUIsRUFBRSxHQUFRO0lBQzdELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFL0QsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsSUFBbUMsRUFDbkMsTUFBYyxFQUNkLElBQVksRUFDRyxFQUFFO1FBQ2pCLE9BQU87WUFDTCxJQUFJO1lBQ0osTUFBTTtZQUNOLElBQUk7WUFDSixJQUFJLEVBQUUsZUFBZTtTQUN0QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsdURBQXVEO0lBQ3ZELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztJQUN0QyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0lBRW5DLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ3BDLElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixZQUFZLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZQUM5QixTQUFTLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZ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