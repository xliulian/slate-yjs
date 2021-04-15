import { Path, Node, Element, Text } from 'slate';
import * as Y from 'yjs';
import _ from 'lodash';
import arrayEvent from './arrayEvent';
import mapEvent from './mapEvent';
import textEvent from './textEvent';
const findNodeRelativePath = (parentNode, nodeToFind, relativePath = []) => {
    if (_.isEqual(parentNode, nodeToFind)) {
        return relativePath;
    }
    if (Element.isElement(parentNode)) {
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
    return text.length > 0 && Text.isText(node) && node.text.length > 0 && text.length >= node.text.length && text.slice(-node.text.length) === node.text;
};
// return a number mean the text node need be moved down the number of levels.
const isOnlyChildAndTextMatch = (node, text, level = 0) => {
    if (level === 0 || Text.isText(node)) {
        if (Text.isText(node) && node.text === text && text.length > 0) {
            return level === 0 ? true : level;
        }
        return false;
    }
    if (Element.isElement(node) && node.children.length === 1) {
        return isOnlyChildAndTextMatch(node.children[0], text, level - 1);
    }
    return false;
};
const isOnlyChildAndNodesMatch = (node, nodes, level, opts = {}) => {
    if (!nodes.length) {
        return false;
    }
    if (level === 0) {
        if (Element.isElement(node) && node.children.length > 0) {
            if (_.isEqual(nodes, node.children)) {
                return {};
            }
            if (opts.allowPrefixTextNode &&
                node.children.length === nodes.length + 1 &&
                Text.isText(node.children[0]) &&
                (opts.allowPrefixTextNode === 'any' ||
                    (opts.allowPrefixTextNode === 'empty' &&
                        isEmptyTextNode(node.children[0]))) &&
                _.isEqual(nodes, node.children.slice(1))) {
                return {
                    withPrefixTextNode: node.children[0],
                };
            }
        }
        return false;
    }
    if (Element.isElement(node)) {
        if (node.children.length === nodes.length && _.isEqual(nodes, node.children)) {
            return { levelsToMove: level };
        }
        if (opts.allowPrefixTextNode &&
            node.children.length === nodes.length + 1 &&
            Text.isText(node.children[0]) &&
            (opts.allowPrefixTextNode === 'any' ||
                (opts.allowPrefixTextNode === 'empty' &&
                    isEmptyTextNode(node.children[0]))) &&
            _.isEqual(nodes, node.children.slice(1))) {
            return { levelsToMove: level, withPrefixTextNode: node.children[0] };
        }
        if (node.children.length === 1) {
            return isOnlyChildAndNodesMatch(node.children[0], nodes, level - 1, opts);
        }
    }
    return false;
};
const matchTextNode = (node, text, matchInlineText) => {
    if (!matchInlineText && Text.isText(node) && node.text === text) {
        return true;
    }
    if (matchInlineText && matchInlineText(node) && Element.isElement(node) && node.children.length === 1 && matchTextNode(node.children[0], text)) {
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
        if (Element.isElement(node)) {
            if (node.children.length === nodes.length + 1 && _.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
                return {};
            }
            if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
                return {
                    withPrefixTextNode: node.children[0],
                };
            }
        }
        return false;
    }
    if (Element.isElement(node)) {
        if (node.children.length === nodes.length + 1 && _.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
            return { levelsToMove: level };
        }
        if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
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
    return Text.isText(node) && node.text.length === 0;
};
const isInsertEmptyTextNodeOpWithPath = (op, path) => {
    return op && op.type === 'insert_node' && isEmptyTextNode(op.node) && Path.equals(path, op.path);
};
const isRemoveEmptyTextNodeOpWithPath = (op, path) => {
    return op && op.type === 'remove_node' && isEmptyTextNode(op.node) && Path.equals(path, op.path);
};
const isNodeEndAtPath = (node, path, targetPath) => {
    const [, lastPath] = Node.last(node, path);
    return targetPath.length >= path.length && Path.isCommon(targetPath, lastPath);
};
const isNodeEndAtPoint = (node, path, point) => {
    const [, lastPath] = Node.last(node, path);
    if (!Path.equals(lastPath, point.path)) {
        return false;
    }
    const leaf = Node.get(node, lastPath);
    if (!Text.isText(leaf)) {
        return false;
    }
    return leaf.text.length === point.offset;
};
const getPathBeforeOp = (path, op) => {
    if (op.type === 'insert_node') {
        if (Path.isCommon(op.path, path)) {
            // if it's same or under the inserted path, then this path belone to the inserted node, does not exists before insert op.
            return null;
        }
        if (path.length >= op.path.length && Path.isAfter(path, op.path) && Path.isAncestor(Path.parent(op.path), path)) {
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
        if (path.length >= op.path.length && Path.isAfter(path, op.path) && Path.isAncestor(Path.parent(op.path), path)) {
            const newPath = [...path];
            newPath[op.path.length - 1]++;
            console.log('calculated path after split_node:', path, op.path, newPath);
            return newPath;
        }
        if (Path.isAncestor(op.path, path) && Path.isAfter(path, op.path.concat(op.position))) {
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
export function toSlateOp(event, ops, doc, editor) {
    let ret;
    if (event instanceof Y.YArrayEvent) {
        ret = arrayEvent(event, doc);
        let lastOp = ret[ret.length - 1];
        if (ret.length === 2 &&
            ret[0].type === 'remove_node' &&
            ret[1].type === 'insert_node' &&
            Path.equals(ret[0].path, ret[1].path)) {
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
                const parentNode = Node.get(deeperNode, Path.parent(relativePath));
                parentNode.children.splice(relativePath[relativePath.length - 1], 1);
                if (firstIsDeeper) {
                    ret = [
                        {
                            type: 'move_node',
                            path: ret[0].path.concat(relativePath),
                            newPath: Path.next(ret[0].path),
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
                    ret[1].path = Path.next(ret[1].path);
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
            ret.every((n, idx) => n.type === 'remove_node' && Path.equals(n.path, ret[0].path) ||
                n.type === 'insert_node' && idx > 0 && (ret[idx - 1].type === 'remove_node' && Path.equals(n.path, ret[idx - 1].path) ||
                    ret[idx - 1].type === 'insert_node' && Path.equals(n.path, Path.next(ret[idx - 1].path))))) {
            // XXX: This could be a quite complex mix case.
            //      It could mix split node, normally the last remove_node with the last insert_node
            //      Could also mix some move_node op, 
            const removeNodesOps = ret.filter(n => n.type === 'remove_node');
            const removedNodes = removeNodesOps.map(n => n.node);
            const lastRemoveOp = removeNodesOps[removeNodesOps.length - 1];
            const originalOps = ret;
            let ret2;
            if (Text.isText(lastRemoveOp.node) && Text.isText(lastOp.node) && matchTextSuffix(lastOp.node, lastRemoveOp.node.text)) {
                // consider a split in the middle of removed node?
                if (lastRemoveOp.node.text.length > lastOp.node.text.length) {
                    const adjustedLastRemoveOp = Object.assign(Object.assign({}, lastRemoveOp), { node: Object.assign(Object.assign({}, lastRemoveOp.node), { text: lastRemoveOp.node.text.slice(0, -lastOp.node.text.length) }) });
                    ret2 = ret.slice(0, -1);
                    ret2.splice(removeNodesOps.length - 1, 1, {
                        type: 'split_node',
                        properties: _.omit(lastOp.node, 'text'),
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
                Element.isElement(lastOp.node) &&
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, removedNodes, 0, {
                    allowPrefixTextNode: 'any'
                }))) {
                // put the insert_node op at front, then move every removed node into the inserted node's children
                if (!ret2) {
                    ret2 = [...ret];
                }
                ret2.pop();
                const newNodePath = removeNodesOps[0].path;
                const newRemovePath = Path.next(newNodePath);
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
                        op = Object.assign(Object.assign({}, op), { path: Path.next(op.path) });
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
        ret = mapEvent(event, doc);
    }
    else if (event instanceof Y.YTextEvent) {
        ret = textEvent(event, doc);
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
                !Path.isCommon(lastOp.path, op.path) // make sure it's not in the just inserted node.
            ) {
                if (levelsToMove === true) {
                    const splitOp = {
                        type: 'split_node',
                        properties: _.omit(lastOp.node.children[0], 'text'),
                        position: op.offset,
                        path: op.path,
                    };
                    // keep the container node insert op.
                    lastOps[lastOps.length - 1] = Object.assign(Object.assign({}, lastOp), { node: Object.assign(Object.assign({}, lastOp.node), { children: [] }) });
                    // now we move the splited node into the children of the container
                    const moveOp = {
                        type: 'move_node',
                        path: Path.next(splitOp.path),
                        newPath: getPathAfterOp(lastOp.path.concat(0), splitOp)
                    };
                    ret.splice(0, 1, splitOp, moveOp);
                }
                else {
                    popLastOp(ops);
                    const splitOp = {
                        type: 'split_node',
                        properties: _.omit(lastOp.node, 'text'),
                        position: op.offset,
                        path: getPathBeforeOp(op.path, lastOp),
                    };
                    // now we move the splited node into the lastOp.path position
                    // consider the move target path, which may be effected by the split
                    const moveOp = {
                        type: 'move_node',
                        path: Path.next(splitOp.path),
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
                Path.equals(Path.next(op.path), lastOps[0].path) &&
                Path.equals(Path.next(lastOps[0].path), lastOp.path) &&
                (matchTextSuffix(lastOp.node, op.text) || isEmptyTextNode(lastOp.node)) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                ops.pop();
                const ret2 = [];
                let doubleSplit = false;
                if (Text.isText(lastOp.node) && op.text.length >= lastOp.node.text.length) {
                    // remove text which normally came from delete selection
                    const textToRemove = lastOp.node.text.length > 0 ? op.text.slice(0, -lastOp.node.text.length) : op.text;
                    // either true which is a direct only text child of an element, or 1 if it's directly a text node.
                    levelsToMove = isOnlyChildAndTextMatch(lastOps[0].node, textToRemove, 1);
                    if (levelsToMove) {
                        // that remove_text and this insert_node is indeed the other split_node
                        if (lastOp.node.text.length > 0) {
                            ret2.push({
                                type: 'split_node',
                                properties: _.omit(lastOp.node, 'text'),
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
                        properties: _.omit(lastOps[0].node.children[0], 'text'),
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
                        properties: _.omit(doubleSplit ? lastOps[0].node : lastOp.node, 'text'),
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
                Path.equals(Path.next(op.path), lastOp.path) &&
                Path.equals(lastOps[0].path, lastOp.path) &&
                Text.isText(lastOp.node) &&
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
                        properties: _.omit(textNode, 'text'),
                        position: op.offset,
                        path: lastOp.path,
                    }, Object.assign(Object.assign({}, lastOps[0]), { node: Object.assign(Object.assign({}, lastOps[0].node), { children: [] }) }), {
                        type: 'merge_node',
                        properties: _.omit(lastOp.node, 'text'),
                        position: op.offset + textNode.text.length,
                        path: lastOp.path,
                    });
                }
                else {
                    ret.splice(0, 1, {
                        type: 'merge_node',
                        properties: _.omit(lastOps[0].node, 'text'),
                        position: op.offset,
                        path: lastOp.path,
                    }, {
                        type: 'merge_node',
                        properties: _.omit(lastOp.node, 'text'),
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
                Path.equals(op.path, lastOp.path) &&
                Path.equals(Path.next(op.path), beforeLastOp.path) &&
                isOnlyChildAndTextMatch(beforeLastOp.node, op.text) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                // three ops, the first and the last one is for split.
                ops.pop();
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: _.omit(beforeLastOp.node, 'text'),
                    position: op.offset,
                    path: op.path,
                }, lastOp);
                console.log('split & mark detected from:', beforeLastOp, lastOp, op, ret);
            }
            else if (lastOp.type === 'set_node' &&
                lastOps.length === 1 &&
                op.type === 'insert_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'remove_node' &&
                Path.equals(op.path, lastOp.path) &&
                Path.equals(Path.next(op.path), beforeLastOp.path) &&
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
                    properties: _.omit(beforeLastOp.node, 'text'),
                    position: op.offset,
                    path: beforeLastOp.path,
                });
                console.log('(un)mark & merge detected from:', beforeLastOp, lastOp, op, ret);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                Path.hasPrevious(lastOp.path) &&
                Path.isCommon(Path.previous(lastOp.path), op.path) &&
                (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
                isNodeEndAtPoint(dummyEditor, Path.previous(lastOp.path), op)) {
                popLastOp(ops);
                let newLastOp = lastOp;
                ret.splice(0, 1);
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = Path.next(op.path.slice(0, lastOp.path.length + levelsToMove));
                    ret.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: lastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                let path = Path.previous(newLastOp.path);
                let node = newLastOp.node;
                while (path.length < op.path.length) {
                    ret.splice(0, 0, {
                        type: 'split_node',
                        properties: _.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path,
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret.splice(0, 0, {
                    type: 'split_node',
                    properties: _.omit(node, 'text'),
                    position: op.offset,
                    path: op.path,
                });
                console.log('split_node2 detected from:', lastOp, op, ret);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_node' &&
                Path.hasPrevious(lastOp.path) &&
                Path.isAncestor(Path.previous(lastOp.path), op.path) &&
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    if (o.type === 'remove_node' &&
                        idx === nodes.length &&
                        Path.equals(o.path, op.path)) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1, {
                    allowPrefixTextNode: 'empty',
                })) &&
                (isNodeEndAtPath(dummyEditor, Path.previous(lastOp.path), Path.previous(op.path)) ||
                    ret.length > nodesLength &&
                        isInsertEmptyTextNodeOpWithPath(ret[nodesLength], op.path) &&
                        isNodeEndAtPath(dummyEditor, Path.previous(lastOp.path), op.path))) {
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
                    const newPath = Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove));
                    ret.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: lastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                let path = Path.previous(newLastOp.path);
                const splitPath = Path.previous(op.path); // indeed the end path after split.
                let node = lastOp.node;
                while (path.length < op.path.length) {
                    ret.splice(0, 0, {
                        type: 'split_node',
                        properties: _.omit(node, 'children'),
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
                (Path.equals(Path.next(op.path), lastOp.path) || Path.equals(Path.next(Path.parent(op.path)), lastOp.path)) && // later case require inline text match
                Path.hasPrevious(beforeLastOp.path) &&
                Path.isAncestor(Path.previous(beforeLastOp.path), op.path) &&
                lastOps.every((o, idx) => idx === lastOps.length - 1 || o.type === 'remove_node' && Path.equals(o.path, lastOp.path)) &&
                (matchResult = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.filter(o => o.type === 'remove_node').map(o => o.type === 'remove_node' && o.node), lastOp.path.length - beforeLastOp.path.length - 1, {
                    allowPrefixEmptyTextNode: true,
                    matchInlineText: op.path.length - lastOp.path.length === 1 ? (n) => Element.isElement(n) && editor.isInline(n) && !editor.isVoid(n) : undefined,
                })) &&
                (lastOp.type === 'insert_node' && isNodeEndAtPath(dummyEditor, Path.previous(beforeLastOp.path), lastOp.path) ||
                    lastOp.type !== 'insert_node' && isNodeEndAtPoint(dummyEditor, Path.previous(beforeLastOp.path), op))) {
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
                    const newPath = Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove));
                    ret2.splice(0, 0, {
                        type: 'move_node',
                        path: newPath,
                        newPath: beforeLastOp.path,
                    });
                    // consider node was removed from the newPath.
                    newBeforeLastOp = Object.assign(Object.assign({}, beforeLastOp), { path: newPath });
                }
                let path = Path.previous(newBeforeLastOp.path);
                let node = newBeforeLastOp.node;
                while (path.length < op.path.length) {
                    ret2.splice(0, 0, {
                        type: 'split_node',
                        properties: _.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path,
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[matchResult.withPrefixTextNode && path.length === lastOp.path.length ? 1 : 0];
                }
                ret2.splice(0, 0, {
                    type: 'split_node',
                    properties: _.omit(node, 'text'),
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
                Path.hasPrevious(lastOp.path) &&
                Path.isCommon(Path.previous(lastOp.path), op.path) &&
                (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
                isNodeEndAtPoint(dummyEditor, Path.previous(lastOp.path), {
                    path: op.path,
                    offset: op.offset + op.text.length
                })) {
                popLastOp(ops);
                let newLastOp = lastOp;
                const ret2 = [];
                if (levelsToMove !== true) {
                    // XXX: need first a move down N levels op.
                    const newPath = Path.next(op.path.slice(0, lastOp.path.length + levelsToMove));
                    ret2.push({
                        type: 'move_node',
                        path: lastOp.path,
                        newPath,
                    });
                    // consider node was removed from the newPath.
                    newLastOp = Object.assign(Object.assign({}, lastOp), { path: newPath });
                }
                let path = Path.previous(newLastOp.path);
                let node = newLastOp.node;
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: _.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path: Path.next(path)
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret2.push({
                    type: 'merge_node',
                    properties: _.omit(node, 'text'),
                    position: op.offset,
                    path: Path.next(op.path),
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
                Path.hasPrevious(op.path) &&
                Path.hasPrevious(lastOp.path) &&
                Path.isAncestor(Path.previous(lastOp.path), op.path) &&
                (matchResult = isOnlyChildAndNodesMatch(lastOp.node, ret.reduce((nodes, o, idx) => {
                    const isFirstOpRemoveEmptyTextNode = ret[1] && ret[1].type === 'insert_node' && isRemoveEmptyTextNodeOpWithPath(ret[0], ret[1].path);
                    const firstInsertOpIdx = (isFirstOpRemoveEmptyTextNode ? 1 : 0);
                    if (o.type === 'insert_node' &&
                        idx === nodes.length + firstInsertOpIdx &&
                        (idx === firstInsertOpIdx ||
                            Path.equals(o.path, Path.next(ret[idx - 1].path)))) {
                        nodes.push(o.node);
                        nodesLength = nodes.length;
                    }
                    return nodes;
                }, []), op.path.length - lastOp.path.length - 1, {
                    allowPrefixTextNode: 'empty',
                })) &&
                isNodeEndAtPath(dummyEditor, Path.previous(lastOp.path), Path.parent(op.path).concat(op.path[op.path.length - 1] + nodesLength - 1))) {
                popLastOp(ops);
                let newLastOp = lastOp;
                const ret2 = [];
                if (matchResult.levelsToMove) {
                    // XXX: need first a move down N levels op.
                    const newPath = Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove));
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
                let path = Path.previous(newLastOp.path);
                const splitPath = Path.previous(op.path); // indeed the end path after split.
                let node = newLastOp.node;
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: _.omit(node, 'children'),
                        position: splitPath[path.length] + 1,
                        path: Path.next(path),
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
                Path.hasPrevious(beforeLastOp.path) &&
                Path.isAncestor(Path.previous(beforeLastOp.path), op.path) &&
                lastOps.every((o, idx) => o.type === 'insert_node' &&
                    (idx === 0 ||
                        Path.equals(o.path, Path.next(lastOps[idx - 1].path)))) &&
                Path.equals(Path.next(op.path), firstOfLastOps.path) &&
                (matchResult = isOnlyChildWithTextAndNodesMatch(beforeLastOp.node, op.text, lastOps.map((o) => o.type === 'insert_node' && o.node), op.path.length - beforeLastOp.path.length - 1)) &&
                isNodeEndAtPath(dummyEditor, Path.previous(beforeLastOp.path), lastOp.path) &&
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
                    const newPath = Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove));
                    ret2.push({
                        type: 'move_node',
                        path: beforeLastOp.path,
                        newPath,
                    });
                    // consider node was removed from the newPath.
                    newBeforeLastOp = Object.assign(Object.assign({}, beforeLastOp), { path: newPath });
                }
                let path = Path.previous(newBeforeLastOp.path);
                let node = newBeforeLastOp.node;
                while (path.length < op.path.length) {
                    ret2.push({
                        type: 'merge_node',
                        properties: _.omit(node, 'children'),
                        position: op.path[path.length] + 1,
                        path: Path.next(path)
                    });
                    path = path.concat(op.path[path.length]);
                    node = node.children[0];
                }
                ret2.push({
                    type: 'merge_node',
                    properties: _.omit(node, 'text'),
                    position: op.offset,
                    path: Path.next(op.path),
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
                Element.isElement(lastOp.node) //&& // element more than text.
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
                    if (Path.isCommon(lastOp.path, op.path)) {
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
                        const parentNode = Node.get(op.node, Path.parent(relativePath));
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
                Element.isElement(op.node) //&& // element more than text.
            //JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0
            ) {
                const relativePath = findNodeRelativePath(op.node, lastOp.node);
                if (relativePath) {
                    // XXX: first move part of the node somewhere, then remove node.
                    let removePath = [...op.path];
                    if (Path.isCommon(lastOp.path, op.path)) {
                        // insert path should change since we do not remove first, how would the remove op path change the insert path?
                        removePath[lastOp.path.length - 1] -= 1;
                    }
                    if (Path.isAncestor(removePath, lastOp.path)) {
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
                            const parentNode = Node.get(op.node, Path.parent(relativePath));
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
/**
 * Converts yjs events into slate operations.
 *
 * @param events
 */
export function toSlateOps(events, editor) {
    const tempDoc = JSON.parse(JSON.stringify(editor.children));
    const iterate = (ops, event) => {
        return toSlateOp(event, ops, tempDoc, editor);
    };
    const ops = events.reduce(iterate, []);
    return ops.flatMap(op => op).filter(op => op);
    //return events.flatMap(event => toSlateOp(event, doc));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWdHLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBUyxNQUFNLE9BQU8sQ0FBQztBQUN2SixPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUN6QixPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxVQUFVLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sUUFBUSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLFNBQVMsTUFBTSxhQUFhLENBQUM7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRTtRQUNyQyxPQUFPLFlBQVksQ0FBQTtLQUNwQjtJQUNELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNqQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzFFLElBQUksSUFBSSxFQUFFO2dCQUNSLFlBQVksR0FBRyxJQUFJLENBQUE7Z0JBQ25CLE9BQU8sSUFBSSxDQUFBO2FBQ1o7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUMsQ0FBQyxFQUFFO1lBQ0YsT0FBTyxZQUFZLENBQUE7U0FDcEI7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQyxDQUFBO0FBRUQsTUFBTSxT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