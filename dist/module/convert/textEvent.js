import { Node } from 'slate';
import invariant from 'tiny-invariant';
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
            invariant(typeof delta.insert === 'string', `Unexpected text insert content type: expected string, got ${typeof delta.insert}`);
            addOps.push(createTextOp('insert_text', addOffset, delta.insert));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnZlcnQvdGV4dEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBaUIsSUFBSSxFQUFRLE1BQU0sT0FBTyxDQUFDO0FBQ2xELE9BQU8sU0FBUyxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sVUFBVSxTQUFTLENBQUMsS0FBbUIsRUFBRSxHQUFRO0lBQzdELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFL0QsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsSUFBbUMsRUFDbkMsTUFBYyxFQUNkLElBQVksRUFDRyxFQUFFO1FBQ2pCLE9BQU87WUFDTCxJQUFJO1lBQ0osTUFBTTtZQUNOLElBQUk7WUFDSixJQUFJLEVBQUUsZUFBZTtTQUN0QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckQsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixNQUFNLFNBQVMsR0FBb0IsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7SUFFbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxRQUFRLElBQUksS0FBSyxFQUFFO1lBQ3JCLFlBQVksSUFBSSxLQUFLLENBQUMsTUFBTyxDQUFDO1lBQzlCLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTyxDQUFDO1lBQzNCLE9BQU87U0FDUjtRQUVELElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFFZCxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU8sRUFBRTtnQkFDbEMsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDeEMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztnQkFDekIsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRTtvQkFDekMsTUFBTSxJQUFJLFNBQVMsQ0FBQyw0QkFBNEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7aUJBQ2pFO2dCQUNELElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQztZQUVELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUNiLCtCQUErQixLQUFLLENBQUMsTUFBTSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FDbEUsQ0FBQzthQUNIO1lBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU87U0FDUjtRQUVELElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixTQUFTLENBQ1AsT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFDaEMsNkRBQTZELE9BQU8sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUNuRixDQUFDO1lBQ0YsTUFBTSxDQUFDLElBQUksQ0FDVCxZQUFZLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQ3JELENBQUM7WUFDRixTQUFTLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUM7U0FDbkM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxTQUFTLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUNyQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDZCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBQyxFQUFFLGVBQWUsQ0FBUyxDQUFBO1FBQy9ELEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDZixJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFO2dCQUM3QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2FBQ3hGO2lCQUFNLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTthQUNqRjtRQUNILENBQUMsQ0FBQyxDQUFBO0tBQ0g7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNaLENBQUMifQ==