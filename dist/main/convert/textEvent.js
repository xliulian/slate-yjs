"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slate_1 = require("slate");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const convert_1 = require("../utils/convert");
/**
 * Converts a Yjs Text event into Slate operations.
 *
 * @param event
 */
function textEvent(event, doc) {
    const eventTargetPath = convert_1.toSlatePath(event.path);
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
                tiny_invariant_1.default(delta.insert.every(t => typeof t === 'string'), `Unexpected text insert content type: expected string or string[], got ${JSON.stringify(delta.insert)}`);
                text = delta.insert.join('');
            }
            else {
                tiny_invariant_1.default(typeof delta.insert === 'string', `Unexpected text insert content type: expected string or string[], got ${typeof delta.insert}`);
                text = delta.insert;
            }
            addOps.push(createTextOp('insert_text', addOffset, text));
            addOffset += text.length;
        }
    });
    const ops = [...removeOps, ...addOps];
    if (ops.length) {
        const node = slate_1.Node.get({ children: doc }, eventTargetPath);
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
exports.default = textEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnZlcnQvdGV4dEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsaUNBQWtEO0FBQ2xELG9FQUF1QztBQUV2Qyw4Q0FBK0M7QUFFL0M7Ozs7R0FJRztBQUNILFNBQXdCLFNBQVMsQ0FBQyxLQUFtQixFQUFFLEdBQVE7SUFDN0QsTUFBTSxlQUFlLEdBQUcscUJBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFL0QsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsSUFBbUMsRUFDbkMsTUFBYyxFQUNkLElBQVksRUFDRyxFQUFFO1FBQ2pCLE9BQU87WUFDTCxJQUFJO1lBQ0osTUFBTTtZQUNOLElBQUk7WUFDSixJQUFJLEVBQUUsZUFBZTtTQUN0QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsdURBQXVEO0lBQ3ZELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztJQUN0QyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0lBRW5DLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ3BDLElBQUksUUFBUSxJQUFJLEtBQUssRUFBRTtZQUNyQixZQUFZLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZQUM5QixTQUFTLElBQUksS0FBSyxDQUFDLE1BQU8sQ0FBQztZQUMzQixPQUFPO1NBQ1I7UUFFRCxJQUFJLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDckI7Ozs7Ozs7Ozs7Ozs7OztlQWVHO1lBQ0gsTUFBTSxJQUFJLEdB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