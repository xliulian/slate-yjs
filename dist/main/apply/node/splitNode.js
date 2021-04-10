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
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const Y = __importStar(require("yjs"));
const model_1 = require("../../model");
const path_1 = require("../../path");
const clone_1 = __importDefault(require("../../utils/clone"));
/**
 * Applies a split node operation to a SharedType
 *
 * @param doc
 * @param op
 */
function splitNode(doc, op) {
    const [parent, index] = path_1.getParent(doc, op.path);
    const children = model_1.SyncNode.getChildren(parent);
    tiny_invariant_1.default(children, 'Parent of node should have children');
    const target = children.get(index);
    const inject = new Y.Map();
    children.insert(index + 1, [inject]);
    Object.entries(op.properties).forEach(([key, value]) => inject.set(key, value));
    const targetText = model_1.SyncNode.getText(target);
    if (targetText !== undefined) {
        const injectText = new Y.Text(targetText.toString().slice(op.position));
        inject.set('text', injectText);
        tiny_invariant_1.default(targetText);
        tiny_invariant_1.default(injectText);
        if (targetText.length > op.position) {
            targetText.delete(op.position, targetText.length - op.position);
        }
    }
    else {
        const targetChildren = model_1.SyncNode.getChildren(target);
        const injectChildren = new Y.Array();
        inject.set('children', injectChildren);
        tiny_invariant_1.default(targetChildren);
        tiny_invariant_1.default(injectChildren);
        // XXX: we have to clone the array elements since yjs does not support move element from one array to the other.
        const childElements = [];
        targetChildren.forEach((child, idx) => {
            if (idx >= op.position) {
                childElements.push(clone_1.default(child));
            }
        });
        injectChildren.insert(0, childElements);
        targetChildren.delete(op.position, targetChildren.length - op.position);
    }
    return doc;
}
exports.default = splitNode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXROb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2FwcGx5L25vZGUvc3BsaXROb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLG9FQUF1QztBQUN2Qyx1Q0FBeUI7QUFDekIsdUNBQWdFO0FBQ2hFLHFDQUF1QztBQUN2Qyw4REFBaUQ7QUFFakQ7Ozs7O0dBS0c7QUFDSCxTQUF3QixTQUFTLENBQy9CLEdBQWUsRUFDZixFQUFzQjtJQUV0QixNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUF1QixnQkFBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFcEUsTUFBTSxRQUFRLEdBQUcsZ0JBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsd0JBQVMsQ0FBQyxRQUFRLEVBQUUscUNBQXFDLENBQUMsQ0FBQztJQUUzRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzNCLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFckMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUNyRCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FDdkIsQ0FBQztJQUVGLE1BQU0sVUFBVSxHQUFHLGdCQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNDLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtRQUM1QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUvQix3QkFBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RCLHdCQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdEIsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7WUFDbkMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2pFO0tBQ0Y7U0FBTTtRQUNMLE1BQU0sY0FBYyxHQUFHLGdCQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXBELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXZDLHdCQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUIsd0JBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxQixnSEFBZ0g7UUFDaEgsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQTtRQUN2QyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RCLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQzdDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUV4QyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDekU7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFsREQsNEJBa0RDIn0=