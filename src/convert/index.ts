import { Editor, Operation, NodeOperation, Path, Node, Element, Text, Point } from 'slate';
import * as Y from 'yjs';
import _ from 'lodash';
import arrayEvent from './arrayEvent';
import mapEvent from './mapEvent';
import textEvent from './textEvent';

const findNodeRelativePath = (parentNode: Node, nodeToFind: Node, relativePath: Path = []) : Path | null => {
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

const popLastOp = (ops: Operation[][]): Operation | null => {
  while (ops.length) {
    const lastOps = ops[ops.length - 1]
    if (lastOps.length > 0) {
      const op = lastOps.pop()
      if (!lastOps.length) {
        ops.pop()
      }
      return op!
    }
    ops.pop()
  }
  return null
}

const matchTextSuffix = (node: Node, text: string): boolean => {
  return text.length > 0 && Text.isText(node) && node.text.length > 0 && text.length >= node.text.length && text.slice(-node.text.length) === node.text
}

// return a number mean the text node need be moved down the number of levels.
const isOnlyChildAndTextMatch = (node: Node, text: string, level: number): boolean | number => {
  if (level === 0 || Text.isText(node)) {
    if (Text.isText(node) && node.text === text && text.length > 0) {
      return level === 0 ? true : level
    }
    return false
  }
  if (Element.isElement(node) && node.children.length === 1) {
    return isOnlyChildAndTextMatch(node.children[0], text, level - 1)
  }
  return false
}

type MatchResult = {
  levelsToMove?: number,
  withPrefixEmptyText?: Text,
}

const isOnlyChildAndNodesMatch = (node: Node, nodes: Node[], level: number, allowPrefixEmptyTextNode: boolean = false): false | MatchResult => {
  if (!nodes.length) {
    return false
  }
  if (level === 0) {
    if (Element.isElement(node) && node.children.length > 0) {
      if (_.isEqual(nodes, node.children)) {
        return {}
      }
      if (allowPrefixEmptyTextNode && node.children.length === nodes.length + 1 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(1))) {
        return {
          withPrefixEmptyText: node.children[0] as Text,
        }
      }
    }
    return false
  }
  if (Element.isElement(node)) {
    if (node.children.length === nodes.length && _.isEqual(nodes, node.children)) {
      return {levelsToMove: level}
    }
    if (allowPrefixEmptyTextNode && node.children.length === nodes.length + 1 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(1))) {
      return {levelsToMove: level, withPrefixEmptyText: node.children[0] as Text}
    }
    if (node.children.length === 1) {
      return isOnlyChildAndNodesMatch(node.children[0], nodes, level - 1, allowPrefixEmptyTextNode)
    }
  }
  return false
}

const matchTextNode = (node: Node, text: string, matchInlineText?: (n: Node) => boolean): boolean | 'inline' => {
  if (!matchInlineText && Text.isText(node) && node.text === text) {
    return true
  }
  if (matchInlineText && matchInlineText(node) && Element.isElement(node) && node.children.length === 1 && matchTextNode(node.children[0], text)) {
    return 'inline'
  }
  return false
}

const isOnlyChildWithTextAndNodesMatch = (node: Node, text: string, nodes: Node[], level: number, opts: {allowPrefixEmptyTextNode: boolean, matchInlineText?: (n: Node) => boolean} = {
  allowPrefixEmptyTextNode: false,
}): false | MatchResult => {
  if (!nodes.length || !text.length) {
    return false
  }
  if (level === 0) {
    if (Element.isElement(node)) {
      if (node.children.length === nodes.length + 1 && _.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
        return {}
      }
      if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
        return {
          withPrefixEmptyText: node.children[0] as Text,
        }
      }
    }
    return false
  }
  if (Element.isElement(node)) {
    if (node.children.length === nodes.length + 1 && _.isEqual(nodes, node.children.slice(1)) && matchTextNode(node.children[0], text, opts.matchInlineText)) {
      return {levelsToMove: level}
    }
    if (opts.allowPrefixEmptyTextNode && node.children.length === nodes.length + 2 && isEmptyTextNode(node.children[0]) && _.isEqual(nodes, node.children.slice(2)) && matchTextNode(node.children[1], text, opts.matchInlineText)) {
        return {
          levelsToMove: level,
          withPrefixEmptyText: node.children[0] as Text,
        }
      }
    if (node.children.length === 1) {
      return isOnlyChildWithTextAndNodesMatch(node.children[0], text, nodes, level - 1, opts)
    }
  }
  return false
}

const isEmptyTextNode = (node: Node) => {
  return Text.isText(node) && node.text.length === 0
}

const isInsertEmptyTextNodeOpWithPath = (op: Operation, path: Path) => {
  return op && op.type === 'insert_node' && isEmptyTextNode(op.node) && Path.equals(path, op.path)
}

const isRemoveEmptyTextNodeOpWithPath = (op: Operation, path: Path) => {
  return op && op.type === 'remove_node' && isEmptyTextNode(op.node) && Path.equals(path, op.path)
}

const isNodeEndAtPath = (node: Node, path: Path, targetPath: Path): boolean => {
  const [, lastPath] = Node.last(node, path)
  return targetPath.length >= path.length && Path.isCommon(targetPath, lastPath)
}

const isNodeEndAtPoint = (node: Node, path: Path, point: Point): boolean => {
  const [, lastPath] = Node.last(node, path)
  if (!Path.equals(lastPath, point.path)) {
    return false
  }

  const leaf = Node.get(node, lastPath)

  if (!Text.isText(leaf)) {
    return false
  }

  return leaf.text.length === point.offset
}

/**
 * Converts a yjs event into slate operations.
 *
 * @param event
 */
export function toSlateOp(event: Y.YEvent, ops: Operation[][], doc: any, editor: Editor): Operation[][] {
  let ret: Operation[]
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
      //if (firstIsDeeper && node0Str.indexOf(node1Str) >= 0 || !firstIsDeeper && node1Str.indexOf(node0Str) >= 0) {
        if (node0Str === node1Str) {
          console.log('skip dummy operations:', ret)
          return ops
        }
        const deeperNode = firstIsDeeper ? ret[0].node : ret[1].node
        const shadowNode = firstIsDeeper ? ret[1].node : ret[0].node
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
      //}
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
      let nodesLength = 0
      let levelsToMove
      let matchResult
      if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_text' &&
        lastOps.length === 2 &&
        lastOps[0].type === 'insert_node' &&
        Path.equals(Path.next(op.path), lastOps[0].path) &&
        Path.equals(Path.next(lastOps[0].path), lastOp.path) &&
        matchTextSuffix(lastOp.node, op.text) &&
        isNodeEndAtPoint(dummyEditor, op.path, op)
      ) {
        ops.pop()
        
        const ret2: Operation[] = []
        let doubleSplit = false
        if (Text.isText(lastOp.node) && op.text.length > lastOp.node.text.length) {
          // remove text which normally came from delete selection
          const textToRemove = op.text.slice(0, -lastOp.node.text.length)
          if (Text.isText(lastOps[0].node) && lastOps[0].node.text === textToRemove) {
            // that remove_text and this insert_node is indeed the other split_node
            ret2.push({
              type: 'split_node',
              properties: _.omit(lastOp.node, 'text'),
              position: op.offset + textToRemove.length,
              path: op.path,
            })
            doubleSplit = true
          } else {
            ret2.push({
              ...op,
              text: textToRemove
            })
          }
        }
        ret2.push({
          type: 'split_node',
          properties: _.omit(doubleSplit ? lastOps[0].node : lastOp.node, 'text'),
          position: op.offset,
          path: op.path,
        })
        if (!doubleSplit) {
          ret2.push(lastOps[0])
        }

        ret.splice(0, 1, ...ret2)

        console.log('split & insert node detected from:', lastOps, op, ret);
      } else if (
        op.type === 'insert_text' &&
        lastOp.type === 'remove_node' &&
        lastOps.length === 2 &&
        lastOps[0].type === 'remove_node' &&
        Path.equals(Path.next(op.path), lastOp.path) &&
        Path.equals(lastOps[0].path, lastOp.path) &&
        Text.isText(lastOp.node) &&
        Text.isText(lastOps[0].node) &&
        op.text === lastOps[0].node.text + lastOp.node.text &&
        isNodeEndAtPoint(dummyEditor, op.path, {
          path: op.path,
          offset: op.offset + op.text.length
        })
      ) {
        ops.pop()
        
        ret.splice(0, 1, {
          type: 'merge_node',
          properties: _.omit(lastOps[0].node, 'text'),
          position: op.offset,
          path: lastOp.path,
        }, {
          type: 'merge_node',
          properties: _.omit(lastOp.node, 'text'),
          position: op.offset + lastOps[0].node.text.length,
          path: lastOp.path,
        })

        console.log('(un)mark & merge node detected from:', lastOps, op, ret);
      } else if (
        lastOp.type === 'set_node' &&
        lastOps.length === 1 &&
        op.type === 'remove_text' &&
        beforeLastOp?.type === 'insert_node' &&
        Path.equals(op.path, lastOp.path) &&
        Path.equals(Path.next(op.path), beforeLastOp.path) &&
        isOnlyChildAndTextMatch(beforeLastOp.node, op.text, 0) &&
        isNodeEndAtPoint(dummyEditor, op.path, op)
      ) {
        // three ops, the first and the last one is for split.
        ops.pop()
        popLastOp(ops)

        ret.splice(0, 1, {
          type: 'split_node',
          properties: _.omit(beforeLastOp.node, 'text'),
          position: op.offset,
          path: op.path,
        }, lastOp)

        console.log('split & mark detected from:', beforeLastOp, lastOp, op, ret);
      } else if (
        lastOp.type === 'set_node' &&
        lastOps.length === 1 &&
        op.type === 'insert_text' &&
        beforeLastOp?.type === 'remove_node' &&
        Path.equals(op.path, lastOp.path) &&
        Path.equals(Path.next(op.path), beforeLastOp.path) &&
        isOnlyChildAndTextMatch(beforeLastOp.node, op.text, 0) &&
        isNodeEndAtPoint(dummyEditor, op.path, {
          path: op.path,
          offset: op.offset + op.text.length
        })
      ) {
        // three ops, the first and the last one is for merge.
        ops.pop()
        popLastOp(ops)

        ret.splice(0, 1, lastOp, {
          type: 'merge_node',
          properties: _.omit(beforeLastOp.node, 'text'),
          position: op.offset,
          path: beforeLastOp.path,
        })

        console.log('(un)mark & merge detected from:', beforeLastOp, lastOp, op, ret);
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_text' &&
        Path.hasPrevious(lastOp.path) &&
        Path.isCommon(Path.previous(lastOp.path), op.path) &&
        (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
        isNodeEndAtPoint(dummyEditor, Path.previous(lastOp.path), op)
      ) {
        popLastOp(ops)
        let newLastOp = lastOp
        ret.splice(0, 1)
        if (levelsToMove !== true) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, lastOp.path.length + (levelsToMove as number)))
          ret.splice(0, 0, {
            type: 'move_node',
            path: newPath,
            newPath: lastOp.path,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newLastOp = {
            ...lastOp,
            path: newPath
          }
        }
        let path = Path.previous(newLastOp.path)
        let node = newLastOp.node as Element
        while (path.length < op.path.length) {
          ret.splice(0, 0, {
            type: 'split_node',
            properties: _.omit(node, 'children'),
            position: op.path[path.length] + 1,
            path,
          });
          path = path.concat(op.path[path.length])
          node = node.children[0] as Element
        }
        ret.splice(0, 0, {
          type: 'split_node',
          properties: _.omit(node, 'text'),
          position: op.offset,
          path: op.path,
        })
        console.log('split_node2 detected from:', lastOp, op, ret);
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_node' &&
        Path.hasPrevious(lastOp.path) &&
        Path.isAncestor(Path.previous(lastOp.path), op.path) &&
        (matchResult = isOnlyChildAndNodesMatch(
          lastOp.node,
          ret.reduce((nodes: Node[], o, idx) => {
            if (
              o.type === 'remove_node' &&
              idx === nodes.length &&
              Path.equals(o.path, op.path)
            ) {
              nodes.push(o.node);
              nodesLength = nodes.length;
            }
            return nodes;
          }, [] as Node[]) as Node[],
          op.path.length - lastOp.path.length - 1,
          true,
        )) &&
        (isNodeEndAtPath(
          dummyEditor,
          Path.previous(lastOp.path),
          Path.previous(op.path)
        ) ||
        ret.length > nodesLength &&
        isInsertEmptyTextNodeOpWithPath(ret[nodesLength], op.path) &&
        isNodeEndAtPath(
          dummyEditor,
          Path.previous(lastOp.path),
          op.path
        ))
      ) {
        popLastOp(ops);
        const os = ret.splice(0, nodesLength);
        let newLastOp = lastOp
        if (matchResult.withPrefixEmptyText) {
          // we need finally add the empty text node.
          ret.splice(0, 0, {
            type: 'insert_node',
            path: lastOp.path.concat(Array(op.path.length - lastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
            node: matchResult.withPrefixEmptyText,
          })
        }
        if (matchResult.levelsToMove) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove))
          ret.splice(0, 0, {
            type: 'move_node',
            path: newPath,
            newPath: lastOp.path,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newLastOp = {
            ...lastOp,
            path: newPath
          }
        }
        let path = Path.previous(newLastOp.path);
        const splitPath = Path.previous(op.path); // indeed the end path after split.
        let node = lastOp.node as Element;
        while (path.length < op.path.length) {
          ret.splice(0, 0, {
            type: 'split_node',
            properties: _.omit(node, 'children'),
            position: splitPath[path.length] + 1,
            path,
          });
          path = path.concat(op.path[path.length]);
          node = node.children[0] as Element;
        }
        console.log('split_node detected from:', lastOp, os, ret);
      } else if (
        op.type === 'remove_text' &&
        beforeLastOp?.type === 'insert_node' &&
        (lastOp.type === 'remove_node' || lastOps.length > 1 && lastOp.type === 'insert_node' && lastOps[0].type === 'remove_node' && isInsertEmptyTextNodeOpWithPath(lastOp, lastOps[0].path)) &&
        (Path.equals(Path.next(op.path), lastOp.path) || Path.equals(Path.next(Path.parent(op.path)), lastOp.path)) && // later case require inline text match
        Path.hasPrevious(beforeLastOp.path) &&
        Path.isAncestor(Path.previous(beforeLastOp.path), op.path) &&
        lastOps.every((o, idx) => idx === lastOps.length - 1 || o.type === 'remove_node' && Path.equals(o.path, lastOp.path)) &&
        (matchResult = isOnlyChildWithTextAndNodesMatch(
          beforeLastOp.node,
          op.text,
          lastOps.filter(o => o.type === 'remove_node').map(o => o.type === 'remove_node' && o.node) as Node[],
          lastOp.path.length - beforeLastOp.path.length - 1,
          {
            allowPrefixEmptyTextNode: true,
            matchInlineText: op.path.length - lastOp.path.length === 1 ? (n) => Element.isElement(n) && editor.isInline(n) && !editor.isVoid(n) : undefined,
          }
        )) &&
        (lastOp.type === 'insert_node' && isNodeEndAtPath(dummyEditor, Path.previous(beforeLastOp.path), lastOp.path) ||
        lastOp.type !== 'insert_node' && isNodeEndAtPoint(dummyEditor, Path.previous(beforeLastOp.path), op))
      ) {
        ops.pop()
        popLastOp(ops)

        const ret2: Operation[] = []
        if (lastOp.type === 'insert_node') {
          // finally insert empty text node for the splited inline end.
          ret2.push(lastOp)
        }
        if (matchResult.withPrefixEmptyText) {
          // we need finally add the empty text node.
          ret2.splice(0, 0, {
            type: 'insert_node',
            path: beforeLastOp.path.concat(Array(lastOp.path.length - beforeLastOp.path.length - (matchResult.levelsToMove || 0)).fill(0)),
            node: matchResult.withPrefixEmptyText,
          })
        }
        let newBeforeLastOp = beforeLastOp
        if (matchResult.levelsToMove) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove))
          ret2.splice(0, 0, {
            type: 'move_node',
            path: newPath,
            newPath: beforeLastOp.path,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newBeforeLastOp = {
            ...beforeLastOp,
            path: newPath
          }
        }
        let path = Path.previous(newBeforeLastOp.path)
        let node = newBeforeLastOp.node as Element
        while (path.length < op.path.length) {
          ret2.splice(0, 0, {
            type: 'split_node',
            properties: _.omit(node, 'children'),
            position: op.path[path.length] + 1,
            path,
          });
          path = path.concat(op.path[path.length])
          node = node.children[matchResult.withPrefixEmptyText && path.length === lastOp.path.length ? 1 : 0] as Element
        }
        ret2.splice(0, 0, {
          type: 'split_node',
          properties: _.omit(node, 'text'),
          position: op.offset,
          path: op.path,
        })

        ret.splice(0, 1, ...ret2)

        /*ret.splice(
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
        );*/
        console.log('split_node3 detected from:', beforeLastOp, lastOps, op, ret);
      } else if (
        lastOp.type === 'remove_node' &&
        op.type === 'insert_text' &&
        Path.hasPrevious(lastOp.path) &&
        Path.isCommon(Path.previous(lastOp.path), op.path) &&
        (levelsToMove = isOnlyChildAndTextMatch(lastOp.node, op.text, op.path.length - lastOp.path.length)) &&
        isNodeEndAtPoint(dummyEditor, Path.previous(lastOp.path), {
          path: op.path,
          offset: op.offset + op.text.length
        })
      ) {
        popLastOp(ops)

        let newLastOp = lastOp
        const ret2: NodeOperation[] = []
        if (levelsToMove !== true) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, lastOp.path.length + (levelsToMove as number)))
          ret2.push({
            type: 'move_node',
            path: lastOp.path,
            newPath,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newLastOp = {
            ...lastOp,
            path: newPath
          }
        }
        let path = Path.previous(newLastOp.path)
        let node = newLastOp.node as Element
        while (path.length < op.path.length) {
          ret2.push({
            type: 'merge_node',
            properties: _.omit(node, 'children'),
            position: op.path[path.length] + 1,
            path: Path.next(path)
          });
          path = path.concat(op.path[path.length])
          node = node.children[0] as Element
        }
        ret2.push({
          type: 'merge_node',
          properties: _.omit(node, 'text'),
          position: op.offset,
          path: Path.next(op.path),
        })
        ret.splice(0, 1, ...ret2)
/*
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
        );*/
        console.log('merge_node2 detected from:', lastOp, op, ret);
      } else if (
        lastOp.type === 'remove_node' &&
        (op.type === 'insert_node' || op.type === 'remove_node') &&
        Path.hasPrevious(op.path) &&
        Path.hasPrevious(lastOp.path) &&
        Path.isAncestor(Path.previous(lastOp.path), op.path) &&
        (matchResult = isOnlyChildAndNodesMatch(
          lastOp.node,
          ret.reduce((nodes: Node[], o, idx) => {
            const isFirstOpRemoveEmptyTextNode = ret[1] && ret[1].type === 'insert_node' && isRemoveEmptyTextNodeOpWithPath(ret[0], ret[1].path)
            const firstInsertOpIdx = (isFirstOpRemoveEmptyTextNode ? 1 : 0)
            if (
              o.type === 'insert_node' &&
              idx === nodes.length + firstInsertOpIdx &&
              (idx === firstInsertOpIdx ||
                Path.equals(
                  o.path,
                  Path.next((ret[idx - 1] as NodeOperation).path)
                ))
            ) {
              nodes.push(o.node);
              nodesLength = nodes.length;
            }
            return nodes;
          }, [] as Node[]) as Node[],
          op.path.length - lastOp.path.length - 1,
          true,
        )) &&
        isNodeEndAtPath(
          dummyEditor,
          Path.previous(lastOp.path),
          Path.parent(op.path).concat(op.path[op.path.length - 1] + nodesLength! - 1)
        )
      ) {
        popLastOp(ops);

        let newLastOp = lastOp
        const ret2: NodeOperation[] = []
        if (matchResult.levelsToMove) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, lastOp.path.length + matchResult.levelsToMove))
          ret2.push({
            type: 'move_node',
            path: lastOp.path,
            newPath,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newLastOp = {
            ...lastOp,
            path: newPath
          }
        }
        if (matchResult.withPrefixEmptyText) {
          // we need remove the first empty text node before do the merge_node
          ret2.push({
            type: 'remove_node',
            path: newLastOp.path.concat(Array(op.path.length - newLastOp.path.length).fill(0)),
            node: matchResult.withPrefixEmptyText,
          })
        }
        let path = Path.previous(newLastOp.path);
        const splitPath = Path.previous(op.path); // indeed the end path after split.
        let node = newLastOp.node as Element;
        while (path.length < op.path.length) {
          ret2.push({
            type: 'merge_node',
            properties: _.omit(node, 'children'),
            position: splitPath[path.length] + 1,
            path: Path.next(path),
          } as NodeOperation);
          path = path.concat(op.path[path.length]);
          node = node.children[0] as Element;
        }

        const os = ret.splice(op.type === 'remove_node' ? 1 : 0, nodesLength, ...ret2);
        /*ret.splice(0, 0, {
          type: 'merge_node',
          properties: _.omit(lastOp.node, 'children'),
          position: op.path[op.path.length - 1],
          path: lastOp.path,
        });*/
        console.log('merge_node detected from:', lastOp, os, ret);
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'insert_text' &&
        beforeLastOp?.type === 'remove_node' &&
        Path.hasPrevious(beforeLastOp.path) &&
        Path.isAncestor(Path.previous(beforeLastOp.path), op.path) &&
        lastOps.every(
          (o, idx) =>
            o.type === 'insert_node' &&
            (idx === 0 ||
              Path.equals(
                o.path,
                Path.next((lastOps[idx - 1] as NodeOperation).path)
              ))
        ) &&
        Path.equals(Path.next(op.path), (firstOfLastOps as NodeOperation).path) &&
        (matchResult = isOnlyChildWithTextAndNodesMatch(
          beforeLastOp.node,
          op.text,
          lastOps.map((o) => o.type === 'insert_node' && o.node) as Node[],
          op.path.length - beforeLastOp.path.length - 1
        )) &&
        isNodeEndAtPath(dummyEditor, Path.previous(beforeLastOp.path), lastOp.path) &&
        isNodeEndAtPoint(dummyEditor, op.path, {
          path: op.path,
          offset: op.offset + op.text.length,
        })
      ) {
        ops.pop()
        popLastOp(ops)

        const ret2: NodeOperation[] = []
        let newBeforeLastOp = beforeLastOp
        if (matchResult.levelsToMove) {
          // XXX: need first a move down N levels op.
          const newPath = Path.next(op.path.slice(0, beforeLastOp.path.length + matchResult.levelsToMove))
          ret2.push({
            type: 'move_node',
            path: beforeLastOp.path,
            newPath,
          } as NodeOperation)
          // consider node was removed from the newPath.
          newBeforeLastOp = {
            ...beforeLastOp,
            path: newPath
          }
        }
        let path = Path.previous(newBeforeLastOp.path)
        let node = newBeforeLastOp.node as Element
        while (path.length < op.path.length) {
          ret2.push({
            type: 'merge_node',
            properties: _.omit(node, 'children'),
            position: op.path[path.length] + 1,
            path: Path.next(path)
          });
          path = path.concat(op.path[path.length])
          node = node.children[0] as Element
        }
        ret2.push({
          type: 'merge_node',
          properties: _.omit(node, 'text'),
          position: op.offset,
          path: Path.next(op.path),
        })
        ret.splice(0, 1, ...ret2)

        /*ret.splice(
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
          }
        )*/
        console.log('merge_node3 detected from:', beforeLastOp, lastOps, ret);
      } else if (
        lastOp.type === 'remove_node' &&
        op.type === 'insert_node' &&
        Element.isElement(lastOp.node) //&& // element more than text.
        //JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0
      ) {
        const relativePath = findNodeRelativePath(op.node, lastOp.node)
        if (relativePath) {
          popLastOp(ops)
          // XXX: now we do the insert first, then do the move. The original insert path is the one effected by the first remove op
          //      to insert at correct position, we need judge whether in this case, the insert path is effected by the remove op
          //      if the remove op path is obviously before insert path, but not any parent of insert, the remove does not effect the insert path
          //      if the remove op path is after insert path, also not effect, only when it's parent of insert path
          //      what if remove op path is descendant of insert path? also not effected
          let insertPath = [...op.path]
          if (Path.isCommon(lastOp.path, op.path)) {
            // insert path should change since we do not remove first, how would the remove op path change the insert path?
            insertPath[lastOp.path.length - 1] += 1
          }
          const newOp = {
            type: 'move_node',
            path: lastOp.path,
            newPath: op.path.concat(relativePath),
          } as NodeOperation
          if (relativePath.length) {
            // XXX: first empty the insert_node children, keep the op
            const parentNode = Node.get(op.node, Path.parent(relativePath)) as Element
            parentNode.children.splice(relativePath[relativePath.length - 1], 1)

            // Now the inserted node is at correct position, then we move the original deleted node
            ret.splice(0, 1, {
              ...op,
              path: insertPath
            } as NodeOperation, newOp)
          } else {
            // no need to insert node, it's a pure move op.
            ret.splice(0, 1, newOp)
          }
          console.log('move_node2 detected:', lastOp, op, relativePath, ret)
        }
      } else if (
        lastOp.type === 'insert_node' &&
        op.type === 'remove_node' &&
        Element.isElement(op.node) //&& // element more than text.
        //JSON.stringify(op.node).indexOf(JSON.stringify(lastOp.node)) >= 0
      ) {
        const relativePath = findNodeRelativePath(op.node, lastOp.node)
        if (relativePath) {
          // XXX: first move part of the node somewhere, then remove node.
          let removePath = [...op.path]
          if (Path.isCommon(lastOp.path, op.path)) {
            // insert path should change since we do not remove first, how would the remove op path change the insert path?
            removePath[lastOp.path.length - 1] -= 1
          }
          if (Path.isAncestor(removePath, lastOp.path)) {
            // inserted node is under removed node, so we do not handle this.
          } else {
            popLastOp(ops)
            ret.splice(0, 0, {
              type: 'move_node',
              path: removePath.concat(relativePath),
              newPath: lastOp.path,
            })
            if (relativePath.length) {
              // XXX: first empty the insert_node children, keep the op
              const parentNode = Node.get(op.node, Path.parent(relativePath)) as Element
              parentNode.children.splice(relativePath[relativePath.length - 1], 1)
            } else {
              // no need to remove any more since it was moved.
              ret.splice(1, 1)
            }
            console.log('move_node3 detected:', lastOp, op, relativePath, ret)
          }
        }
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
export function toSlateOps(events: Y.YEvent[], editor: Editor): Operation[] {
  const tempDoc = JSON.parse(JSON.stringify(editor.children))

  const iterate = (ops: Operation[][], event: Y.YEvent): Operation[][] => {
    return toSlateOp(event, ops, tempDoc, editor)
  }

  const ops = events.reduce(iterate, [])

  return ops.flatMap(op => op).filter(op => op)
  //return events.flatMap(event => toSlateOp(event, doc));
}
