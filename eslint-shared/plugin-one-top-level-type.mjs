/**
 * Enforces at most one top-level class | interface | type alias | enum per file.
 * Nested types (e.g. inside functions / tests) are allowed.
 */
const TYPE_KINDS = new Set([
  "ClassDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSEnumDeclaration",
]);

function isExemptFile(filename) {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "";
  return (
    base === "index.ts" ||
    base.endsWith(".fixture.ts") ||
    base.includes(".test.ts")
  );
}

function topLevelTypeDeclarations(programBody) {
  const out = [];
  for (const stmt of programBody) {
    let decl = null;
    if (
      stmt.type === "ExportNamedDeclaration" ||
      stmt.type === "ExportDefaultDeclaration"
    ) {
      decl = stmt.declaration;
    } else {
      decl = stmt;
    }
    if (decl && TYPE_KINDS.has(decl.type)) {
      out.push(decl);
    }
  }
  return out;
}

export default {
  rules: {
    "one-top-level-type": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Allow at most one top-level type (class, interface, type alias, enum) per file.",
        },
        schema: [],
      },
      create(context) {
        const filename = context.physicalFilename ?? context.filename;
        if (isExemptFile(filename)) {
          return {};
        }
        return {
          Program(node) {
            const types = topLevelTypeDeclarations(node.body);
            if (types.length <= 1) {
              return;
            }
            for (let i = 1; i < types.length; i++) {
              context.report({
                node: types[i],
                message:
                  "Only one top-level type per file (move extra types to their own files or nest inside a function).",
              });
            }
          },
        };
      },
    },
  },
};
