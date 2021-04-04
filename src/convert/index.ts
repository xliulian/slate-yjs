import { Operation, Path, Node, Element, Text } from 'slate';
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
export function toSlateOp(event: Y.YEvent, ops: Operation[], doc: any): Operation[] {
  let ret
  if (event instanceof Y.YArrayEvent) {
    ret = arrayEvent(event, doc);
  } else if (event instanceof Y.YMapEvent) {
    ret = mapEvent(event);
  } else if (event instanceof Y.YTextEvent) {
    ret = textEvent(event, doc);
  } else {
    throw new Error('Unsupported yjs event');
  }
  if (ret.length) {
    console.log('toSlateOp ret:', ret)
    if (ops.length > 0) {
      const lastOp = ops[ops.length - 1]
      const op = ret[0]
      if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_text' &&
        Path.equals(lastOp.path, Path.next(Path.parent(op.path))) &&
        (lastOp.node as Element).children.length === 1 &&
        op.text === (lastOp.node as Element).children[0].text &&
        (Node.get({ children: doc }, op.path) as Text).text.length === op.offset
      ) {
        ops.pop();
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
        (lastOp.node as Element).children.length >= ret.length &&
        _.isEqual(
          (ret as Operation[])
            .slice(0, (lastOp.node as Element).children.length)
            .filter((o) => o.type === 'remove_node' && Path.equals(o.path, op.path))
            .map((o) => o.node),
          (lastOp.node as Element).children
        ) &&
        (Node.get({ children: doc }, Path.parent(op.path)) as Element).children
          .length === op.path[op.path.length - 1]
      ) {
        ops.pop();
        ret.splice(0, (lastOp.node as Element).children.length, {
          type: 'split_node',
          properties: _.omit(lastOp.node, 'children'),
          position: op.path[op.path.length - 1],
          path: Path.parent(op.path),
        });
        console.log('split_node detected from:', lastOp, ret, ret[0]);
      }
      /*
              _.isEqual(
          (ret as Operation[])
            .slice(0, (lastOp.node as Element).children.length)
            .filter(
              (o, idx) =>
                (o.type === 'remove_node' && Path.equals(o.path, op.path)) ||
                (idx === (lastOp.node as Element).children.length &&
                  o.type === 'remove_text' &&
                  Path.equals(Path.next(o.path), op.path)) &&
                  o.text === (lastOp.node as Element).children[0].text &&
                  ((Node.get({ children: doc }, Path.parent(op.path)) as Element).children.slice(-1)[0] as Text).text.length === o.offset
            )
            .map((o, idx) => idx === (lastOp.node as Element).children.length ? (lastOp.node as Element).children[0] : o.node),
          (lastOp.node as Element).children
        ) &&
        (Node.get({ children: doc }, Path.parent(op.path)) as Element).children.length === op.path[op.path.length - 1]
      ) {
        ops.pop();
        const os = ret.splice(0, (lastOp.node as Element).children.length, {
          type: 'split_node',
          properties: _.omit(lastOp.node, 'children'),
          position: op.path[op.path.length - 1],
          path: Path.parent(op.path),
        });
        op = os[os.length - 1]
        if (op.type === 'remove_text') {
          ret.splice(0, 0, {
            type: 'split_node',
            properties: _.omit((lastOp.node as Element).children[0], 'text'),
            position: op.offset,
            path: op.path,
          })
        }
        */
    }
    ops = ops.concat(ret)
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

  const iterate = (ops: Operation[], event: Y.YEvent): Operation[] => {
    return toSlateOp(event, ops, tempDoc)
  }

  const ops = events.reduce(iterate, [])

  return ops.flatMap(op => op).filter(op => op)
  //return events.flatMap(event => toSlateOp(event, doc));
}
