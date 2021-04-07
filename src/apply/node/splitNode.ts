import { SplitNodeOperation } from 'slate';
import invariant from 'tiny-invariant';
import * as Y from 'yjs';
import { SharedType, SyncNode, SyncElement } from '../../model';
import { getParent } from '../../path';
import cloneSyncElement from '../../utils/clone';

/**
 * Applies a split node operation to a SharedType
 *
 * @param doc
 * @param op
 */
export default function splitNode(
  doc: SharedType,
  op: SplitNodeOperation
): SharedType {
  const [parent, index]: [SyncNode, number] = getParent(doc, op.path);

  const children = SyncNode.getChildren(parent);
  invariant(children, 'Parent of node should have children');

  const target = children.get(index);
  const inject = new Y.Map();
  children.insert(index + 1, [inject]);

  Object.entries(op.properties).forEach(([key, value]) =>
    inject.set(key, value)
  );

  const targetText = SyncNode.getText(target)
  if (targetText !== undefined) {
    const injectText = new Y.Text(targetText.toString().slice(op.position));
    inject.set('text', injectText);

    invariant(targetText);
    invariant(injectText);

    if (targetText.length > op.position) {
      targetText.delete(op.position, targetText.length - op.position);
    }
  } else {
    const targetChildren = SyncNode.getChildren(target);

    const injectChildren = new Y.Array();
    inject.set('children', injectChildren);

    invariant(targetChildren);
    invariant(injectChildren);

    // XXX: we have to clone the array elements since yjs does not support move element from one array to the other.
    const childElements: SyncElement[] = []
    targetChildren.forEach((child, idx) => {
      if (idx >= op.position) {
        childElements.push(cloneSyncElement(child));
      }
    });
    injectChildren.insert(0, childElements);

    targetChildren.delete(op.position, targetChildren.length - op.position);
  }

  return doc;
}
