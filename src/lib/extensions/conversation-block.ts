import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Tiptap node that preserves <div data-conversation="N" data-voices="...">
 * wrappers through the editor round-trip. Without this, StarterKit drops the
 * unknown <div> on parse — the cleaner re-wraps on every save, churning the DB
 * and stripping the AI-emitted voice map.
 */
export const ConversationBlock = Node.create({
  name: "conversationBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      conversationId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-conversation"),
        renderHTML: (attrs) =>
          attrs.conversationId
            ? { "data-conversation": attrs.conversationId }
            : {},
      },
      voices: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-voices"),
        renderHTML: (attrs) =>
          attrs.voices ? { "data-voices": attrs.voices } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-conversation]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});
