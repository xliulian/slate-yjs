import { Editor, Operation } from 'slate';
import * as Y from 'yjs';
/**
 * Converts a yjs event into slate operations.
 *
 * @param event
 */
export declare function toSlateOp(event: Y.YEvent, ops: Operation[][], doc: any, editor: Editor): Operation[][];
/**
 * Converts yjs events into slate operations.
 *
 * @param events
 */
export declare function toSlateOps(events: Y.YEvent[], editor: Editor): Operation[];
