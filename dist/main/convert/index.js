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
exports.toSlateOps = exports.toSlateOp = void 0;
const slate_1 = require("slate");
const Y = __importStar(require("yjs"));
const lodash_1 = __importDefault(require("lodash"));
const arrayEvent_1 = __importDefault(require("./arrayEvent"));
const mapEvent_1 = __importDefault(require("./mapEvent"));
const textEvent_1 = __importDefault(require("./textEvent"));
const findNodeRelativePath = (parentNode, nodeToFind, relativePath = []) => {
    if (lodash_1.default.isEqual(parentNode, nodeToFind)) {
        return relativePath;
    }
    if (slate_1.Element.isElement(parentNode)) {
        if (parentNode.children.some((n, idx) => {
            const path = findNodeRelativePath(n, nodeToFind, relativePath.concat(idx));
            if (path) {
                relativePath = path;
                return true;
            }
            return false;
        })) {
            return relativePath;
        }
    }
    return null;
};
const popLastOp = (ops) => {
    while (ops.length) {
        const lastOps = ops[ops.length - 1];
        if (lastOps.length > 0) {
            const op = lastOps.pop();
            if (!lastOps.length) {
                ops.pop();
            }
            return op;
        }
        ops.pop();
    }
    return null;
};
/**
 * Converts a yjs event into slate operations.
 *
 * @param event
 */
function toSlateOp(event, ops, doc) {
    let ret;
    if (event instanceof Y.YArrayEvent) {
        ret = arrayEvent_1.default(event, doc);
        if (ret.length === 2 &&
            ret[0].type === 'remove_node' &&
            ret[1].type === 'insert_node' &&
            slate_1.Path.equals(ret[0].path, ret[1].path)) {
            const node0Str = JSON.stringify(ret[0].node);
            const node1Str = JSON.stringify(ret[1].node);
            const firstIsDeeper = node0Str.length > node1Str.length;
            if (firstIsDeeper && node0Str.indexOf(node1Str) >= 0 || !firstIsDeeper && node1Str.indexOf(node0Str) >= 0) {
                if (node0Str === node1Str) {
                    console.log('skip dummy operations:', ret);
                    return ops;
                }
                const deeperNode = firstIsDeeper ? ret[0].node : ret[1].node;
                const shadowNode = firstIsDeeper ? ret[1].node : ret[0].node;
                const relativePath = findNodeRelativePath(deeperNode, shadowNode);
                if (relativePath) {
                    console.log('possible move_node detected:', ret, firstIsDeeper, relativePath);
                    const parentNode = slate_1.Node.get(deeperNode, slate_1.Path.parent(relativePath));
                    parentNode.children.splice(relativePath[relativePath.length - 1], 1);
                    if (firstIsDeeper) {
                        ret = [
                            {
                                type: 'move_node',
                                path: ret[0].path.concat(relativePath),
                                newPath: slate_1.Path.next(ret[0].path),
                            },
                            {
                                type: 'remove_node',
                                path: ret[0].path,
                                node: deeperNode,
                            }
                        ];
                    }
                    else {
                        // first insert empty next node, then move
                        ret[1].path = slate_1.Path.next(ret[1].path);
                        ret = [
                            ret[1],
                            {
                                type: 'move_node',
                                path: ret[0].path,
                                newPath: ret[1].path.concat(relativePath),
                            }
                        ];
                    }
                    console.log('move_node restored ops:', ret);
                    ops.push(ret);
                    return ops;
                }
            }
        }
    }
    else if (event instanceof Y.YMapEvent) {
        ret = mapEvent_1.default(event, doc);
    }
    else if (event instanceof Y.YTextEvent) {
        ret = textEvent_1.default(event, doc);
    }
    else {
        throw new Error('Unsupported yjs event');
    }
    if (ret.length) {
        console.log('toSlateOp ret:', ret);
        if (ops.length > 0) {
            const lastOps = ops[ops.length - 1];
            const firstOfLastOps = lastOps[0];
            const lastOp = lastOps.slice(-1)[0];
            const beforeLastOp = (ops[ops.length - 2] || []).slice(-1)[0];
            const op = ret[0];
            const dummyEditor = { children: doc };
            if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                slate_1.Path.equals(lastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOp.node.children.length === 1 &&
                op.text === lastOp.node.children[0].text &&
                slate_1.Node.get(dummyEditor, op.path).text.length === op.offset &&
                !slate_1.Node.has(dummyEditor, slate_1.Path.next(op.path))) {
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(lastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: op.path,
                }, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1] + 1,
                    path: slate_1.Path.parent(op.path),
                });
                console.log('split_node2 detected from:', lastOp, op, ret[0]);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_node' &&
                slate_1.Path.equals(lastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOp.node.children.length <= ret.length &&
                lodash_1.default.isEqual(ret
                    .slice(0, lastOp.node.children.length)
                    .filter((o) => o.type === 'remove_node' && slate_1.Path.equals(o.path, op.path))
                    .map((o) => o.node), lastOp.node.children) &&
                slate_1.Node.get(dummyEditor, slate_1.Path.parent(op.path)).children
                    .length === op.path[op.path.length - 1]) {
                popLastOp(ops);
                const os = ret.splice(0, lastOp.node.children.length, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1],
                    path: slate_1.Path.parent(op.path),
                });
                console.log('split_node detected from:', lastOp, os, ret[0]);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                slate_1.Path.equals(slate_1.Path.next(op.path), lastOp.path) &&
                slate_1.Path.equals(beforeLastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOps.every(o => o.type === 'remove_node' && slate_1.Path.equals(o.path, lastOp.path)) &&
                op.text === beforeLastOp.node.children[0].text &&
                lodash_1.default.isEqual(beforeLastOp.node.children.slice(1), lastOps.map(o => o.node)) &&
                lodash_1.default.isEqual([slate_1.Node.get(dummyEditor, slate_1.Path.parent(op.path))].map(n => [n.children.length, n.children[n.children.length - 1].text.length])[0], [lastOp.path[lastOp.path.length - 1], op.offset])) {
                ops.pop();
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(beforeLastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: op.path,
                }, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(beforeLastOp.node, 'children'),
                    position: lastOp.path[lastOp.path.length - 1],
                    path: slate_1.Path.parent(lastOp.path),
                });
                console.log('split_node3 detected from:', beforeLastOp, lastOps, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_text' &&
                slate_1.Path.equals(lastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOp.node.children.length === 1 &&
                op.text === lastOp.node.children[0].text &&
                slate_1.Node.get(dummyEditor, op.path).text.length === op.offset + op.text.length &&
                !slate_1.Node.has(dummyEditor, slate_1.Path.next(op.path))) {
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1] + 1,
                    path: lastOp.path,
                }, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(lastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: slate_1.Path.next(op.path),
                });
                console.log('merge_node2 detected from:', lastOp, op, ret[0]);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_node' &&
                slate_1.Path.equals(lastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOp.node.children.length <= ret.length &&
                lodash_1.default.isEqual(ret
                    .slice(0, lastOp.node.children.length)
                    .filter((o, idx) => o.type === 'insert_node' && slate_1.Path.equals(slate_1.Path.parent(o.path).concat(o.path[o.path.length - 1] - idx), op.path))
                    .map((o) => o.node), lastOp.node.children) &&
                !slate_1.Node.has(dummyEditor, slate_1.Path.next(ret[lastOp.node.children.length - 1].path))) {
                popLastOp(ops);
                const os = ret.splice(0, lastOp.node.children.length, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1],
                    path: lastOp.path,
                });
                console.log('merge_node detected from:', lastOp, os, ret[0]);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'insert_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'remove_node' &&
                slate_1.Path.equals(beforeLastOp.path, slate_1.Path.next(slate_1.Path.parent(op.path))) &&
                lastOps.every((o, idx) => o.type === 'insert_node' &&
                    (idx === 0 ||
                        slate_1.Path.equals(o.path, slate_1.Path.next(lastOps[idx - 1].path)))) &&
                slate_1.Path.equals(slate_1.Path.next(op.path), firstOfLastOps.path) &&
                op.text === beforeLastOp.node.children[0].text &&
                lodash_1.default.isEqual(beforeLastOp.node.children.slice(1), lastOps.map((o) => o.node)) &&
                lodash_1.default.isEqual([slate_1.Node.get(dummyEditor, slate_1.Path.parent(op.path))].map((n) => [
                    n.children.length,
                    n.children[op.path.slice(-1)[0]].text.length,
                ])[0], [lastOp.path[lastOp.path.length - 1] + 1, op.offset + op.text.length])) {
                ops.pop();
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
                ret.splice(0, 1, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(beforeLastOp.node, 'children'),
                    position: firstOfLastOps.path.slice(-1)[0],
                    path: beforeLastOp.path,
                }, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(beforeLastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: slate_1.Path.next(op.path),
                });
                console.log('merge_node3 detected from:', beforeLastOp, lastOps, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_node' &&
                lastOp.node.children && // element more than text.
                JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0) {
                const relativePath = findNodeRelativePath(op.node, lastOp.node);
                if (relativePath) {
                    popLastOp(ops);
                    // XXX: now we do the insert first, then do the move. The original insert path is the one effected by the first remove op
                    //      to insert at correct position, we need judge whether in this case, the insert path is effected by the remove op
                    //      if the remove op path is obviously before insert path, but not any parent of insert, the remove does not effect the insert path
                    //      if the remove op path is after insert path, also not effect, only when it's parent of insert path
                    //      what if remove op path is descendant of insert path? also not effected
                    let insertPath = [...op.path];
                    if (slate_1.Path.isCommon(lastOp.path, op.path)) {
                        // insert path should change since we do not remove first, how would the remove op path change the insert path?
                        insertPath[lastOp.path.length - 1] += 1;
                    }
                    const newOp = {
                        type: 'move_node',
                        path: lastOp.path,
                        newPath: op.path.concat(relativePath),
                    };
                    if (relativePath.length) {
                        // XXX: first empty the insert_node children, keep the op
                        const parentNode = slate_1.Node.get(op.node, slate_1.Path.parent(relativePath));
                        parentNode.children.splice(relativePath[relativePath.length - 1], 1);
                        // Now the inserted node is at correct position, then we move the original deleted node
                        ret.splice(0, 1, Object.assign(Object.assign({}, op), { path: insertPath }), newOp);
                    }
                    else {
                        // no need to insert node, it's a pure move op.
                        ret.splice(0, 1, newOp);
                    }
                    console.log('move_node2 detected:', lastOp, op, relativePath, ret);
                }
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_node' &&
                op.node.children && // element more than text.
                JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0) {
                const relativePath = findNodeRelativePath(op.node, lastOp.node);
                if (relativePath) {
                    // XXX: first move part of the node somewhere, then remove node.
                    let removePath = [...op.path];
                    if (slate_1.Path.isCommon(lastOp.path, op.path)) {
                        // insert path should change since we do not remove first, how would the remove op path change the insert path?
                        removePath[lastOp.path.length - 1] -= 1;
                    }
                    if (slate_1.Path.isCommon(removePath, lastOp.path) && !slate_1.Path.equals(removePath, lastOp.path)) {
                        // inserted node is under removed node, so we do not handle this.
                    }
                    else {
                        popLastOp(ops);
                        ret.splice(0, 0, {
                            type: 'move_node',
                            path: removePath.concat(relativePath),
                            newPath: lastOp.path,
                        });
                        if (relativePath.length) {
                            // XXX: first empty the insert_node children, keep the op
                            const parentNode = slate_1.Node.get(op.node, slate_1.Path.parent(relativePath));
                            parentNode.children.splice(relativePath[relativePath.length - 1], 1);
                        }
                        else {
                            // no need to remove any more since it was moved.
                            ret.splice(1, 1);
                        }
                        console.log('move_node3 detected:', lastOp, op, relativePath, ret);
                    }
                }
            }
        }
        ops.push(ret);
    }
    return ops;
}
exports.toSlateOp = toSlateOp;
/**
 * Converts yjs events into slate operations.
 *
 * @param events
 */
function toSlateOps(events, doc) {
    const tempDoc = JSON.parse(JSON.stringify(doc));
    const iterate = (ops, event) => {
        return toSlateOp(event, ops, tempDoc);
    };
    const ops = events.reduce(iterate, []);
    return ops.flatMap(op => op).filter(op => op);
    //return events.flatMap(event => toSlateOp(event, doc));
}
exports.toSlateOps = toSlateOps;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQTRFO0FBQzVFLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsOERBQXNDO0FBQ3RDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDckMsT0FBTyxZQUFZLENBQUE7S0FDcEI7SUFDRCxJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDakMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRSxJQUFJLElBQUksRUFBRTtnQkFDUixZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNuQixPQUFPLElBQUksQ0FBQTthQUNaO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUMsRUFBRTtZQUNGLE9BQU8sWUFBWSxDQUFBO1NBQ3BCO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNiLENBQUMsQ0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBa0IsRUFBb0IsRUFBRTtJQUN6RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDakIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7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