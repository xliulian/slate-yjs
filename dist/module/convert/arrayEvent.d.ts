import { NodeOperation } from 'slate';
import * as Y from 'yjs';
import { SyncElement } from '../model';
/**
 * Converts a Yjs Array event into Slate operations.
 *
 * @param event
 */
export default function arrayEvent(event: Y.YArrayEvent<SyncElement>, doc: any): NodeOperation[];
