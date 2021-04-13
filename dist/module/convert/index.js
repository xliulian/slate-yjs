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
                    lastOp = ret2[ret2.length - 1];
                    ret = ret2;
                }
            }
            //const insertNodesOps = ret.filter(n => n.type === 'insert_node') as InsertNodeOperation[]
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
                    ret2.push({
                        type: 'insert_node',
                        path: lastOp.path.concat(0),
                        node: matchResult.withPrefixTextNode
                    });
                }
                ret = ret2;
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
            /*if (
              lastOp.type === 'insert_node' &&
              op.type === 'remove_text' &&
              isOnlyChildAndTextMatch(lastOp.node, op.text) &&
              isNodeEndAtPoint(dummyEditor, op.path, op)
            ) {
              popLastOp(ops)
      
              ret.splice(0, 1, {
                type: 'split_node',
                properties: _.omit(lastOp.node, 'text'),
                position: op.offset,
                path: op.path,
              })
              // consider the move target path, which may be effected by the split
              const newPath = lastOp.path
              {
                type: 'move_node',
                path: Path.next(op.path),
                newPath:
              }
      
              console.log('split & move detected from:', lastOp, op, ret);
            } else*/ if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                lastOps.length === 2 &&
                lastOps[0].type === 'insert_node' &&
                Path.equals(Path.next(op.path), lastOps[0].path) &&
                Path.equals(Path.next(lastOps[0].path), lastOp.path) &&
                matchTextSuffix(lastOp.node, op.text) &&
                isNodeEndAtPoint(dummyEditor, op.path, op)) {
                ops.pop();
                const ret2 = [];
                let doubleSplit = false;
                if (Text.isText(lastOp.node) && op.text.length > lastOp.node.text.length) {
                    // remove text which normally came from delete selection
                    const textToRemove = op.text.slice(0, -lastOp.node.text.length);
                    // either true which is a direct only text child of an element, or 1 if it's directly a text node.
                    levelsToMove = isOnlyChildAndTextMatch(lastOps[0].node, textToRemove, 1);
                    if (levelsToMove) {
                        // that remove_text and this insert_node is indeed the other split_node
                        ret2.push({
                            type: 'split_node',
                            properties: _.omit(lastOp.node, 'text'),
                            position: op.offset + textToRemove.length,
                            path: op.path,
                        });
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
                        newPath: lastOps[0].path.concat(1),
                    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWtGLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBUyxNQUFNLE9BQU8sQ0FBQztBQUN6SSxPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUN6QixPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxVQUFVLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sUUFBUSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLFNBQVMsTUFBTSxhQUFhLENBQUM7QUFFcEMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFVBQWdCLEVBQUUsVUFBZ0IsRUFBRSxlQUFxQixFQUFFLEVBQWdCLEVBQUU7SUFDekcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRTtRQUNyQyxPQUFPLFlBQVksQ0FBQTtLQUNwQjtJQUNELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNqQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzFFLElBQUksSUFBSSxFQUFFO2dCQUNSLFlBQVksR0FBRyxJQUFJLENBQUE7Z0JBQ25CLE9BQU8sSUFBSSxDQUFBO2FBQ1o7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUMsQ0FBQyxFQUFFO1lBQ0YsT0FBTyxZQUFZLENBQUE7U0FDcEI7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQyxDQUFBO0FBRUQsTUFBTSxT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