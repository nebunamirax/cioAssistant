import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from "@blocknote/core";

export const workspaceBlockSchema = BlockNoteSchema.create({ blockSpecs: {
  paragraph: defaultBlockSpecs.paragraph,
  heading: defaultBlockSpecs.heading,
  bulletListItem: defaultBlockSpecs.bulletListItem,
  numberedListItem: defaultBlockSpecs.numberedListItem,
  checkListItem: defaultBlockSpecs.checkListItem,
  codeBlock: defaultBlockSpecs.codeBlock,
  quote: defaultBlockSpecs.quote,
  divider: defaultBlockSpecs.divider,
  table: defaultBlockSpecs.table
} });

export type WorkspaceBlock = PartialBlock<typeof workspaceBlockSchema.blockSchema, typeof workspaceBlockSchema.inlineContentSchema, typeof workspaceBlockSchema.styleSchema>;
