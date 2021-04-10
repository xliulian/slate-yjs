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
const isOnlyChildAndTextMatch = (node, text, level) => {
    if (level === 0) {
        return slate_1.Text.isText(node) && node.text === text && text.length > 0;
    }
    if (slate_1.Element.isElement(node) && node.children.length === 1) {
        return isOnlyChildAndTextMatch(node.children[0], text, level - 1);
    }
    return false;
};
const isOnlyChildAndNodesMatch = (node, nodes, level) => {
    if (level === 0) {
        return slate_1.Element.isElement(node) && node.children.length > 0 && lodash_1.default.isEqual(nodes, node.children);
    }
    if (slate_1.Element.isElement(node) && node.children.length === 1) {
        return isOnlyChildAndNodesMatch(node.children[0], nodes, level - 1);
    }
    return false;
};
const isOnlyChildWithTextAndNodesMatch = (node, text, nodes, level) => {
    if (level === 0) {
        return slate_1.Element.isElement(node) && node.children.length === nodes.length + 1 && lodash_1.default.isEqual(nodes, node.children.slice(1)) && slate_1.Text.isText(node.children[0]) && node.children[0].text === text;
    }
    if (slate_1.Element.isElement(node) && node.children.length === 1) {
        return isOnlyChildWithTextAndNodesMatch(node.children[0], text, nodes, level - 1);
    }
    return false;
};
const isNodeEndAtPath = (node, path, targetPath) => {
    const [, lastPath] = slate_1.Node.last(node, path);
    return targetPath.length >= path.length && slate_1.Path.isCommon(targetPath, lastPath);
};
const isNodeEndAtPoint = (node, path, point) => {
    const [, lastPath] = slate_1.Node.last(node, path);
    if (!slate_1.Path.equals(lastPath, point.path)) {
        return false;
    }
    const leaf = slate_1.Node.get(node, lastPath);
    if (!slate_1.Text.isText(leaf)) {
        return false;
    }
    return leaf.text.length === point.offset;
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
            let nodesLength = 0;
            if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(lastOp.path), op)) {
                popLastOp(ops);
                ret.splice(0, 1);
                let path = slate_1.Path.previous(lastOp.path);
                let node = lastOp.node;
                while (path.length < op.path.length) {
                    ret.splice(0, 0, {
                        type: 'split_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path,
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret.splice(0, 0, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(node, 'text'),
                    position: op.offset,
                    path: op.path,
                });
                console.log('split_node2 detected from:', lastOp, op, ret);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_node' &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    if (o.type === 'remove_node' &&
                        idx === nodes.length &&
                        slate_1.Path.equals(o.path, op.path)) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), slate_1.Path.previous(op.path))) {
                popLastOp(ops);
                const os = ret.splice(0, nodesLength);
                let path = slate_1.Path.previous(lastOp.path);
                const splitPath = slate_1.Path.previous(op.path); // indeed the end path after split.
                let node = lastOp.node;
                while (path.length < op.path.length) {
                    ret.splice(0, 0, {
                        type: 'split_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: splitPath[path.length] + 1,
                        path,
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                console.log('split_node detected from:', lastOp, os, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                slate_1.Path.equals(slate_1.Path.next(op.path), lastOp.path) &&
                slate_1.Path.hasPrevious(beforeLastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(beforeLastOp.path), op.path) &&
                lastOps.every(o => o.type === 'remove_node' && slate_1.Path.equals(o.path, lastOp.path)) &&
                isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map(o => o.type === 'remove_node' && o.node), op.path.length - beforeLastOp.path.length - 1) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(beforeLastOp.path), op)) {
                ops.pop();
                popLastOp(ops);
                const ret2 = [];
                let path = slate_1.Path.previous(beforeLastOp.path);
                let node = beforeLastOp.node;
                while (path.length < op.path.length) {
                    ret2.splice(0, 0, {
                        type: 'split_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path,
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret2.splice(0, 0, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(node, 'text'),
                    position: op.offset,
                    path: op.path,
                });
                ret.splice(0, 1, ...ret2);
                /*ret.splice(
                  0,
                  1,
                  {
                    type: 'split_node',
                    properties: _.omit((beforeLastOp.node as Element).children[0], 'text'),
                    position: op.offset,
                    path: op.path,
                  },
                  {
                    type: 'split_node',
                    properties: _.omit(beforeLastOp.node, 'children'),
                    position: lastOp.path[lastOp.path.length - 1],
                    path: Path.parent(lastOp.path),
                  }
                );*/
                console.log('split_node3 detected from:', beforeLastOp, lastOps, op, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_text' &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(lastOp.path), {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                popLastOp(ops);
                let path = slate_1.Path.previous(lastOp.path);
                let node = lastOp.node;
                const ret2 = [];
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path: slate_1.Path.next(path)
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret2.push({
                    type: 'merge_node',
                    properties: lodash_1.default.omit(node, 'text'),
                    position: op.offset,
                    path: slate_1.Path.next(op.path),
                });
                ret.splice(0, 1, ...ret2);
                /*
                        ret.splice(
                          0,
                          1,
                          {
                            type: 'merge_node',
                            properties: _.omit(lastOp.node, 'children'),
                            position: op.path[op.path.length - 1] + 1,
                            path: lastOp.path,
                          },
                          {
                            type: 'merge_node',
                            properties: _.omit((lastOp.node as Element).children[0], 'text'),
                            position: op.offset,
                            path: Path.next(op.path),
                          },
                        );*/
                console.log('merge_node2 detected from:', lastOp, op, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_node' &&
                slate_1.Path.hasPrevious(op.path) &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    if (o.type === 'insert_node' &&
                        idx === nodes.length &&
                        (idx === 0 ||
                            slate_1.Path.equals(o.path, slate_1.Path.next(ret[idx - 1].path)))) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), slate_1.Path.parent(op.path).concat(op.path[op.path.length - 1] + nodesLength - 1))) {
                popLastOp(ops);
                let path = slate_1.Path.previous(lastOp.path);
                const splitPath = slate_1.Path.previous(op.path); // indeed the end path after split.
                let node = lastOp.node;
                const ret2 = [];
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: splitPath[path.length] + 1,
                        path: slate_1.Path.next(path),
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                const os = ret.splice(0, nodesLength, ...ret2);
                /*ret.splice(0, 0, {
                  type: 'merge_node',
                  properties: _.omit(lastOp.node, 'children'),
                  position: op.path[op.path.length - 1],
                  path: lastOp.path,
                });*/
                console.log('merge_node detected from:', lastOp, os, ret2);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'insert_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'remove_node' &&
                slate_1.Path.hasPrevious(beforeLastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(beforeLastOp.path), op.path) &&
                lastOps.every((o, idx) => o.type === 'insert_node' &&
                    (idx === 0 ||
                        slate_1.Path.equals(o.path, slate_1.Path.next(lastOps[idx - 1].path)))) &&
                slate_1.Path.equals(slate_1.Path.next(op.path), firstOfLastOps.path) &&
                isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map((o) => o.type === 'insert_node' && o.node), op.path.length - beforeLastOp.path.length - 1) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(beforeLastOp.path), lastOp.path) &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length,
                })) {
                ops.pop();
                popLastOp(ops);
                let path = slate_1.Path.previous(beforeLastOp.path);
                let node = beforeLastOp.node;
                const ret2 = [];
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: lodash_1.default.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path: slate_1.Path.next(path)
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret2.push({
                    type: 'merge_node',
                    properties: lodash_1.default.omit(node, 'text'),
                    position: op.offset,
                    path: slate_1.Path.next(op.path),
                });
                ret.splice(0, 1, ...ret2);
                /*ret.splice(
                  0,
                  1,
                  {
                    type: 'merge_node',
                    properties: _.omit(beforeLastOp.node, 'children'),
                    position: (firstOfLastOps as NodeOperation).path.slice(-1)[0],
                    path: beforeLastOp.path,
                  },
                  {
                    type: 'merge_node',
                    properties: _.omit((beforeLastOp.node as Element).children[0], 'text'),
                    position: op.offset,
                    path: Path.next(op.path),
                  }
                )*/
                console.log('merge_node3 detected from:', beforeLastOp, lastOps, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_node' &&
                slate_1.Element.isElement(lastOp.node) && // element more than text.
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
                slate_1.Element.isElement(op.node) && // element more than text.
                JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0) {
                const relativePath = findNodeRelativePath(op.node, lastOp.node);
                if (relativePath) {
                    // XXX: first move part of the node somewhere, then remove node.
                    let removePath = [...op.path];
                    if (slate_1.Path.isCommon(lastOp.path, op.path)) {
                        // insert path should change since we do not remove first, how would the remove op path change the insert path?
                        removePath[lastOp.path.length - 1] -= 1;
                    }
                    if (slate_1.Path.isAncestor(removePath, lastOp.path)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQW1GO0FBQ25GLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsOERBQXNDO0FBQ3RDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDckMsT0FBTyxZQUFZLENBQUE7S0FDcEI7SUFDRCxJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDakMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRSxJQUFJLElBQUksRUFBRTtnQkFDUixZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNuQixPQUFPLElBQUksQ0FBQTthQUNaO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUMsRUFBRTtZQUNGLE9BQU8sWUFBWSxDQUFBO1NBQ3BCO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNiLENBQUMsQ0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBa0IsRUFBb0IsRUFBRTtJQUN6RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDakIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7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