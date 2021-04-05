import { Operation, NodeOperation, Path, Node, Element, Text } from 'slate';
import * as Y from 'yjs';
import _ from 'lodash';
import arrayEvent from './arrayEvent';
import mapEvent from './mapEvent';
import textEvent from './textEvent';

/**
 * Converts a yjs event into slate operations.
 *
 * @param event
 */
export function toSlateOp(event: Y.YEvent, ops: Operation[][], doc: any): Operation[][] {
  let ret
  if (event instanceof Y.YArrayEvent) {
    ret = arrayEvent(event, doc);
    if (
      ret.length === 2 &&
      ret[0].type === 'remove_node' &&
      ret[1].type === 'insert_node' &&
      Path.equals(ret[0].path, ret[1].path)
    ) {
      const node0Str = JSON.stringify(ret[0].node)
      const node1Str = JSON.stringify(ret[1].node)
      const firstIsDeeper = node0Str.length > node1Str.length
      if (firstIsDeeper && node0Str.indexOf(node1Str) >= 0 || !firstIsDeeper && node1Str.indexOf(node0Str) >= 0) {
        if (node0Str === node1Str) {
          console.log('skip dummy operations:', ret)
          return ops
        }
        const deeperNode = firstIsDeeper ? ret[0].node : ret[1].node
        const shadowNode = firstIsDeeper ? ret[1].node : ret[0].node
        const findNodeRelativePath = (parentNode: Node, nodeToFind: Node, relativePath: Path = []) => {
          if (_.isEqual(parentNode, nodeToFind)) {
            return relativePath
          }
          if (Element.isElement(parentNode)) {
            if (parentNode.children.some((n, idx) => {
              const path = findNodeRelativePath(n, nodeToFind, relativePath.concat(idx))
              if (path) {
                relativePath = path
                return true
              }
              return false
            })) {
              return relativePath
            }
          }
          return null
        }
        const relativePath = findNodeRelativePath(deeperNode, shadowNode)
        if (relativePath) {
          console.log('possible move_node detected:', ret, firstIsDeeper, relativePath)
          const parentNode = Node.get(deeperNode, Path.parent(relativePath)) as Element
          parentNode.children.splice(relativePath[relativePath.length - 1], 1)
          if (firstIsDeeper) {
            ret = [
              {
                type: 'move_node',
                path: ret[0].path.concat(relativePath) as Path,
                newPath: Path.next(ret[0].path),
              } as NodeOperation,
              {
                type: 'remove_node',
                path: ret[0].path,
                node: deeperNode,
              } as NodeOperation
            ]
          } else {
            // first insert empty next node, then move
            ret[1].path = Path.next(ret[1].path)
            ret = [
              ret[1],
              {
                type: 'move_node',
                path: ret[0].path,
                newPath: ret[1].path.concat(relativePath) as Path,
              } as NodeOperation
            ]
          }
          console.log('move_node restored ops:', ret)
          ops.push(ret)
          return ops
        }
      }
    }
  } else if (event instanceof Y.YMapEvent) {
    ret = mapEvent(event, doc);
  } else if (event instanceof Y.YTextEvent) {
    ret = textEvent(event, doc);
  } else {
    throw new Error('Unsupported yjs event');
  }
  if (ret.length) {
    console.log('toSlateOp ret:', ret)
    if (ops.length > 0) {
      const lastOps = ops[ops.length - 1] as Operation[]
      const firstOfLastOps = lastOps[0] as Operation
      const lastOp = lastOps.slice(-1)[0]
      const beforeLastOp = (ops[ops.length - 2] || []).slice(-1)[0]
      const op = ret[0]
      const dummyEditor = { children: doc }
      if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_text' &&
        Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
        (lastOp.node as Element).children.length === 1 &&
        op.text === (lastOp.node as Element).children[0].text &&
        (Node.get(dummyEditor, op.path) as Text).text.length === op.offset &&
        !Node.has(dummyEditor, Path.next(op.path))
      ) {
        ops[ops.length - 1].pop()
        if (!ops[ops.length - 1].length) {
          ops.pop()
        }
        ret.splice(
          0,
          1,
          {
            type: 'split_node',
            properties: _.omit((lastOp.node as Element).children[0], 'text'),
            position: op.offset,
            path: op.path,
          },
          {
            type: 'split_node',
            properties: _.omit(lastOp.node, 'children'),
            position: op.path[op.path.length - 1] + 1,
            path: Path.parent(op.path),
          }
        );
        console.log('split_node2 detected from:', lastOp, op, ret[0]);
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_node' &&
        Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
        (lastOp.node as Element).children.length <= ret.length &&
        _.isEqual(
          (ret as Operation[])
            .slice(0, (lastOp.node as Element).children.length)
            .filter((o) => o.type === 'remove_node' && Path.equals(o.path, op.path))
            .map((o) => o.node),
          (lastOp.node as Element).children
        ) &&
        (Node.get(dummyEditor, Path.parent(op.path)) as Element).children
          .length === op.path[op.path.length - 1]
      ) {
        ops[ops.length - 1].pop()
        if (!ops[ops.length - 1].length) {
          ops.pop()
        }
        const os = ret.splice(0, (lastOp.node as Element).children.length, {
          type: 'split_node',
          properties: _.omit(lastOp.node, 'children'),
          position: op.path[op.path.length - 1],
          path: Path.parent(op.path),
        });
        console.log('split_node detected from:', lastOp, os, ret[0]);
      } else if (
        lastOp.type === 'remove_node' &&
        op.type === 'remove_text' &&
        beforeLastOp?.type === 'insert_node' &&
        Path.equals(Path.next(op.path), lastOp.path) &&
        Path.equals(beforeLastOp.path, Path.next(Path.parent(op.path))) &&
        lastOps.every(o => o.type === 'remove_node' && Path.equals(o.path, lastOp.path)) &&
        op.text === (beforeLastOp.node as Element).children[0].text &&
        _.isEqual((beforeLastOp.node as Element).children.slice(1), lastOps.map(o => o.node)) &&
        _.isEqual([Node.get(dummyEditor, Path.parent(op.path)) as Element].map(n => [n.children.length, (n.children[n.children.length - 1] as Text).text.length])[0], [lastOp.path[lastOp.path.length - 1], op.offset])
      ) {
        ops.pop()
        ops[ops.length - 1].pop()
        if (!ops[ops.length - 1].length) {
          ops.pop()
        }
        ret.splice(
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
        );
        console.log('split_node3 detected from:', beforeLastOp, lastOps, ret);
      } else if (
        lastOp.type === 'remove_node' &&
        op.type === 'insert_text' &&
        Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
        (lastOp.node as Element).children.length === 1 &&
        op.text === (lastOp.node as Element).children[0].text &&
        (Node.get(dummyEditor, op.path) as Text).text.length === op.offset + op.text.length &&
        !Node.has(dummyEditor, Path.next(op.path))
      ) {
        ops[ops.length - 1].pop()
        if (!ops[ops.length - 1].length) {
          ops.pop()
        }
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
        );
        console.log('merge_node2 detected from:', lastOp, op, ret[0]);
      } else if (
        lastOp.type === 'remove_node' &&
        op.type === 'insert_node' &&
        Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
        (lastOp.node as Element).children.length <= ret.length &&
        _.isEqual(
          (ret as Operation[])
            .slice(0, (lastOp.node as Element).children.length)
            .filter((o, idx) => o.type === 'insert_node' && Path.equals(Path.parent(o.path).concat(o.path[o.path.length - 1] - idx), op.path))
            .map((o) => o.node),
          (lastOp.node as Element).children
        ) &&
        !Node.has(dummyEditor, Path.next(ret[(lastOp.node as Element).children.length - 1].path))
      ) {
        ops[ops.length - 1].pop()
        if (!ops[ops.length - 1].length) {
          ops.pop()
        }
        const os = ret.splice(0, (lastOp.node as Element).children.length, {
          type: 'merge_node',
          properties: _.omit(lastOp.node, 'children'),
          position: op.path[op.path.length - 1],
          path: lastOp.path,
        });
        console.log('merge_node detected from:', lastOp, os, ret[0]);
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'insert_text' &&
        beforeLastOp?.type === 'remove_node' &&
        Path.equals(beforeLastOp.path, Path.next(Path.parent(op.path))) &&
        lastOps.every(
          (o, idx) =>
            o.type === 'insert_node' &&
            (idx === 0 ||
              Path.equals(o.path, Path.next((lastOps[idx - 1] as NodeOperation).path)))
        ) &&
        Path.equals(Path.next(op.path), (firstOfLastOps as NodeOperation).path) &&
        op.text === (beforeLastOp.node as Element).children[0].text &&
        _.isEqual(
          (beforeLastOp.node as Element).children.slice(1),
          lastOps.map((o) => o.node)
        ) &&
        _.isEqual(
          [Node.get(dummyEditor, Path.parent(op.path)) as Element].map((n) => [
            n.children.length,
            (n.children[op.path.slice(-1)[0]] as Text).text.length,
          ])[0],
          [lastOp.path[lastOp.path.length - 1] + 1, op.offset + op.text.length]
        )
      ) {
        ops.pop()
        ops[ops.length - 1].pop();
        if (!ops[ops.length - 1].length) {
          ops.pop();
        }
        ret.splice(
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
          },
        );
        console.log('merge_node3 detected from:', beforeLastOp, lastOps, ret);
      }
    }
    ops.push(ret)
  }
  return ops
}

/**
 * Converts yjs events into slate operations.
 *
 * @param events
 */
export function toSlateOps(events: Y.YEvent[], doc: any): Operation[] {
  const tempDoc = JSON.parse(JSON.stringify(doc))

  const iterate = (ops: Operation[][], event: Y.YEvent): Operation[][] => {
    return toSlateOp(event, ops, tempDoc)
  }

  const ops = events.reduce(iterate, [])

  return ops.flatMap(op => op).filter(op => op)
  //return events.flatMap(event => toSlateOp(event, doc));
}
