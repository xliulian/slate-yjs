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
// return a number mean the text node need be moved down the number of levels.
const isOnlyChildAndTextMatch = (node, text, level) => {
    if (level === 0 || slate_1.Text.isText(node)) {
        if (slate_1.Text.isText(node) && node.text === text && text.length > 0) {
            return level === 0 ? true : level;
        }
        return false;
    }
    if (slate_1.Element.isElement(node) && node.children.length === 1) {
        return isOnlyChildAndTextMatch(node.children[0], text, level - 1);
    }
    return false;
};
const isOnlyChildAndNodesMatch = (node, nodes, level, allowPrefixEmptyTextNode = false) => {
    if (!nodes.length) {
        return false;
    }
    if (level === 0) {
        if (slate_1.Element.isElement(node) && node.children.length > 0) {
            if (lodash_1.default.isEqual(nodes, node.children)) {
                return {};
            }
            if (allowPrefixEmptyTextNode && node.children.length === nodes.length + 1 && isEmptyTextNode(node.children[0]) && lodash_1.default.isEqual(nodes, node.children.slice(1))) {
                return {
                    withPrefixEmptyText: node.children[0],
                };
            }
        }
        return false;
    }
    if (slate_1.Element.isElement(node)) {
        if (node.children.length === nodes.length && lodash_1.default.isEqual(nodes, node.children)) {
            return { levelsToMove: level };
        }
        if (allowPrefixEmptyTextNode && node.children.length === nodes.length + 1 && isEmptyTextNode(node.children[0]) && lodash_1.default.isEqual(nodes, node.children.slice(1))) {
            return { levelsToMove: level, withPrefixEmptyText: node.children[0] };
        }
        if (node.children.length === 1) {
            return isOnlyChildAndNodesMatch(node.children[0], nodes, level - 1, allowPrefixEmptyTextNode);
        }
    }
    return false;
};
const isOnlyChildWithTextAndNodesMatch = (node, text, nodes, level) => {
    if (!nodes.length || !text.length) {
        return false;
    }
    if (level === 0) {
        return slate_1.Element.isElement(node) && node.children.length === nodes.length + 1 && lodash_1.default.isEqual(nodes, node.children.slice(1)) && slate_1.Text.isText(node.children[0]) && node.children[0].text === text;
    }
    if (slate_1.Element.isElement(node)) {
        if (node.children.length === nodes.length + 1 && lodash_1.default.isEqual(nodes, node.children.slice(1)) && slate_1.Text.isText(node.children[0]) && node.children[0].text === text) {
            return level === 0 ? true : level;
        }
        if (node.children.length === 1) {
            return isOnlyChildWithTextAndNodesMatch(node.children[0], text, nodes, level - 1);
        }
    }
    return false;
};
const isEmptyTextNode = (node) => {
    return slate_1.Text.isText(node) && node.text.length === 0;
};
const isInsertEmptyTextNodeOpWithPath = (op, path) => {
    return op && op.type === 'insert_node' && isEmptyTextNode(op.node) && slate_1.Path.equals(path, op.path);
};
const isRemoveEmptyTextNodeOpWithPath = (op, path) => {
    return op && op.type === 'remove_node' && isEmptyTextNode(op.node) && slate_1.Path.equals(path, op.path);
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
            //if (firstIsDeeper && node0Str.indexOf(node1Str) >= 0 || !firstIsDeeper && node1Str.indexOf(node0Str) >= 0) {
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
            //}
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
            let levelsToMove;
            let matchResult;
            if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(lastOp.path), op)) {
                popLastOp(ops);
                let newLastOp = lastOp;
                ret.splice(0, 1);
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, lastOp.path.length + levelsToMove));
                    ret.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: lastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                let path = slate_1.Path.previous(newLastOp.path);
                let node = newLastOp.node;
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
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    if (o.type === 'remove_node' &&
                        idx === nodes.length &&
                        slate_1.Path.equals(o.path, op.path)) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1, true)) &&
                (isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), slate_1.Path.previous(op.path)) ||
                    ret.length > nodesLength &&
                        isInsertEmptyTextNodeOpWithPath(ret[nodesLength], op.path) &&
                        isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), op.path))) {
                popLastOp(ops);
                const os = ret.splice(0, nodesLength);
                let newLastOp = lastOp;
                if (matchResult.levelsToMove) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove));
                    ret.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: lastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                if (matchResult.withPrefixEmptyText) {
                    // we need finally add the empty text node.
                    ret.splice(matchResult.levelsToMove ? 1 : 0, 0, {
                        type: 'insert_node',
                        path: lastOp.path.concat(Array(op.path.length - lastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
                        node: matchResult.withPrefixEmptyText,
                    });
                }
                let path = slate_1.Path.previous(newLastOp.path);
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
                (levelsToMove = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map(o => o.type === 'remove_node' && o.node), op.path.length - beforeLastOp.path.length - 1)) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(beforeLastOp.path), op)) {
                ops.pop();
                popLastOp(ops);
                const ret2 = [];
                let newBeforeLastOp = beforeLastOp;
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, beforeLastOp.path.length + levelsToMove));
                    ret2.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: beforeLastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newBeforeLastOp = Object.assign(Object.assign({}, beforeLastOp), { path: newPath });
                }
                let path = slate_1.Path.previous(newBeforeLastOp.path);
                let node = newBeforeLastOp.node;
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
                (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
                isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(lastOp.path), {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                popLastOp(ops);
                let newLastOp = lastOp;
                const ret2 = [];
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, lastOp.path.length + levelsToMove));
                    ret2.push({
                        type: 'move_node',
                        path: lastOp.path,
                        newPath,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                let path = slate_1.Path.previous(newLastOp.path);
                let node = newLastOp.node;
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
                (op.type === 'insert_node' || op.type === 'remove_node') &&
                slate_1.Path.hasPrevious(op.path) &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(lastOp.path), op.path) &&
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    const isFirstOpRemoveEmptyTextNode = ret[1] && ret[1].type === 'insert_node' && isRemoveEmptyTextNodeOpWithPath(ret[0], ret[1].path);
                    const firstInsertOpIdx = (isFirstOpRemoveEmptyTextNode ? 1 : 0);
                    if (o.type === 'insert_node' &&
                        idx === nodes.length + firstInsertOpIdx &&
                        (idx === firstInsertOpIdx ||
                            slate_1.Path.equals(o.path, slate_1.Path.next(ret[idx - 1].path)))) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1, true)) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), slate_1.Path.parent(op.path).concat(op.path[op.path.length - 1] + nodesLength - 1))) {
                popLastOp(ops);
                let newLastOp = lastOp;
                const ret2 = [];
                if (matchResult.levelsToMove) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove));
                    ret2.push({
                        type: 'move_node',
                        path: lastOp.path,
                        newPath,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                if (matchResult.withPrefixEmptyText) {
                    // we need remove the first empty text node before do the merge_node
                    ret2.push({
                        type: 'remove_node',
                        path: newLastOp.path.concat(Array(op.path.length - newLastOp.path.length).fill(0)),
                        node: matchResult.withPrefixEmptyText,
                    });
                }
                let path = slate_1.Path.previous(newLastOp.path);
                const splitPath = slate_1.Path.previous(op.path); // indeed the end path after split.
                let node = newLastOp.node;
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
                const os = ret.splice(op.type === 'remove_node' ? 1 : 0, nodesLength, ...ret2);
                /*ret.splice(0, 0, {
                  type: 'merge_node',
                  properties: _.omit(lastOp.node, 'children'),
                  position: op.path[op.path.length - 1],
                  path: lastOp.path,
                });*/
                console.log('merge_node detected from:', lastOp, os, ret);
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
                (levelsToMove = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map((o) => o.type === 'insert_node' && o.node), op.path.length - beforeLastOp.path.length - 1)) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(beforeLastOp.path), lastOp.path) &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length,
                })) {
                ops.pop();
                popLastOp(ops);
                const ret2 = [];
                let newBeforeLastOp = beforeLastOp;
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, beforeLastOp.path.length + levelsToMove));
                    ret2.push({
                        type: 'move_node',
                        path: beforeLastOp.path,
                        newPath,
                    });
                    // consider node was removed from the newPath.
                    newBeforeLastOp = Object.assign(Object.assign({}, beforeLastOp), { path: newPath });
                }
                let path = slate_1.Path.previous(newBeforeLastOp.path);
                let node = newBeforeLastOp.node;
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
                slate_1.Element.isElement(lastOp.node) //&& // element more than text.
            //JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0
            ) {
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
                slate_1.Element.isElement(op.node) //&& // element more than text.
            //JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0
            ) {
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