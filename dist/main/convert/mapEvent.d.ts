import { SetNodeOperation } from 'slate';
import * as Y from 'yjs';
/**
 * Converts a Yjs Map event into Slate operations.
 *
 * @param event
 */
export default function mapEvent(event: Y.YMapEvent<unknown>, doc: any): SetNodeOperation[];
