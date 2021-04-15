"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slate_1 = require("slate");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const Y = __importStar(require("yjs"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnZlcnQvdGV4dEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUFrRDtBQUNsRCxvRUFBdUM7QUFDdkMsdUNBQXlCO0FBQ3pCLDhDQUErQztBQUUvQzs7OztHQUlHO0FBQ0gsU0FBd0IsU0FBUyxDQUFDLEtBQW1CLEVBQUUsR0FBUTtJQUM3RCxNQUFNLGVBQWUsR0FBRyxxQkFBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUUvRCxNQUFNLFlBQVksR0FBRyxDQUNuQixJQUFtQyxFQUNuQyxNQUFjLEVBQ2QsSUFBWSxFQUNHLEVBQUU7UUFDakIsT0FBTztZQUNMLElBQUk7WUFDSixNQUFNO1lBQ04sSUFBSTtZQUNKLElBQUksRUFBRSxlQUFlO1NBQ3RCLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyRCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7SUFDckIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLE1BQU0sU0FBUyxHQUFvQixFQUFFLENBQUM7SUFDdEMsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztJQUVuQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNwQyxJQUFJLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDckIsWUFBWSxJQUFJLEtBQUssQ0FBQyxNQUFPLENBQUM7WUFDOUIsU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFPLENBQUM7WUFD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