import { Path, Node, Element } from 'slate';
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
/**
 * Converts a yjs event into slate operations.
 *
 * @param event
 */
export function toSlateOp(event, ops, doc) {
    let ret;
    if (event instanceof Y.YArrayEvent) {
        ret = arrayEvent(event, doc);
        if (ret.length === 2 &&
            ret[0].type === 'remove_node' &&
            ret[1].type === 'insert_node' &&
            Path.equals(ret[0].path, ret[1].path)) {
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
            }
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
            if (lastOp.type === 'insert_node' &&
                op.type === 'remove_text' &&
                Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
                lastOp.node.children.length === 1 &&
                op.text === lastOp.node.children[0].text &&
                Node.get(dummyEditor, op.path).text.length === op.offset &&
                !Node.has(dummyEditor, Path.next(op.path))) {
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: _.omit(lastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: op.path,
                }, {
                    type: 'split_node',
                    properties: _.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1] + 1,
                    path: Path.parent(op.path),
                });
                console.log('split_node2 detected from:', lastOp, op, ret[0]);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'remove_node' &&
                Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
                lastOp.node.children.length <= ret.length &&
                _.isEqual(ret
                    .slice(0, lastOp.node.children.length)
                    .filter((o) => o.type === 'remove_node' && Path.equals(o.path, op.path))
                    .map((o) => o.node), lastOp.node.children) &&
                Node.get(dummyEditor, Path.parent(op.path)).children
                    .length === op.path[op.path.length - 1]) {
                popLastOp(ops);
                const os = ret.splice(0, lastOp.node.children.length, {
                    type: 'split_node',
                    properties: _.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1],
                    path: Path.parent(op.path),
                });
                console.log('split_node detected from:', lastOp, os, ret[0]);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'remove_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'insert_node' &&
                Path.equals(Path.next(op.path), lastOp.path) &&
                Path.equals(beforeLastOp.path, Path.next(Path.parent(op.path))) &&
                lastOps.every(o => o.type === 'remove_node' && Path.equals(o.path, lastOp.path)) &&
                op.text === beforeLastOp.node.children[0].text &&
                _.isEqual(beforeLastOp.node.children.slice(1), lastOps.map(o => o.node)) &&
                _.isEqual([Node.get(dummyEditor, Path.parent(op.path))].map(n => [n.children.length, n.children[n.children.length - 1].text.length])[0], [lastOp.path[lastOp.path.length - 1], op.offset])) {
                ops.pop();
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'split_node',
                    properties: _.omit(beforeLastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: op.path,
                }, {
                    type: 'split_node',
                    properties: _.omit(beforeLastOp.node, 'children'),
                    position: lastOp.path[lastOp.path.length - 1],
                    path: Path.parent(lastOp.path),
                });
                console.log('split_node3 detected from:', beforeLastOp, lastOps, ret);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_text' &&
                Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
                lastOp.node.children.length === 1 &&
                op.text === lastOp.node.children[0].text &&
                Node.get(dummyEditor, op.path).text.length === op.offset + op.text.length &&
                !Node.has(dummyEditor, Path.next(op.path))) {
                popLastOp(ops);
                ret.splice(0, 1, {
                    type: 'merge_node',
                    properties: _.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1] + 1,
                    path: lastOp.path,
                }, {
                    type: 'merge_node',
                    properties: _.omit(lastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: Path.next(op.path),
                });
                console.log('merge_node2 detected from:', lastOp, op, ret[0]);
            }
            else if (lastOp.type === 'remove_node' &&
                op.type === 'insert_node' &&
                Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
                lastOp.node.children.length <= ret.length &&
                _.isEqual(ret
                    .slice(0, lastOp.node.children.length)
                    .filter((o, idx) => o.type === 'insert_node' && Path.equals(Path.parent(o.path).concat(o.path[o.path.length - 1] - idx), op.path))
                    .map((o) => o.node), lastOp.node.children) &&
                !Node.has(dummyEditor, Path.next(ret[lastOp.node.children.length - 1].path))) {
                popLastOp(ops);
                const os = ret.splice(0, lastOp.node.children.length, {
                    type: 'merge_node',
                    properties: _.omit(lastOp.node, 'children'),
                    position: op.path[op.path.length - 1],
                    path: lastOp.path,
                });
                console.log('merge_node detected from:', lastOp, os, ret[0]);
            }
            else if (lastOp.type === 'insert_node' &&
                op.type === 'insert_text' &&
                (beforeLastOp === null || beforeLastOp === void 0 ? void 0 : beforeLastOp.type) === 'remove_node' &&
                Path.equals(beforeLastOp.path, Path.next(Path.parent(op.path))) &&
                lastOps.every((o, idx) => o.type === 'insert_node' &&
                    (idx === 0 ||
                        Path.equals(o.path, Path.next(lastOps[idx - 1].path)))) &&
                Path.equals(Path.next(op.path), firstOfLastOps.path) &&
                op.text === beforeLastOp.node.children[0].text &&
                _.isEqual(beforeLastOp.node.children.slice(1), lastOps.map((o) => o.node)) &&
                _.isEqual([Node.get(dummyEditor, Path.parent(op.path))].map((n) => [
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
                    properties: _.omit(beforeLastOp.node, 'children'),
                    position: firstOfLastOps.path.slice(-1)[0],
                    path: beforeLastOp.path,
                }, {
                    type: 'merge_node',
                    properties: _.omit(beforeLastOp.node.children[0], 'text'),
                    position: op.offset,
                    path: Path.next(op.path),
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
                op.node.children && // element more than text.
                JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0) {
                const relativePath = findNodeRelativePath(op.node, lastOp.node);
                if (relativePath) {
                    // XXX: first move part of the node somewhere, then remove node.
                    let removePath = [...op.path];
                    if (Path.isCommon(lastOp.path, op.path)) {
                        // insert path should change since we do not remove first, how would the remove op path change the insert path?
                        removePath[lastOp.path.length - 1] -= 1;
                    }
                    if (Path.isCommon(removePath, lastOp.path) && !Path.equals(removePath, lastOp.path)) {
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
export function toSlateOps(events, doc) {
    const tempDoc = JSON.parse(JSON.stringify(doc));
    const iterate = (ops, event) => {
        return toSlateOp(event, ops, tempDoc);
    };
    const ops = events.reduce(iterate, []);
    return ops.flatMap(op => op).filter(op => op);
    //return events.flatMap(event => toSlateOp(event, doc));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQTRCLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFRLE1BQU0sT0FBTyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO0FBQ3pCLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUN2QixPQUFPLFVBQVUsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxRQUFRLE1BQU0sWUFBWSxDQUFDO0FBQ2xDLE9BQU8sU0FBUyxNQUFNLGFBQWEsQ0FBQztBQUVwQyxNQUFNLG9CQUFvQixHQUFHLENBQUMsVUFBZ0IsRUFBRSxVQUFnQixFQUFFLGVBQXFCLEVBQUUsRUFBZ0IsRUFBRTtJQUN6RyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQ3JDLE9BQU8sWUFBWSxDQUFBO0tBQ3BCO0lBQ0QsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ2pDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxJQUFJLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUUsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsWUFBWSxHQUFHLElBQUksQ0FBQTtnQkFDbkIsT0FBTyxJQUFJLENBQUE7YUFDWjtZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQyxDQUFDLEVBQUU7WUFDRixPQUFPLFlBQVksQ0FBQTtTQUNwQjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDLENBQUE7QUFFRCxNQUFNLFNBQVMsR0FBRyxD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