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
const matchTextSuffix = (node, text) => {
    return text.length > 0 && slate_1.Text.isText(node) && node.text.length > 0 && text.length >= node.text.length && text.slice(-node.text.length) === node.text;
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
const matchTextNode = (node, text, matchInlineText) => {
    if (!matchInlineText && slate_1.Text.isText(node) && node.text === text) {
        return true;
    }
    if (matchInlineText && matchInlineText(node) && slate_1.Element.isElement(node) && node.children.length === 1 && matchTextNode(node.children[0], text)) {
        return 'inline';
    }
    return false;
};
const isOnlyChildWithTextAndNodesMatch = (node, text, nodes, level, opts = {
    allowPrefixEmptyTextNode: false,
}) => {
    if (!nodes.length || !text.length) {
        return false;
    }
    if (level === 0) {
        if (slate_1.Element.isElement(node)) {
            if (node.children.length === nodes.length + 1 && lodash_1.default.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
                return {};
            }
            if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && lodash_1.default.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
                return {
                    withPrefixEmptyText: node.children[0],
                };
            }
        }
        return false;
    }
    if (slate_1.Element.isElement(node)) {
        if (node.children.length === nodes.length + 1 && lodash_1.default.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
            return { levelsToMove: level };
        }
        if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && lodash_1.default.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
            return {
                levelsToMove: level,
                withPrefixEmptyText: node.children[0],
            };
        }
        if (node.children.length === 1) {
            return isOnlyChildWithTextAndNodesMatch(node.children[0], text, nodes, level - 1, opts);
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
function toSlateOp(event, ops, doc, editor) {
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
                lastOps.length === 2 &&
                lastOps[0].type === 'insert_node' &&
                slate_1.Path.equals(slate_1.Path.next(op.path), lastOps[0].path) &&
                slate_1.Path.equals(slate_1.Path.next(lastOps[0].path), lastOp.path) &&
                matchTextSuffix(lastOp.node, op.text) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                ops.pop();
                const ret2 = [];
                let doubleSplit = false;
                if (slate_1.Text.isText(lastOp.node) && op.text.length > lastOp.node.text.length) {
                    // remove text which normally came from delete selection
                    const textToRemove = op.text.slice(0, -lastOp.node.text.length);
                    if (slate_1.Text.isText(lastOps[0].node) && lastOps[0].node.text === textToRemove) {
                        // that remove_text and this insert_node is indeed the other split_node
                        ret2.push({
                            type: 'split_node',
                            properties: lodash_1.default.omit(lastOp.node, 'text'),
                            position: op.offset + textToRemove.length,
                            path: op.path,
                        });
                        doubleSplit = true;
                    }
                    else {
                        ret2.push(Object.assign(Object.assign({}, op), { text: textToRemove }));
                    }
                }
                ret2.push({
                    type: 'split_node',
                    properties: lodash_1.default.omit(doubleSplit ? lastOps[0].node : lastOp.node, 'text'),
                    position: op.offset,
                    path: op.path,
                });
                if (!doubleSplit) {
                    ret2.push(lastOps[0]);
                }
                ret.splice(0, 1, ...ret2);
                console.log('split & insert node detected from:', lastOps, op, ret);
            }
            else if (op.type === 'insert_text' &&
                lastOp.type === 'remove_node' &&
                lastOps.length === 2 &&
                lastOps[0].type === 'remove_node' &&
                slate_1.Path.equals(slate_1.Path.next(op.path), lastOp.path) &&
                slate_1.Path.equals(lastOps[0].path, lastOp.path) &&
                slate_1.Text.isText(lastOp.node) &&
                slate_1.Text.isText(lastOps[0].node) &&
                op.text === lastOps[0].node.text + lastOp.node.text &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                ops.pop();
                ret.splice(0, 1, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(lastOps[0].node, 'text'),
                    position: op.offset,
                    path: lastOp.path,
                }, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(lastOp.node, 'text'),
                    position: op.offset + lastOps[0].node.text.length,
                    path: lastOp.path,
                });
                console.log('(un)mark & merge node detected from:', lastOps, op, ret);
            }
            else if (lastOp.type === 'set_node' &&
                lastOps.length === 1 &&
                op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                slate_1.Path.equals(op.path, lastOp.path) &&
                slate_1.Path.equals(slate_1.Path.next(op.path), beforeLastOp.path) &&
                isOnlyChildAndTextMatch(beforeLastOp.node, op.text, 0) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                // three ops, the first and the last one is for split.
                ops.pop();
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: lodash_1.default.omit(beforeLastOp.node, 'text'),
                    position: op.offset,
                    path: op.path,
                }, lastOp);
                console.log('split & mark detected from:', beforeLastOp, lastOp, op, ret);
            }
            else if (lastOp.type === 'set_node' &&
                lastOps.length === 1 &&
                op.type === 'insert_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'remove_node' &&
                slate_1.Path.equals(op.path, lastOp.path) &&
                slate_1.Path.equals(slate_1.Path.next(op.path), beforeLastOp.path) &&
                isOnlyChildAndTextMatch(beforeLastOp.node, op.text, 0) &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                // three ops, the first and the last one is for merge.
                ops.pop();
                popLastOp(ops);
                ret.splice(0, 1, lastOp, {
                    type: 'merge_node',
                    properties: lodash_1.default.omit(beforeLastOp.node, 'text'),
                    position: op.offset,
                    path: beforeLastOp.path,
                });
                console.log('(un)mark & merge detected from:', beforeLastOp, lastOp, op, ret);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                slate_1.Path.hasPrevious(lastOp.path) &&
                slate_1.Path.isCommon(slate_1.Path.previous(lastOp.path), op.path) &&
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
                if (matchResult.withPrefixEmptyText) {
                    // we need finally add the empty text node.
                    ret.splice(0, 0, {
                        type: 'insert_node',
                        path: lastOp.path.concat(Array(op.path.length - lastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
                        node: matchResult.withPrefixEmptyText,
                    });
                }
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
            else if (op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                (lastOp.type === 'remove_node' || lastOps.length > 1 && lastOp.type === 'insert_node' && lastOps[0].type === 'remove_node' && isInsertEmptyTextNodeOpWithPath(lastOp, lastOps[0].path)) &&
                (slate_1.Path.equals(slate_1.Path.next(op.path), lastOp.path) || slate_1.Path.equals(slate_1.Path.next(slate_1.Path.parent(op.path)), lastOp.path)) && // later case require inline text match
                slate_1.Path.hasPrevious(beforeLastOp.path) &&
                slate_1.Path.isAncestor(slate_1.Path.previous(beforeLastOp.path), op.path) &&
                lastOps.every((o, idx) => idx === lastOps.length - 1 || o.type === 'remove_node' && slate_1.Path.equals(o.path, lastOp.path)) &&
                (matchResult = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.filter(o => o.type === 'remove_node').map(o => o.type === 'remove_node' && o.node), lastOp.path.length - beforeLastOp.path.length - 1, {
                    allowPrefixEmptyTextNode: true,
                    matchInlineText: op.path.length - lastOp.path.length === 1 ? (n) => slate_1.Element.isElement(n) && editor.isInline(n) && !editor.isVoid(n) : undefined,
                })) &&
                (lastOp.type === 'insert_node' && isNodeEndAtPath(dummyEditor, slate_1.Path.previous(beforeLastOp.path), lastOp.path) ||
                    lastOp.type !== 'insert_node' && isNodeEndAtPoint(dummyEditor, slate_1.Path.previous(beforeLastOp.path), op))) {
                ops.pop();
                popLastOp(ops);
                const ret2 = [];
                if (lastOp.type === 'insert_node') {
                    // finally insert empty text node for the splited inline end.
                    ret2.push(lastOp);
                }
                if (matchResult.withPrefixEmptyText) {
                    // we need finally add the empty text node.
                    ret2.splice(0, 0, {
                        type: 'insert_node',
                        path: beforeLastOp.path.concat(Array(lastOp.path.length - beforeLastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
                        node: matchResult.withPrefixEmptyText,
                    });
                }
                let newBeforeLastOp = beforeLastOp;
                if (matchResult.levelsToMove) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove));
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
                    node = node.children[matchResult.withPrefixEmptyText && path.length === lastOp.path.length ? 1 : 0];
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
                slate_1.Path.isCommon(slate_1.Path.previous(lastOp.path), op.path) &&
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
                (matchResult = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map((o) => o.type === 'insert_node' && o.node), op.path.length - beforeLastOp.path.length - 1)) &&
                isNodeEndAtPath(dummyEditor, slate_1.Path.previous(beforeLastOp.path), lastOp.path) &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length,
                })) {
                ops.pop();
                popLastOp(ops);
                const ret2 = [];
                let newBeforeLastOp = beforeLastOp;
                if (matchResult.levelsToMove) {
                    // XXX: need first a move down N levels op.
                    const newPath = slate_1.Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove));
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
function toSlateOps(events, editor) {
    const tempDoc = JSON.parse(JSON.stringify(editor.children));
    const iterate = (ops, event) => {
        return toSlateOp(event, ops, tempDoc, editor);
    };
    const ops = events.reduce(iterate, []);
    return ops.flatMap(op => op).filter(op => op);
    //return events.flatMap(event => toSlateOp(event, doc));
}
exports.toSlateOps = toSlateOps;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQTJGO0FBQzNGLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsOERBQXNDO0FBQ3RDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDckMsT0FBTyxZQUFZLENBQUE7S0FDcEI7SUFDRCxJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDakMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRSxJQUFJLElBQUksRUFBRTtnQkFDUixZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNuQixPQUFPLElBQUksQ0FBQTthQUNaO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUMsRUFBRTtZQUNGLE9BQU8sWUFBWSxDQUFBO1NBQ3BCO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNiLENBQUMsQ0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBa0IsRUFBb0IsRUFBRTtJQUN6RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDakIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbkMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN0QixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQ25CLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTthQUNWO1lBQ0QsT0FBTyxFQUFHLENBQUE7U0FDWDtRQUNELEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtLQUNWO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLElBQVUsRUFBRSxJQUFZLEVBQVcsRUFBRTtJQUM1RCxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQTtBQUN2SixDQUFDLENBQUE7QUFFRCw4RUFBOEU7QUFDOUUsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLElBQVUsRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFvQixFQUFFO0lBQzVGLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxZQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3BDLElBQUksWUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5RCxPQUFPLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1NBQ2xDO1FBQ0QsT0FBTyxLQUFLLENBQUE7S0FDYjtJQUNELElBQUksZUFBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekQsT0FBTyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7S0FDbEU7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNkLENBQUMsQ0FBQTtBQU9ELE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxJQUFVLEVBQUUsS0FBYSxFQUFFLEtBQWEsRUFBRSwyQkFBb0MsS0FBSyxFQUF1QixFQUFFO0lBQzVJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO1FBQ2pCLE9BQU8sS0FBSyxDQUFBO0tBQ2I7SUFDRCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7UUFDZixJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZELElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbkMsT0FBTyxFQUFFLENBQUE7YUFDVjtZQUNELElBQUksd0JBQXdCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDMUosT0FBTztvQkFDTCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBUztpQkFDOUMsQ0FBQTthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQTtLQUNiO0lBQ0QsSUFBSSxlQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzNCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzVFLE9BQU8sRUFBQyxZQUFZLEVBQUUsS0FBSyxFQUFDLENBQUE7U0FDN0I7UUFDRCxJQUFJLHdCQUF3QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUosT0FBTyxFQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQVMsRUFBQyxDQUFBO1NBQzVFO1FBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDOUIsT0FBTyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUE7U0FDOUY7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2QsQ0FBQyxDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFVLEVBQUUsSUFBWSxFQUFFLGVBQXNDLEVBQXNCLEVBQUU7SUFDN0csSUFBSSxDQUFDLGVBQWUsSUFBSSxZQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQy9ELE9BQU8sSUFBSSxDQUFBO0tBQ1o7SUFDRCxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksZUFBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDOUksT0FBTyxRQUFRLENBQUE7S0FDaEI7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNkLENBQUMsQ0FBQTtBQUVELE1BQU0sZ0NBQWdDLEdBQUcsQ0FBQyxJQUFVLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxLQUFhLEVBQUUsT0FBb0Y7SUFDcEwsd0JBQXdCLEVBQUUsS0FBSztDQUNoQyxFQUF1QixFQUFFO0lBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNqQyxPQUFPLEtBQUssQ0FBQTtLQUNiO0lBQ0QsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxlQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzNCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDeEosT0FBTyxFQUFFLENBQUE7YUFDVjtZQUNELElBQUksSUFBSSxDQUFDLHdCQUF3QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDOU4sT0FBTztvQkFDTCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBUztpQkFDOUMsQ0FBQTthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQTtLQUNiO0lBQ0QsSUFBSSxlQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzNCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUN4SixPQUFPLEVBQUMsWUFBWSxFQUFFLEtBQUssRUFBQyxDQUFBO1NBQzdCO1FBQ0QsSUFBSSxJQUFJLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQzVOLE9BQU87Z0JBQ0wsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLG1CQUFtQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFTO2FBQzlDLENBQUE7U0FDRjtRQUNILElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzlCLE9BQU8sZ0NBQWdDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7U0FDeEY7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2QsQ0FBQyxDQUFBO0FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxJQUFVLEVBQUUsRUFBRTtJQUNyQyxPQUFPLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO0FBQ3BELENBQUMsQ0FBQTtBQUVELE1BQU0sK0JBQStCLEdBQUcsQ0FBQyxFQUFhLEVBQUUsSUFBVSxFQUFFLEVBQUU7SUFDcEUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDbEcsQ0FBQyxDQUFBO0FBRUQsTUFBTSwrQkFBK0IsR0FBRyxDQUFDLEVBQWEsRUFBRSxJQUFVLEVBQUUsRUFBRTtJQUNwRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsSUFBSSxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNsRyxDQUFDLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLElBQVUsRUFBRSxJQUFVLEVBQUUsVUFBZ0IsRUFBVyxFQUFFO0lBQzVFLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzFDLE9BQU8sVUFBVSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFlBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ2hGLENBQUMsQ0FBQTtBQUVELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxJQUFVLEVBQUUsSUFBVSxFQUFFLEtBQVksRUFBVyxFQUFFO0lBQ3pFLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzFDLElBQUksQ0FBQyxZQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEMsT0FBTyxLQUFLLENBQUE7S0FDYjtJQUVELE1BQU0sSUFBSSxHQUFHLFlBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBRXJDLElBQUksQ0FBQyxZQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3RCLE9BQU8sS0FBSyxDQUFBO0tBQ2I7SUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLENBQUE7QUFDMUMsQ0FBQyxDQUFBO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLFNBQVMsQ0FBQyxLQUFlLEVBQUUsR0FBa0IsRUFBRSxHQUFRLEVBQUUsTUFBYztJQUNyRixJQUFJLEdBQWdCLENBQUE7SUFDcEIsSUFBSSxLQUFLLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRTtRQUNsQyxHQUFHLEdBQUcsb0JBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFDRSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDaEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhO1lBQzdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYTtZQUM3QixZQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNyQztZQUNBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUN2RCw4R0FBOEc7WUFDNUcsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO2dCQUN6QixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUMxQyxPQUFPLEdBQUcsQ0FBQTthQUNYO1lBQ0QsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzVELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUM1RCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDakUsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDN0UsTUFBTSxVQUFVLEdBQUcsWUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsWUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBWSxDQUFBO2dCQUM3RSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxhQUFhLEVBQUU7b0JBQ2pCLEdBQUcsR0FBRzt3QkFDSjs0QkFDRSxJQUFJLEVBQUUsV0FBVzs0QkFDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBUzs0QkFDOUMsT0FBTyxFQUFFLFlBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzt5QkFDZjt3QkFDbEI7NEJBQ0UsSUFBSSxFQUFFLGFBQWE7NEJBQ25CLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTs0QkFDakIsSUFBSSxFQUFFLFVBQVU7eUJBQ0E7cUJBQ25CLENBQUE7aUJBQ0Y7cUJBQU07b0JBQ0wsMENBQTBDO29CQUMxQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNwQyxHQUFHLEdBQUc7d0JBQ0osR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDTjs0QkFDRSxJQUFJLEVBQUUsV0FBVzs0QkFDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJOzRCQUNqQixPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFTO3lCQUNqQztxQkFDbkIsQ0FBQTtpQkFDRjtnQkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNiLE9BQU8sR0FBRyxDQUFBO2FBQ1g7WUFDSCxHQUFHO1NBQ0o7S0FDRjtTQUFNLElBQUksS0FBSyxZQUFZLENBQUMsQ0FBQyxTQUFTLEVBQUU7UUFDdkMsR0FBRyxHQUFHLGtCQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO1NBQU0sSUFBSSxLQUFLLFlBQVksQ0FBQyxDQUFDLFVBQVUsRUFBRTtRQUN4QyxHQUFHLEdBQUcsbUJBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDN0I7U0FBTTtRQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztLQUMxQztJQUNELElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbEMsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNsQixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWdCLENBQUE7WUFDbEQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBYyxDQUFBO1lBQzlDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqQixNQUFNLFdBQVcsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUE7WUFDbkIsSUFBSSxZQUFZLENBQUE7WUFDaEIsSUFBSSxXQUFXLENBQUE7WUFDZixJQUNFLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDN0IsRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhO2dCQUN6QixPQUFPLENBQUMsTUFBTSxLQUFLLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDakMsWUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNoRCxZQUFJLENBQUMsTUFBTSxDQUFDLFlBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ3BELGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3JDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUMxQztnQkFDQSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7Z0JBRVQsTUFBTSxJQUFJLEdBQWdCLEVBQUUsQ0FBQTtnQkFDNUIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO2dCQUN2QixJQUFJLFlBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDeEUsd0RBQXdEO29CQUN4RCxNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDL0QsSUFBSSxZQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7d0JBQ3pFLHVFQUF1RTt3QkFDdkUsSUFBSSxDQUFDLElBQUksQ0FBQzs0QkFDUixJQUFJLEVBQUUsWUFBWTs0QkFDbEIsVUFBVSxFQUFFLGdCQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDOzRCQUN2QyxRQUFRLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTTs0QkFDekMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO3lCQUNkLENBQUMsQ0FBQTt3QkFDRixXQUFXLEdBQUcsSUFBSSxDQUFBO3FCQUNuQjt5QkFBTTt3QkFDTCxJQUFJLENBQUMsSUFBSSxpQ0FDSixFQUFFLEtBQ0wsSUFBSSxFQUFFLFlBQVksSUFDbEIsQ0FBQTtxQkFDSDtpQkFDRjtnQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUNSLElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztvQkFDdkUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNuQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxXQUFXLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7aUJBQ3RCO2dCQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO2dCQUV6QixPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDckU7aUJBQU0sSUFDTCxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQ3pCLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDN0IsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDO2dCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQ2pDLFlBQUksQ0FBQyxNQUFNLENBQUMsWUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDNUMsWUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLFlBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDeEIsWUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM1QixFQUFFLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFDbkQsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUU7b0JBQ3JDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtvQkFDYixNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU07aUJBQ25DLENBQUMsRUFDRjtnQkFDQSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7Z0JBRVQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUNmLElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7b0JBQzNDLFFBQVEsRUFBRSxFQUFFLENBQUMsTUFBTTtvQkFDbkIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2lCQUNsQixFQUFFO29CQUNELElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7b0JBQ3ZDLFFBQVEsRUFBRSxFQUFFLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07b0JBQ2pELElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtpQkFDbEIsQ0FBQyxDQUFBO2dCQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUN2RTtpQkFBTSxJQUNMLE1BQU0sQ0FBQyxJQUFJLEtBQUssVUFBVTtnQkFDMUIsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDO2dCQUNwQixFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQ3pCLENBQUEsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLElBQUksTUFBSyxhQUFhO2dCQUNwQyxZQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDakMsWUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDO2dCQUNsRCx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFDMUM7Z0JBQ0Esc0RBQXNEO2dCQUN0RCxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7Z0JBQ1QsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUVkLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDZixJQUFJLEVBQUUsWUFBWTtvQkFDbEIsVUFBVSxFQUFFLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO29CQUM3QyxRQUFRLEVBQUUsRUFBRSxDQUFDLE1BQU07b0JBQ25CLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtpQkFDZCxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUVWLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0U7aUJBQU0sSUFDTCxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVU7Z0JBQzFCLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFDcEIsRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhO2dCQUN6QixDQUFBLFlBQVksYUFBWixZQUFZLHVCQUFaLFlBQVksQ0FBRSxJQUFJLE1BQUssYUFBYTtnQkFDcEMsWUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ2pDLFlBQUksQ0FBQyxNQUFNLENBQUMsWUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDbEQsdUJBQXVCLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDdEQsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUU7b0JBQ3JDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtvQkFDYixNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU07aUJBQ25DLENBQUMsRUFDRjtnQkFDQSxzREFBc0Q7Z0JBQ3RELEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDVCxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRWQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRTtvQkFDdkIsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztvQkFDN0MsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNuQixJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUk7aUJBQ3hCLENBQUMsQ0FBQTtnQkFFRixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQy9FO2lCQUFNLElBQ0wsTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhO2dCQUM3QixFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQ3pCLFlBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDN0IsWUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNsRCxDQUFDLFlBQVksR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFlBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUM3RDtnQkFDQSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2QsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFBO2dCQUN0QixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEIsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO29CQUN6QiwyQ0FBMkM7b0JBQzNDLE1BQU0sT0FBTyxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFJLFlBQXVCLENBQUMsQ0FBQyxDQUFBO29CQUMxRixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ2YsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLElBQUksRUFBRSxPQUFPO3dCQUNiLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSTtxQkFDSixDQUFDLENBQUE7b0JBQ25CLDhDQUE4QztvQkFDOUMsU0FBUyxtQ0FDSixNQUFNLEtBQ1QsSUFBSSxFQUFFLE9BQU8sR0FDZCxDQUFBO2lCQUNGO2dCQUNELElBQUksSUFBSSxHQUFHLFlBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN4QyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBZSxDQUFBO2dCQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDZixJQUFJLEVBQUUsWUFBWTt3QkFDbEIsVUFBVSxFQUFFLGdCQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7d0JBQ3BDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO3dCQUNsQyxJQUFJO3FCQUNMLENBQUMsQ0FBQztvQkFDSCxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO29CQUN4QyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQVksQ0FBQTtpQkFDbkM7Z0JBQ0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUNmLElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztvQkFDaEMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNuQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUM1RDtpQkFBTSxJQUNMLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDN0IsRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhO2dCQUN6QixZQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLFlBQUksQ0FBQyxVQUFVLENBQUMsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDcEQsQ0FBQyxXQUFXLEdBQUcsd0JBQXdCLENBQ3JDLE1BQU0sQ0FBQyxJQUFJLEVBQ1gsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQWEsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7b0JBQ25DLElBQ0UsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhO3dCQUN4QixHQUFHLEtBQUssS0FBSyxDQUFDLE1BQU07d0JBQ3BCLFlBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzVCO3dCQUNBLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNuQixXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztxQkFDNUI7b0JBQ0QsT0FBTyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQyxFQUFFLEVBQVksQ0FBVyxFQUMxQixFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3ZDLElBQUksQ0FDTCxDQUFDO2dCQUNGLENBQUMsZUFBZSxDQUNkLFdBQVcsRUFDWCxZQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFDMUIsWUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQ3ZCO29CQUNELEdBQUcsQ0FBQyxNQUFNLEdBQUcsV0FBVzt3QkFDeEIsK0JBQStCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7d0JBQzFELGVBQWUsQ0FDYixXQUFXLEVBQ1gsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQzFCLEVBQUUsQ0FBQyxJQUFJLENBQ1IsQ0FBQyxFQUNGO2dCQUNBLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFBO2dCQUN0QixJQUFJLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRTtvQkFDbkMsMkNBQTJDO29CQUMzQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ2YsSUFBSSxFQUFFLGFBQWE7d0JBQ25CLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM5RyxJQUFJLEVBQUUsV0FBVyxDQUFDLG1CQUFtQjtxQkFDdEMsQ0FBQyxDQUFBO2lCQUNIO2dCQUNELElBQUksV0FBVyxDQUFDLFlBQVksRUFBRTtvQkFDNUIsMkNBQTJDO29CQUMzQyxNQUFNLE9BQU8sR0FBRyxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtvQkFDMUYsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO3dCQUNmLElBQUksRUFBRSxXQUFXO3dCQUNqQixJQUFJLEVBQUUsT0FBTzt3QkFDYixPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUk7cUJBQ0osQ0FBQyxDQUFBO29CQUNuQiw4Q0FBOEM7b0JBQzlDLFNBQVMsbUNBQ0osTUFBTSxLQUNULElBQUksRUFBRSxPQUFPLEdBQ2QsQ0FBQTtpQkFDRjtnQkFDRCxJQUFJLElBQUksR0FBRyxZQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekMsTUFBTSxTQUFTLEdBQUcsWUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7Z0JBQzdFLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFlLENBQUM7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDbkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO3dCQUNmLElBQUksRUFBRSxZQUFZO3dCQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQzt3QkFDcEMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzt3QkFDcEMsSUFBSTtxQkFDTCxDQUFDLENBQUM7b0JBQ0gsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFZLENBQUM7aUJBQ3BDO2dCQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUMzRDtpQkFBTSxJQUNMLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDekIsQ0FBQSxZQUFZLGFBQVosWUFBWSx1QkFBWixZQUFZLENBQUUsSUFBSSxNQUFLLGFBQWE7Z0JBQ3BDLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksK0JBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkwsQ0FBQyxZQUFJLENBQUMsTUFBTSxDQUFDLFlBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFJLENBQUMsTUFBTSxDQUFDLFlBQUksQ0FBQyxJQUFJLENBQUMsWUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSx1Q0FBdUM7Z0JBQ3RKLFlBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDbkMsWUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUMxRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLFlBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JILENBQUMsV0FBVyxHQUFHLGdDQUFnQyxDQUM3QyxZQUFZLENBQUMsSUFBSSxFQUNqQixFQUFFLENBQUMsSUFBSSxFQUNQLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQVcsRUFDcEcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUNqRDtvQkFDRSx3QkFBd0IsRUFBRSxJQUFJO29CQUM5QixlQUFlLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDaEosQ0FDRixDQUFDO2dCQUNGLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxZQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUM3RyxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWEsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsWUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDckc7Z0JBQ0EsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNULFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFFZCxNQUFNLElBQUksR0FBZ0IsRUFBRSxDQUFBO2dCQUM1QixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFO29CQUNqQyw2REFBNkQ7b0JBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7aUJBQ2xCO2dCQUNELElBQUksV0FBVyxDQUFDLG1CQUFtQixFQUFFO29CQUNuQywyQ0FBMkM7b0JBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDaEIsSUFBSSxFQUFFLGFBQWE7d0JBQ25CLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM5SCxJQUFJLEVBQUUsV0FBVyxDQUFDLG1CQUFtQjtxQkFDdEMsQ0FBQyxDQUFBO2lCQUNIO2dCQUNELElBQUksZUFBZSxHQUFHLFlBQVksQ0FBQTtnQkFDbEMsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFO29CQUM1QiwyQ0FBMkM7b0JBQzNDLE1BQU0sT0FBTyxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO29CQUNoRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ2hCLElBQUksRUFBRSxXQUFXO3dCQUNqQixJQUFJLEVBQUUsT0FBTzt3QkFDYixPQUFPLEVBQUUsWUFBWSxDQUFDLElBQUk7cUJBQ1YsQ0FBQyxDQUFBO29CQUNuQiw4Q0FBOEM7b0JBQzlDLGVBQWUsbUNBQ1YsWUFBWSxLQUNmLElBQUksRUFBRSxPQUFPLEdBQ2QsQ0FBQTtpQkFDRjtnQkFDRCxJQUFJLElBQUksR0FBRyxZQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQWUsQ0FBQTtnQkFDMUMsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ2hCLElBQUksRUFBRSxZQUFZO3dCQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQzt3QkFDcEMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7d0JBQ2xDLElBQUk7cUJBQ0wsQ0FBQyxDQUFDO29CQUNILElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7b0JBQ3hDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBWSxDQUFBO2lCQUMvRztnQkFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ2hCLElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztvQkFDaEMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNO29CQUNuQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2dCQUVGLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO2dCQUV6Qjs7Ozs7Ozs7Ozs7Ozs7O29CQWVJO2dCQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0U7aUJBQU0sSUFDTCxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQzdCLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDekIsWUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUM3QixZQUFJLENBQUMsUUFBUSxDQUFDLFlBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xELENBQUMsWUFBWSxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3hELElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtvQkFDYixNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU07aUJBQ25DLENBQUMsRUFDRjtnQkFDQSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRWQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFBO2dCQUN0QixNQUFNLElBQUksR0FBb0IsRUFBRSxDQUFBO2dCQUNoQyxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7b0JBQ3pCLDJDQUEyQztvQkFDM0MsTUFBTSxPQUFPLEdBQUcsWUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUksWUFBdUIsQ0FBQyxDQUFDLENBQUE7b0JBQzFGLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTt3QkFDakIsT0FBTztxQkFDUyxDQUFDLENBQUE7b0JBQ25CLDhDQUE4QztvQkFDOUMsU0FBUyxtQ0FDSixNQUFNLEtBQ1QsSUFBSSxFQUFFLE9BQU8sR0FDZCxDQUFBO2lCQUNGO2dCQUNELElBQUksSUFBSSxHQUFHLFlBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN4QyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBZSxDQUFBO2dCQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFlBQVk7d0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO3dCQUNwQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzt3QkFDbEMsSUFBSSxFQUFFLFlBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO3FCQUN0QixDQUFDLENBQUM7b0JBQ0gsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtvQkFDeEMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFZLENBQUE7aUJBQ25DO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ1IsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO29CQUNoQyxRQUFRLEVBQUUsRUFBRSxDQUFDLE1BQU07b0JBQ25CLElBQUksRUFBRSxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7aUJBQ3pCLENBQUMsQ0FBQTtnQkFDRixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtnQkFDakM7Ozs7Ozs7Ozs7Ozs7Ozs7NEJBZ0JZO2dCQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUM1RDtpQkFBTSxJQUNMLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDN0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQztnQkFDeEQsWUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUN6QixZQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLFlBQUksQ0FBQyxVQUFVLENBQUMsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDcEQsQ0FBQyxXQUFXLEdBQUcsd0JBQXdCLENBQ3JDLE1BQU0sQ0FBQyxJQUFJLEVBQ1gsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQWEsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7b0JBQ25DLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3BJLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDL0QsSUFDRSxDQUFDLENBQUMsSUFBSSxLQUFLLGFBQWE7d0JBQ3hCLEdBQUcsS0FBSyxLQUFLLENBQUMsTUFBTSxHQUFHLGdCQUFnQjt3QkFDdkMsQ0FBQyxHQUFHLEtBQUssZ0JBQWdCOzRCQUN2QixZQUFJLENBQUMsTUFBTSxDQUNULENBQUMsQ0FBQyxJQUFJLEVBQ04sWUFBSSxDQUFDLElBQUksQ0FBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBbUIsQ0FBQyxJQUFJLENBQUMsQ0FDaEQsQ0FBQyxFQUNKO3dCQUNBLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNuQixXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztxQkFDNUI7b0JBQ0QsT0FBTyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQyxFQUFFLEVBQVksQ0FBVyxFQUMxQixFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3ZDLElBQUksQ0FDTCxDQUFDO2dCQUNGLGVBQWUsQ0FDYixXQUFXLEVBQ1gsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQzFCLFlBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFdBQVksR0FBRyxDQUFDLENBQUMsQ0FDNUUsRUFDRDtnQkFDQSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRWYsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFBO2dCQUN0QixNQUFNLElBQUksR0FBb0IsRUFBRSxDQUFBO2dCQUNoQyxJQUFJLFdBQVcsQ0FBQyxZQUFZLEVBQUU7b0JBQzVCLDJDQUEyQztvQkFDM0MsTUFBTSxPQUFPLEdBQUcsWUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7b0JBQzFGLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTt3QkFDakIsT0FBTztxQkFDUyxDQUFDLENBQUE7b0JBQ25CLDhDQUE4QztvQkFDOUMsU0FBUyxtQ0FDSixNQUFNLEtBQ1QsSUFBSSxFQUFFLE9BQU8sR0FDZCxDQUFBO2lCQUNGO2dCQUNELElBQUksV0FBVyxDQUFDLG1CQUFtQixFQUFFO29CQUNuQyxvRUFBb0U7b0JBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLGFBQWE7d0JBQ25CLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xGLElBQUksRUFBRSxXQUFXLENBQUMsbUJBQW1CO3FCQUN0QyxDQUFDLENBQUE7aUJBQ0g7Z0JBQ0QsSUFBSSxJQUFJLEdBQUcsWUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLE1BQU0sU0FBUyxHQUFHLFlBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsbUNBQW1DO2dCQUM3RSxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBZSxDQUFDO2dCQUNyQyxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFlBQVk7d0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO3dCQUNwQyxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO3dCQUNwQyxJQUFJLEVBQUUsWUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7cUJBQ0wsQ0FBQyxDQUFDO29CQUNwQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUN6QyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQVksQ0FBQztpQkFDcEM7Z0JBRUQsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQy9FOzs7OztxQkFLSztnQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0Q7aUJBQU0sSUFDTCxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQzdCLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDekIsQ0FBQSxZQUFZLGFBQVosWUFBWSx1QkFBWixZQUFZLENBQUUsSUFBSSxNQUFLLGFBQWE7Z0JBQ3BDLFlBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDbkMsWUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUMxRCxPQUFPLENBQUMsS0FBSyxDQUNYLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQ1QsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhO29CQUN4QixDQUFDLEdBQUcsS0FBSyxDQUFDO3dCQUNSLFlBQUksQ0FBQyxNQUFNLENBQ1QsQ0FBQyxDQUFDLElBQUksRUFDTixZQUFJLENBQUMsSUFBSSxDQUFFLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFtQixDQUFDLElBQUksQ0FBQyxDQUNwRCxDQUFDLENBQ1A7Z0JBQ0QsWUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRyxjQUFnQyxDQUFDLElBQUksQ0FBQztnQkFDdkUsQ0FBQyxXQUFXLEdBQUcsZ0NBQWdDLENBQzdDLFlBQVksQ0FBQyxJQUFJLEVBQ2pCLEVBQUUsQ0FBQyxJQUFJLEVBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBVyxFQUNoRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQzlDLENBQUM7Z0JBQ0YsZUFBZSxDQUFDLFdBQVcsRUFBRSxZQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUMzRSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRTtvQkFDckMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNiLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTTtpQkFDbkMsQ0FBQyxFQUNGO2dCQUNBLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDVCxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRWQsTUFBTSxJQUFJLEdBQW9CLEVBQUUsQ0FBQTtnQkFDaEMsSUFBSSxlQUFlLEdBQUcsWUFBWSxDQUFBO2dCQUNsQyxJQUFJLFdBQVcsQ0FBQyxZQUFZLEVBQUU7b0JBQzVCLDJDQUEyQztvQkFDM0MsTUFBTSxPQUFPLEdBQUcsWUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7b0JBQ2hHLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSTt3QkFDdkIsT0FBTztxQkFDUyxDQUFDLENBQUE7b0JBQ25CLDhDQUE4QztvQkFDOUMsZUFBZSxtQ0FDVixZQUFZLEtBQ2YsSUFBSSxFQUFFLE9BQU8sR0FDZCxDQUFBO2lCQUNGO2dCQUNELElBQUksSUFBSSxHQUFHLFlBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLElBQUksR0FBRyxlQUFlLENBQUMsSUFBZSxDQUFBO2dCQUMxQyxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ1IsSUFBSSxFQUFFLFlBQVk7d0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO3dCQUNwQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzt3QkFDbEMsSUFBSSxFQUFFLFlBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO3FCQUN0QixDQUFDLENBQUM7b0JBQ0gsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtvQkFDeEMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFZLENBQUE7aUJBQ25DO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ1IsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLFVBQVUsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO29CQUNoQyxRQUFRLEVBQUUsRUFBRSxDQUFDLE1BQU07b0JBQ25CLElBQUksRUFBRSxZQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7aUJBQ3pCLENBQUMsQ0FBQTtnQkFDRixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtnQkFFekI7Ozs7Ozs7Ozs7Ozs7OzttQkFlRztnQkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDdkU7aUJBQU0sSUFDTCxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQzdCLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDekIsZUFBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsK0JBQStCO1lBQzlELG1FQUFtRTtjQUNuRTtnQkFDQSxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDL0QsSUFBSSxZQUFZLEVBQUU7b0JBQ2hCLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZCx5SEFBeUg7b0JBQ3pILHVIQUF1SDtvQkFDdkgsdUlBQXVJO29CQUN2SSx5R0FBeUc7b0JBQ3pHLDhFQUE4RTtvQkFDOUUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDN0IsSUFBSSxZQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN2QywrR0FBK0c7d0JBQy9HLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7cUJBQ3hDO29CQUNELE1BQU0sS0FBSyxHQUFHO3dCQUNaLElBQUksRUFBRSxXQUFXO3dCQUNqQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7d0JBQ2pCLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7cUJBQ3JCLENBQUE7b0JBQ2xCLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTt3QkFDdkIseURBQXlEO3dCQUN6RCxNQUFNLFVBQVUsR0FBRyxZQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsWUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBWSxDQUFBO3dCQUMxRSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFFcEUsdUZBQXVGO3dCQUN2RixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsZ0NBQ1osRUFBRSxLQUNMLElBQUksRUFBRSxVQUFVLEdBQ0EsRUFBRSxLQUFLLENBQUMsQ0FBQTtxQkFDM0I7eUJBQU07d0JBQ0wsK0NBQStDO3dCQUMvQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7cUJBQ3hCO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7aUJBQ25FO2FBQ0Y7aUJBQU0sSUFDTCxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWE7Z0JBQzdCLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYTtnQkFDekIsZUFBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsK0JBQStCO1lBQzFELG1FQUFtRTtjQUNuRTtnQkFDQSxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDL0QsSUFBSSxZQUFZLEVBQUU7b0JBQ2hCLGdFQUFnRTtvQkFDaEUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDN0IsSUFBSSxZQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN2QywrR0FBK0c7d0JBQy9HLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7cUJBQ3hDO29CQUNELElBQUksWUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUM1QyxpRUFBaUU7cUJBQ2xFO3lCQUFNO3dCQUNMLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDZCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7NEJBQ2YsSUFBSSxFQUFFLFdBQVc7NEJBQ2pCLElBQUksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQzs0QkFDckMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJO3lCQUNyQixDQUFDLENBQUE7d0JBQ0YsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFOzRCQUN2Qix5REFBeUQ7NEJBQ3pELE1BQU0sVUFBVSxHQUFHLFlBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxZQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFZLENBQUE7NEJBQzFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO3lCQUNyRTs2QkFBTTs0QkFDTCxpREFBaUQ7NEJBQ2pELEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO3lCQUNqQjt3QkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO3FCQUNuRTtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0tBQ2Q7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNaLENBQUM7QUE1c0JELDhCQTRzQkM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLE1BQWtCLEVBQUUsTUFBYztJQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFFM0QsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFrQixFQUFFLEtBQWUsRUFBaUIsRUFBRTtRQUNyRSxPQUFPLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUE7SUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUV0QyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3Qyx3REFBd0Q7QUFDMUQsQ0FBQztBQVhELGdDQVdDIn0=