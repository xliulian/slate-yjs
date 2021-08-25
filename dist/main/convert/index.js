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
    else if (op.type === 'remove_node') {
        if (path.length >= op.path.length && (slate_1.Path.isCommon(op.path, path) || slate_1.Path.isAfter(path, op.path) && slate_1.Path.isAncestor(slate_1.Path.parent(op.path), path))) {
            const newPath = [...path];
            newPath[op.path.length - 1]++;
            console.log('calculated path before remove_node:', path, op.path, newPath);
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
    else if (op.type === 'insert_node') {
        if (path.length >= op.path.length && (slate_1.Path.isCommon(op.path, path) || slate_1.Path.isAfter(path, op.path) && slate_1.Path.isAncestor(slate_1.Path.parent(op.path), path))) {
            const newPath = [...path];
            newPath[op.path.length - 1]++;
            console.log('calculated path after insert_node:', path, op.path, newPath);
            return newPath;
        }
        return path;
    }
    else {
        throw new Error(`getPathAfterOp not implemented op type ${op.type}`);
    }
};
const fixMoveOpNewPath = (op) => {
    if (op.path.length === op.newPath.length && slate_1.Path.endsBefore(op.path, op.newPath)) {
        const newPath = op.newPath.slice(0, -1).concat(op.newPath[op.newPath.length - 1] - 1);
        console.log('fixMoveOpNewPath', op.path, op.newPath, newPath);
        return Object.assign(Object.assign({}, op), { newPath });
    }
    return op;
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
            if (relativePath) { // implicit relativePath.length > 0 so newPath need no fix (not same level as path)
                if (relativePath.length === 0) {
                    console.log('skip dummy operations2:', ret);
                    return ops;
                }
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
        else if (ret.length === 2 &&
            ret[0].type === 'remove_node' &&
            ret[1].type === 'insert_node' &&
            lodash_1.default.isEqual(ret[0].node, ret[1].node)) {
            // XXX: remove node somewhere, then insert somewhere, need pathfix.
            const insertPathBeforeRemoveOp = getPathBeforeOp(ret[1].path, ret[0]);
            const op = fixMoveOpNewPath({
                type: 'move_node',
                path: ret[0].path,
                newPath: insertPathBeforeRemoveOp,
            });
            console.log('move_node restored op:', ret, op);
            ops.push([op]);
            return ops;
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
                            newPath: newNodePath.concat(insertedIdx++) // not same level, no fix required.
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
                    const moveOp = fixMoveOpNewPath({
                        type: 'move_node',
                        path: slate_1.Path.next(splitOp.path),
                        newPath: getPathAfterOp(lastOp.path.concat(0), splitOp)
                    });
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
                    const moveOp = fixMoveOpNewPath({
                        type: 'move_node',
                        path: slate_1.Path.next(splitOp.path),
                        newPath: getPathAfterOp(lastOp.path, splitOp)
                    });
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
                        newPath: lastOps[0].path.concat(0), // not same level, no fix required.
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
                        newPath: lastOp.path, // not same level, no fix required
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
                        newPath: lastOp.path, // not same level, no fix required
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
                slate_1.Path.hasPrevious(op.path) &&
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
                        newPath: lastOp.path, // not same level, no fix reqiured
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
                        newPath: beforeLastOp.path, // not same level, no fix required
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
                        newPath, // not same level, no fix required.
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
                        newPath, // not same level, no fix required.
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
                        newPath, // not same level, no fix required
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
                    //let insertPath = [...op.path]
                    //if (Path.isCommon(lastOp.path, op.path)) {
                    // insert path should change since we do not remove first, how would the remove op path change the insert path?
                    //  insertPath[lastOp.path.length - 1] += 1
                    //}
                    const insertPathBeforeRemoveOp = getPathBeforeOp(op.path, lastOp);
                    if (relativePath.length) {
                        // XXX: first empty the insert_node children, keep the op
                        const parentNode = slate_1.Node.get(op.node, slate_1.Path.parent(relativePath));
                        parentNode.children.splice(relativePath[relativePath.length - 1], 1);
                        // Now the inserted node is at correct position, then we move the original deleted node
                        const adjustedInsertOp = Object.assign(Object.assign({}, op), { path: insertPathBeforeRemoveOp });
                        const removePathAfterInsertOp = getPathAfterOp(lastOp.path, adjustedInsertOp);
                        ret.splice(0, 1, adjustedInsertOp, fixMoveOpNewPath({
                            type: 'move_node',
                            path: removePathAfterInsertOp,
                            newPath: insertPathBeforeRemoveOp.concat(relativePath),
                        }));
                    }
                    else {
                        // no need to insert node, it's a pure move op.
                        ret.splice(0, 1, fixMoveOpNewPath({
                            type: 'move_node',
                            path: lastOp.path,
                            newPath: insertPathBeforeRemoveOp.concat(relativePath),
                        }));
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
                    //let removePath = [...op.path]
                    //if (Path.isCommon(lastOp.path, op.path)) {
                    // insert path should change since we do not remove first, how would the remove op path change the insert path?
                    //  removePath[lastOp.path.length - 1] -= 1
                    //}
                    const removePathBeforeInsertOp = getPathBeforeOp(op.path, lastOp);
                    if (!removePathBeforeInsertOp) {
                        // inserted node is under removed node, so we do not handle this.
                    }
                    else {
                        popLastOp(ops);
                        ret.splice(0, 0, fixMoveOpNewPath({
                            type: 'move_node',
                            path: removePathBeforeInsertOp.concat(relativePath),
                            newPath: lastOp.path,
                        }));
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