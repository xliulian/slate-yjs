import { TextOperation, Node, Text } from 'slate';
import invariant from 'tiny-invariant';
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

  //const removedValues = event.changes.deleted.values();
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
      /*let text = '';

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
      }*/
      const text = Array(delta.delete!).fill('*').join('')

      removeOps.push(createTextOp('remove_text', removeOffset, text));
      return;
    }

    if ('insert' in delta) {
      let text
      if (Array.isArray(delta.insert)) {
        invariant(
          delta.insert.every(t => typeof t === 'string'),
          `Unexpected text insert content type: expected string or string[], got ${JSON.stringify(delta.insert)}`
        );        
        text = (delta.insert as any[]).join('')
      } else {
        invariant(
          typeof delta.insert === 'string',
          `Unexpected text insert content type: expected string or string[], got ${typeof delta.insert}`
        );
        text = delta.insert as string
      }
      addOps.push(
        createTextOp('insert_text', addOffset, text)
      );
      addOffset += text!.length;
    }
  });

  const ops = [...removeOps, ...addOps]
  if (ops.length) {
    const node = Node.get({children: doc}, eventTargetPath) as Text
    ops.forEach(op => {
      if (op.type === 'remove_text') {
        op.text = node.text.slice(op.offset, op.offset + op.text.length) // removedValues is not reliable.
        node.text = node.text.slice(0, op.offset) + node.text.slice(op.offset + op.text.length)
      } else if (op.type === 'insert_text') {
        node.text = node.text.slice(0, op.offset) + op.text + node.text.slice(op.offset)
      }
    })
  }
  return ops
}
