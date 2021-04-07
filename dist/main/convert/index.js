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
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
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
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
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
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
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
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
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
                ops[ops.length - 1].pop();
                if (!ops[ops.length - 1].length) {
                    ops.pop();
                }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udmVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQTRFO0FBQzVFLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsOERBQXNDO0FBQ3RDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEM7Ozs7R0FJRztBQUNILFNBQWdCLFNBQVMsQ0FBQyxLQUFlLEVBQUUsR0FBa0IsRUFBRSxHQUFRO0lBQ3JFLElBQUksR0FBRyxDQUFBO0lBQ1AsSUFBSSxLQUFLLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRTtRQUNsQyxHQUFHLEdBQUcsb0JBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFDRSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDaEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhO1lBQzdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYTtZQUM3QixZQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNyQztZQUNBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUN2RCxJQUFJLGFBQWEsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENB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