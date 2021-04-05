import { InsertNodeOperation, NodeOperation, RemoveNodeOperation, Node, Element } from 'slate';
import * as Y from 'yjs';
import { SyncElement } from '../model';
import { toSlateNode, toSlatePath } from '../utils/convert';

/**
 * Converts a Yjs Array event into Slate operations.
 *
 * @param event
 */
export default function arrayEvent(
  event: Y.YArrayEvent<SyncElement>,
  doc: any
): NodeOperation[] {
  const eventTargetPath = toSlatePath(event.path);
  console.log('arrayEvent', event, eventTargetPath, event.changes)

  function createRemoveNode(index: number): RemoveNodeOperation {
    const path = [...eventTargetPath, index];
    return { type: 'remove_node', path, node: { text: '' } };
  }

  function createInsertNode(
    index: number,
    element: SyncElement
  ): InsertNodeOperation {
    const path = [...eventTargetPath, index];
    const node = toSlateNode(element as SyncElement);
    return { type: 'insert_node', path, node };
  }

  let removeIndex = 0;
  let addIndex = 0;
  const removeOps: NodeOperation[] = [];
  const addOps: NodeOperation[] = [];

  event.changes.delta.forEach((delta) => {
    if ('retain' in delta) {
      removeIndex += delta.retain!;
      addIndex += delta.retain!;
      return;
    }

    if ('delete' in delta) {
      for (let i = 0; i < delta.delete!; i += 1) {
        removeOps.push(createRemoveNode(removeIndex));
      }

      return;
    }

    if ('insert' in delta) {
      addOps.push(
        // eslint-disable-next-line no-loop-func
        ...(delta.insert as any[]).map((e: SyncElement, i: number) =>
          createInsertNode(addIndex + i, e)
        )
      );

      addIndex += delta.insert!.length;
    }
  });

  const ops = [...removeOps, ...addOps]
  if (ops.length) {
    const parent = Node.get({children: doc}, eventTargetPath) as Element
    ops.forEach(op => {
      if (op.type === 'remove_node') {
        op.node = parent.children.splice(op.path[op.path.length - 1], 1)[0]
      } else if (op.type === 'insert_node') {
        parent.children.splice(op.path[op.path.length - 1], 0, op.node)      
      }
    })
  }
  return ops
}
