import { Mark, mergeAttributes } from "@tiptap/core";

// Two read-only marks that render <span data-diff="del"> and
// <span data-diff="ins"> coming from the AI lesson-edit diff. Styling is
// done via the data attribute in globals.css (red bg + strikethrough for
// del, green bg for ins).

export const DiffDelete = Mark.create({
  name: "diffDelete",
  inclusive: false,
  parseHTML() {
    return [{ tag: 'span[data-diff="del"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-diff": "del", class: "diff-del" }),
      0,
    ];
  },
});

export const DiffInsert = Mark.create({
  name: "diffInsert",
  inclusive: false,
  parseHTML() {
    return [{ tag: 'span[data-diff="ins"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-diff": "ins", class: "diff-ins" }),
      0,
    ];
  },
});
