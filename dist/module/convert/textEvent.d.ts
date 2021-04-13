import { TextOperation } from 'slate';
import * as Y from 'yjs';
/**
 * Converts a Yjs Text event into Slate operations.
 *
 * @param event
 */
export default function textEvent(event: Y.YTextEvent, doc: any): TextOperation[];
