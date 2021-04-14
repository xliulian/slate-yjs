"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCursors = void 0;
const react_1 = require("react");
const slate_1 = require("slate");
const utils_1 = require("../cursor/utils");
const useCursors = (editor) => {
    const [cursors, setCursorData] = react_1.useState([]);
    react_1.useEffect(() => {
        editor.awareness.on('update', () => {
            const newCursorData = Array.from(editor.awareness.getStates())
                .filter(([clientId]) => { var _a; return clientId !== ((_a = editor.sharedType.doc) === null || _a === void 0 ? void 0 : _a.clientID); })
                .map(([, awareness]) => {
                let anchor = null;
                let focus = null;
                if (awareness.anchor) {
                    anchor = utils_1.relativePositionToAbsolutePosition(editor.sharedType, awareness.anchor);
                }
                if (awareness.focus) {
                    focus = utils_1.relativePositionToAbsolutePosition(editor.sharedType, awareness.focus);
                }
                return { anchor, focus, data: awareness };
            })
                .filter((cursor) => cursor.anchor && cursor.focus);
            setCursorData(newCursorData);
        });
    }, [editor]);
    const decorate = react_1.useCallback(([node, path]) => {
        const ranges = [];
        if (slate_1.Text.isText(node) && (cursors === null || cursors === void 0 ? void 0 : cursors.length)) {
            cursors.forEach((cursor) => {
                if (slate_1.Range.includes(cursor, path)) {
                    const { focus, anchor, data } = cursor;
                    const isFocusNode = slate_1.Path.equals(focus.path, path);
                    const isAnchorNode = slate_1.Path.equals(anchor.path, path);
                    const isForward = slate_1.Range.isForward({ anchor, focus });
                    ranges.push({
                        data,
                        isForward,
                        isCaret: isFocusNode,
                        anchor: {
                            path,
                            // eslint-disable-next-line no-nested-ternary
                            offset: isAnchorNode
                                ? anchor.offset
                                : isForward
                                    ? 0
                                    : node.text.length,
                        },
                        focus: {
                            path,
                            // eslint-disable-next-line no-nested-ternary
                            offset: isFocusNode
                                ? focus.offset
                                : isForward
                                    ? node.text.length
                                    : 0,
                        },
                    });
                }
            });
        }
        return ranges;
    }, [cursors]);
    return { decorate, cursors };
};
exports.useCursors = useCursors;
exports.default = exports.useCursors;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlQ3Vyc29ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wbHVnaW4vdXNlQ3Vyc29ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBeUQ7QUFDekQsaUNBQXFEO0FBRXJELDJDQUFxRTtBQUc5RCxNQUFNLFVBQVUsR0FBRyxDQUN4QixNQUFvQixFQUlwQixFQUFFO0lBQ0YsTUFBTSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsR0FBRyxnQkFBUSxDQUFXLEVBQUUsQ0FBQyxDQUFDO0lBRXhELGlCQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUNqQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQzNELE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxXQUFDLE9BQUEsUUFBUSxNQUFLLE1BQUEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLDBDQUFFLFFBQVEsQ0FBQSxDQUFBLEVBQUEsQ0FBQztpQkFDcEUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbEIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUVqQixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7b0JBQ3BCLE1BQU0sR0FBRywwQ0FBa0MsQ0FDekMsTUFBTSxDQUFDLFVBQVUsRUFDakIsU0FBUyxDQUFDLE1BQU0sQ0FDakIsQ0FBQztpQkFDSDtnQkFFRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7b0JBQ25CLEtBQUssR0FBRywwQ0FBa0MsQ0FDeEMsTUFBTSxDQUFDLFVBQVUsRUFDakIsU0FBUyxDQUFDLEtBQUssQ0FDaEIsQ0FBQztp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