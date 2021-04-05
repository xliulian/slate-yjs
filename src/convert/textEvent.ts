import { TextOperation, Node, Text } from 'slate';
import * as Y from 'yjs';
import { toSlatePath } from '../utils/convert';

/**
 * Converts a Yjs Text event into Slate operations.
 *
 * @param event
 */
export default function textEvent(event: Y.YTextEvent, doc: any): TextOperation[] {
  const eventTargetPath = toSlatePath(event.path);
  console.log('textEvent', event, eventTargetPath, event.changes)

  const createTextOp = (
    type: 'insert_text' | 'remove_text',
    offset: number,
    text: string
  ): TextOperation => {
    return {
      type,
      offset,
      text,
      path: eventTargetPath,
    };
  };

  const removedValues = event.changes.deleted.values();
  let removeOffset = 0;
  let addOffset = 0;
  const removeOps: TextOperation[] = [];
  const addOps: TextOperation[] = [];

  event.changes.delta.forEach((delta) => {
    if ('retain' in delta) {
      removeOffset += delta.retain!;
      addOffset += delta.retain!;
      return;
    }

    if ('delete' in delta) {
      let text = '';

      while (text.length < delta.delete!) {
        const item = removedValues.next().value;
        const { content } = item;
        if (!(content instanceof Y.ContentString)) {
          throw new TypeError(`Unsupported content type ${item.content}`);
        }
        text = text.concat(content.str);
      }

      if (text.length !== delta.delete) {
        throw new Error(
          `Unexpected length: expected ${delta.delete}, got ${text.length}`
        );
      }

      removeOps.push(createTextOp('remove_text', removeOffset, text));
      const node = Node.get({children: doc}, eventTargetPath) as Text
      node.text = node.text.slice(0, removeOffset) + node.text.slice(removeOffset + text.length)
      return;
    }

    if ('insert' in delta) {
      const text = (delta.insert as any[]).join('')
      addOps.push(
        createTextOp('insert_text', addOffset, text)
      );
      const node = Node.get({children: doc}, eventTargetPath) as Text
      node.text = node.text.slice(0, addOffset) + text + node.text.slice(addOffset)
      addOffset += delta.insert!.length;
    }
  });

  return [...removeOps, ...addOps];
}
