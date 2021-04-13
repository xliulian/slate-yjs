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
// if text is longer or equal length of node text, and node text is suffix of the text
const matchTextSuffix = (node, text) => {
    return text.length > 0 && slate_1.Text.isText(node) && node.text.length > 0 && text.length >= node.text.length && text.slice(-node.text.length) === node.text;
};
// return a number mean the text node need be moved down the number of levels.
const isOnlyChildAndTextMatch = (node, text, level = 0) => {
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
const isOnlyChildAndNodesMatch = (node, nodes, level, opts = {}) => {
    if (!nodes.length) {
        return false;
    }
    if (level === 0) {
        if (slate_1.Element.isElement(node) && node.children.length > 0) {
            if (lodash_1.default.isEqual(nodes, node.children)) {
                return {};
            }
            if (opts.allowPrefixTextNode &&
                node.children.length === nodes.length + 1 &&
                slate_1.Text.isText(node.children[0]) &&
                (opts.allowPrefixTextNode === 'any' ||
                    (opts.allowPrefixTextNode === 'empty' &&
                        isEmptyTextNode(node.children[0]))) &&
                lodash_1.default.isEqual(nodes, node.children.slice(1))) {
                return {
                    withPrefixTextNode: node.children[0],
                };
            }
        }
        return false;
    }
    if (slate_1.Element.isElement(node)) {
        if (node.children.length === nodes.length && lodash_1.default.isEqual(nodes, node.children)) {
            return { levelsToMove: level };
        }
        if (opts.allowPrefixTextNode &&
            node.children.length === nodes.length + 1 &&
            slate_1.Text.isText(node.children[0]) &&
            (opts.allowPrefixTextNode === 'any' ||
                (opts.allowPrefixTextNode === 'empty' &&
                    isEmptyTextNode(node.children[0]))) &&
            lodash_1.default.isEqual(nodes, node.children.slice(1))) {
            return { levelsToMove: level, withPrefixTextNode: node.children[0] };
        }
        if (node.children.length === 1) {
            return isOnlyChildAndNodesMatch(node.children[0], nodes, level - 1, opts);
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
                    withPrefixTextNode: node.children[0],
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
                withPrefixTextNode: node.children[0],
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
const getPathBeforeOp = (path, op) => {
    if (op.type === 'insert_node') {
        if (slate_1.Path.isCommon(op.path, path)) {
            // if it's same or under the inserted path, then this path belone to the inserted node, does not exists before insert op.
            return null;
        }
        if (path.length >= op.path.length && slate_1.Path.isAfter(path, op.path) && slate_1.Path.isAncestor(slate_1.Path.parent(op.path), path)) {
            const newPath = [...path];
            newPath[op.path.length - 1]--;
            console.log('calculated path before insert_node:', path, op.path, newPath);
            return newPath;
        }
        return path;
    }
    else {
        throw new Error(`getPathBeforeOp not implemented op type ${op.type}`);
    }
};
const getPathAfterOp = (path, op) => {
    if (op.type === 'split_node') {
        if (path.length >= op.path.length && slate_1.Path.isAfter(path, op.path) && slate_1.Path.isAncestor(slate_1.Path.parent(op.path), path)) {
            const newPath = [...path];
            newPath[op.path.length - 1]++;
            console.log('calculated path after split_node:', path, op.path, newPath);
            return newPath;
        }
        if (slate_1.Path.isAncestor(op.path, path) && slate_1.Path.isAfter(path, op.path.concat(op.position))) {
            // path is in the splited part, so it's effected.
            const newPath = [...path];
            newPath[op.path.length - 1]++;
            newPath[op.path.length] -= op.position;
            console.log('calculated path after split_node:', path, op.path, newPath);
            return newPath;
        }
        return path;
    }
    else {
        throw new Error(`getPathAfterOp not implemented op type ${op.type}`);
    }
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
        let lastOp = ret[ret.length - 1];
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
        else if (ret.length > 2 &&
            ret[0].type === 'remove_node' &&
            lastOp.type === 'insert_node' &&
            ret.every((n, idx) => n.type === 'remove_node' && slate_1.Path.equals(n.path, ret[0].path) ||
                n.type === 'insert_node' && idx > 0 && (ret[idx - 1].type === 'remove_node' && slate_1.Path.equals(n.path, ret[idx - 1].path) ||
                    ret[idx - 1].type === 'insert_node' && slate_1.Path.equals(n.path, slate_1.Path.next(ret[idx - 1].path))))) {
            // XXX: This could be a quite complex mix case.
            //      It could mix split node, normally the last remove_node with the last insert_node
            //      Could also mix some move_node op, 
            const removeNodesOps = ret.filter(n => n.type === 'remove_node');
            const removedNodes = removeNodesOps.map(n => n.node);
            const lastRemoveOp = removeNodesOps[removeNodesOps.length - 1];
            const originalOps = ret;
            let ret2;
            if (slate_1.Text.isText(lastRemoveOp.node) && slate_1.Text.isText(lastOp.node) && matchTextSuffix(lastOp.node, lastRemoveOp.node.text)) {
                // consider a split in the middle of removed node?
                if (lastRemoveOp.node.text.length > lastOp.node.text.length) {
                    const adjustedLastRemoveOp = Object.assign(Object.assign({}, lastRemoveOp), { node: Object.assign(Object.assign({}, lastRemoveOp.node), { text: lastRemoveOp.node.text.slice(0, -lastOp.node.text.length) }) });
                    ret2 = ret.slice(0, -1);
                    ret2.splice(removeNodesOps.length - 1, 1, {
                        type: 'split_node',
                        properties: lodash_1.default.omit(lastOp.node, 'text'),
                        position: lastRemoveOp.node.text.length - lastOp.node.text.length,
                        path: lastRemoveOp.path,
                    }, adjustedLastRemoveOp);
                    removedNodes[removedNodes.length - 1] = adjustedLastRemoveOp.node;
                    ret = ret2;
                    lastOp = ret[ret.length - 1];
                }
            }
            //const insertNodesOps = ret.filter(n => n.type === 'insert_node') as InsertNodeOperation[]
            let suffixInsertEmptyTextNodeOp;
            if (lastOp.type === 'insert_node' && isEmptyTextNode(lastOp.node)) {
                ret.pop();
                suffixInsertEmptyTextNodeOp = lastOp;
                lastOp = ret[ret.length - 1];
            }
            let matchResult;
            if (lastOp.type === 'insert_node' &&
                slate_1.Element.isElement(lastOp.node) &&
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, removedNodes, 0, {
                    allowPrefixTextNode: 'any'
                }))) {
                // put the insert_node op at front, then move every removed node into the inserted node's children
                if (!ret2) {
                    ret2 = [...ret];
                }
                ret2.pop();
                const newNodePath = removeNodesOps[0].path;
                const newRemovePath = slate_1.Path.next(newNodePath);
                ret2.splice(0, 0, Object.assign(Object.assign({}, lastOp), { path: newNodePath, node: Object.assign(Object.assign({}, lastOp.node), { children: [] }) }));
                let insertedIdx = 0;
                ret2 = ret2.map(op => {
                    if (op.type === 'remove_node') {
                        op = {
                            type: 'move_node',
                            path: newRemovePath,
                            newPath: newNodePath.concat(insertedIdx++)
                        };
                    }
                    else if (op.type === 'split_node' && op.path) {
                        // insert_node keep its original insert position
                        op = Object.assign(Object.assign({}, op), { path: slate_1.Path.next(op.path) });
                    }
                    return op;
                });
                if (matchResult.withPrefixTextNode) {
                    if (suffixInsertEmptyTextNodeOp) {
                        // move the empty text node insert op front of the make up first child insert op to make it's easier tobe detected with next remove_text op.
                        ret2.push(suffixInsertEmptyTextNodeOp);
                        suffixInsertEmptyTextNodeOp = null;
                    }
                    ret2.push({
                        type: 'insert_node',
                        path: lastOp.path.concat(0),
                        node: matchResult.withPrefixTextNode
                    });
                }
                ret = ret2;
            }
            if (suffixInsertEmptyTextNodeOp) {
                ret.push(suffixInsertEmptyTextNodeOp);
            }
            console.log('re-construct remove/insert node into:', originalOps, ret2, removedNodes);
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
                (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, 1)) &&
                isNodeEndAtPoint(dummyEditor, op.path, op) &&
                !slate_1.Path.isCommon(lastOp.path, op.path) // make sure it's not in the just inserted node.
            ) {
                if (levelsToMove === true) {
                    const splitOp = {
                        type: 'split_node',
                        properties: lodash_1.default.omit(lastOp.node.children[0], 'text'),
                        position: op.offset,
                        path: op.path,
                    };
                    // keep the container node insert op.
                    lastOps[lastOps.length - 1] = Object.assign(Object.assign({}, lastOp), { node: Object.assign(Object.assign({}, lastOp.node), { children: [] }) });
                    // now we move the splited node into the children of the container
                    const moveOp = {
                        type: 'move_node',
                        path: slate_1.Path.next(splitOp.path),
                        newPath: getPathAfterOp(lastOp.path.concat(0), splitOp)
                    };
                    ret.splice(0, 1, splitOp, moveOp);
                }
                else {
                    popLastOp(ops);
                    const splitOp = {
                        type: 'split_node',
                        properties: lodash_1.default.omit(lastOp.node, 'text'),
                        position: op.offset,
                        path: getPathBeforeOp(op.path, lastOp),
                    };
                    // now we move the splited node into the lastOp.path position
                    // consider the move target path, which may be effected by the split
                    const moveOp = {
                        type: 'move_node',
                        path: slate_1.Path.next(splitOp.path),
                        newPath: getPathAfterOp(lastOp.path, splitOp)
                    };
                    ret.splice(0, 1, splitOp, moveOp);
                }
                console.log('split & move detected from:', lastOp, op, ret);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                lastOps.length === 2 &&
                lastOps[0].type === 'insert_node' &&
                slate_1.Path.equals(slate_1.Path.next(op.path), lastOps[0].path) &&
                slate_1.Path.equals(slate_1.Path.next(lastOps[0].path), lastOp.path) &&
                (matchTextSuffix(lastOp.node, op.text) || isEmptyTextNode(lastOp.node)) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                ops.pop();
                const ret2 = [];
                let doubleSplit = false;
                if (slate_1.Text.isText(lastOp.node) && op.text.length >= lastOp.node.text.length) {
                    // remove text which normally came from delete selection
                    const textToRemove = lastOp.node.text.length > 0 ? op.text.slice(0, -lastOp.node.text.length) : op.text;
                    // either true which is a direct only text child of an element, or 1 if it's directly a text node.
                    levelsToMove = isOnlyChildAndTextMatch(lastOps[0].node, textToRemove, 1);
                    if (levelsToMove) {
                        // that remove_text and this insert_node is indeed the other split_node
                        if (lastOp.node.text.length > 0) {
                            ret2.push({
                                type: 'split_node',
                                properties: lodash_1.default.omit(lastOp.node, 'text'),
                                position: op.offset + textToRemove.length,
                                path: op.path,
                            });
                        }
                        else {
                            // suffix empty text node case, no split, just keep the insert empty text node op.
                        }
                        doubleSplit = true;
                    }
                    else {
                        ret2.push(Object.assign(Object.assign({}, op), { text: textToRemove }));
                    }
                }
                if (doubleSplit && levelsToMove === true) {
                    // lastOps[0].node is some inline element,
                    ret2.push({
                        type: 'split_node',
                        properties: lodash_1.default.omit(lastOps[0].node.children[0], 'text'),
                        position: op.offset,
                        path: op.path,
                    });
                    ret2.push(Object.assign(Object.assign({}, lastOps[0]), { node: Object.assign(Object.assign({}, lastOps[0].node), { children: [] }) }));
                    ret2.push({
                        type: 'move_node',
                        path: lastOp.path,
                        newPath: lastOps[0].path.concat(0),
                    });
                    if (!lastOp.node.text.length) {
                        ret2.push(lastOp);
                    }
                }
                else {
                    // lastOps[0].node is pure text or some inline void item not related to text.
                    ret2.push({
                        type: 'split_node',
                        properties: lodash_1.default.omit(doubleSplit ? lastOps[0].node : lastOp.node, 'text'),
                        position: op.offset,
                        path: op.path,
                    });
                }
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
                matchTextSuffix(lastOp.node, op.text) &&
                (levelsToMove = isOnlyChildAndTextMatch(lastOps[0].node, op.text.slice(0, -lastOp.node.text.length), 1)) &&
                isNodeEndAtPoint(dummyEditor, op.path, {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                ops.pop();
                if (levelsToMove === true) {
                    // lastOps[0].node is some inline element with only text node as child.
                    const textNode = lastOps[0].node.children[0];
                    ret.splice(0, 1, {
                        type: 'move_node',
                        path: lastOp.path.concat(0),
                        newPath: lastOp.path,
                    }, {
                        type: 'merge_node',
                        properties: lodash_1.default.omit(textNode, 'text'),
                        position: op.offset,
                        path: lastOp.path,
                    }, Object.assign(Object.assign({}, lastOps[0]), { node: Object.assign(Object.assign({}, lastOps[0].node), { children: [] }) }), {
                        type: 'merge_node',
                        properties: lodash_1.default.omit(lastOp.node, 'text'),
                        position: op.offset + textNode.text.length,
                        path: lastOp.path,
                    });
                }
                else {
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
                }
                console.log('(un)mark & merge node detected from:', lastOps, op, ret);
            }
            else if (lastOp.type === 'set_node' &&
                lastOps.length === 1 &&
                op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                slate_1.Path.equals(op.path, lastOp.path) &&
                slate_1.Path.equals(slate_1.Path.next(op.path), beforeLastOp.path) &&
                isOnlyChildAndTextMatch(beforeLastOp.node, op.text) &&
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
                isOnlyChildAndTextMatch(beforeLastOp.node, op.text) &&
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
                }, []), op.path.length - lastOp.path.length - 1, {
                    allowPrefixTextNode: 'empty',
                })) &&
                (isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), slate_1.Path.previous(op.path)) ||
                    ret.length > nodesLength &&
                        isInsertEmptyTextNodeOpWithPath(ret[nodesLength], op.path) &&
                        isNodeEndAtPath(dummyEditor, slate_1.Path.previous(lastOp.path), op.path))) {
                popLastOp(ops);
                const os = ret.splice(0, nodesLength);
                let newLastOp = lastOp;
                if (matchResult.withPrefixTextNode) {
                    // we need finally add the empty text node.
                    ret.splice(0, 0, {
                        type: 'insert_node',
                        path: lastOp.path.concat(Array(op.path.length - lastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
                        node: matchResult.withPrefixTextNode,
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
                if (matchResult.withPrefixTextNode) {
                    // we need finally add the empty text node.
                    ret2.splice(0, 0, {
                        type: 'insert_node',
                        path: beforeLastOp.path.concat(Array(lastOp.path.length - beforeLastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
                        node: matchResult.withPrefixTextNode,
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
                    node = node.children[matchResult.withPrefixTextNode && path.length === lastOp.path.length ? 1 : 0];
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
                }, []), op.path.length - lastOp.path.length - 1, {
                    allowPrefixTextNode: 'empty',
                })) &&
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
                if (matchResult.withPrefixTextNode) {
                    // we need remove the first empty text node before do the merge_node
                    ret2.push({
                        type: 'remove_node',
                        path: newLastOp.path.concat(Array(op.path.length - newLastOp.path.length).fill(0)),
                        node: matchResult.withPrefixTextNode,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQXVKO0FBQ3ZKLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsOERBQXNDO0FBQ3RDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUU7UUFDckMsT0FBTyxZQUFZLENBQUE7S0FDcEI7SUFDRCxJQUFJLGVBQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDakMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRSxJQUFJLElBQUksRUFBRTtnQkFDUixZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNuQixPQUFPLElBQUksQ0FBQTthQUNaO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUMsRUFBRTtZQUNGLE9BQU8sWUFBWSxDQUFBO1NBQ3BCO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNiLENBQUMsQ0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBa0IsRUFBb0IsRUFBRTtJQUN6RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDakIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7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