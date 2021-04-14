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
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSlatePath = exports.toSharedType = exports.toSyncElement = exports.toSlateDoc = exports.toSlateNode = void 0;
const slate_1 = require("slate");
const Y = __importStar(require("yjs"));
const model_1 = require("../model");
/**
 * Converts a sync element to a slate node
 *
 * @param element
 */
function toSlateNode(element) {
    const text = model_1.SyncElement.getText(element);
    const children = model_1.SyncElement.getChildren(element);
    const node = {};
    if (text !== undefined) {
        node.text = text.toString();
    }
    if (children !== undefined) {
        node.children = children.map(toSlateNode);
    }
    Array.from(element.entries()).forEach(([key, value]) => {
        if (key !== 'children' && key !== 'text') {
            node[key] = value;
        }
    });
    return node;
}
exports.toSlateNode = toSlateNode;
/**
 * Converts a SharedType to a Slate doc
 * @param doc
 */
function toSlateDoc(doc) {
    return doc.map(toSlateNode);
}
exports.toSlateDoc = toSlateDoc;
/**
 * Converts a slate node to a sync element
 *
 * @param node
 */
function toSyncElement(node) {
    const element = new Y.Map();
    if (slate_1.Element.isElement(node)) {
        const childElements = node.children.map(toSyncElement);
        const childContainer = new Y.Array();
        childContainer.insert(0, childElements);
        element.set('children', childContainer);
    }
    if (slate_1.Text.isText(node)) {
        const textElement = new Y.Text(node.text);
        element.set('text', textElement);
    }
    Object.entries(node).forEach(([key, value]) => {
        if (key !== 'children' && key !== 'text') {
            element.set(key, value);
        }
    });
    return element;
}
exports.toSyncElement = toSyncElement;
/**
 * Converts all elements int a Slate doc to SyncElements and adds them
 * to the SharedType
 *
 * @param sharedType
 * @param doc
 */
function toSharedType(sharedType, doc) {
    sharedType.insert(0, doc.map(toSyncElement));
}
exports.toSharedType = toSharedType;
/**
 * Converts a SharedType path the a slate path
 *
 * @param path
 */
function toSlatePath(path) {
    return path.filter((node) => typeof node === 'number');
}
exports.toSlatePath = toSlatePath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy91dGlscy9jb252ZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBa0Q7QUFDbEQsdUNBQXlCO0FBQ3pCLG9DQUFtRDtBQUVuRDs7OztHQUlHO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLE9BQW9CO0lBQzlDLE1BQU0sSUFBSSxHQUFHLG1CQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUFHLG1CQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWxELE1BQU0sSUFBSSxHQUFrQixFQUFFLENBQUM7SUFDL0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3JCLElBQWEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0tBQ3ZDO0lBQ0QsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO1FBQ3pCLElBQWdCLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDeEQ7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDckQsSUFBSSxHQUFHLEtBQUssVUFBVSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUU7WUFDdkMsSUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUM1QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxJQUFZLENBQUM7QUFDdEIsQ0FBQztBQW5CRCxrQ0FtQkM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsR0FBZTtJQUN4QyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUZELGdDQUVDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFVO0lBQ3RDLE1BQU0sT0FBTyxHQUFnQixJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUV6QyxJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDM0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7S0FDekM7SUFFRCxJQUFJLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDckIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztLQUNsQztJQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtRQUM1QyxJQUFJLEdBQUcsS0FBSyxVQUFVLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRTtZQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN6QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQXRCRCxzQ0FzQkM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixZQUFZLENBQUMsVUFBc0IsRUFBRSxHQUFXO0lBQzlELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRkQsb0NBRUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLElBQXlCO0lBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFTLENBQUM7QUFDakUsQ0FBQztBQUZELGtDQUVDIn0=