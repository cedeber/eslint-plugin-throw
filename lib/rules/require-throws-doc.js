import { getThrowTypes } from "../utils.js";

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "enforce JSDoc @throws tag for functions that throw exceptions",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      missingThrows: "Function throws '{{type}}' but lacks a @throws tag in JSDoc.",
    },
    schema: [], // no options
    fixable: "code",
  },
  create(context) {
    /** @param {(import("estree").ArrowFunctionExpression | import("estree").FunctionExpression | import("estree").FunctionDeclaration) & import("eslint").Rule.NodeParentExtension} node */
    function checkFunctionForThrowsTag(node) {
      const sourceCode = context.sourceCode;
      const jsDocComment = sourceCode.getJSDocComment(node);
      const throwTypes = getThrowTypes(node.body.body);

      if (throwTypes.size > 0) {
        if (jsDocComment) {
          // Check if @throws tag exists
          const jsDocValue = jsDocComment.value;
          const hasThrowsTag = jsDocValue.includes("@throws");

          if (hasThrowsTag) {
            const throwsTag = jsDocComment.value.includes(
              `@throws {${[...throwTypes].join(", ")}}`,
            );

            if (!throwsTag) {
              context.report({
                node,
                messageId: "missingThrows",
                data: { type: [...throwTypes].join(", ") },
              });
            }
          } else {
            // Detect if jsDocValue is single or multi-line
            const isMultiLine = jsDocValue.includes("\n");

            context.report({
              node,
              messageId: "missingThrows",
              data: { type: [...throwTypes].join(", ") },
              fix(fixer) {
                const jsDoc = `@throws {${[...throwTypes].join(", ")}}`;

                // Calculate indentation
                const line = sourceCode.lines[node.loc.start.line - 1];
                const indentation = line.match(/^\s*/)?.[0];

                const updatedJsDoc = isMultiLine
                  ? `${jsDocValue}* ${jsDoc}`
                  : `*\n ${jsDocValue}\n * ${jsDoc}`;
                return fixer.replaceText(jsDocComment, `/*${updatedJsDoc}\n${indentation} */`);
              },
            });
          }
        } else {
          context.report({
            node,
            messageId: "missingThrows",
            data: { type: [...throwTypes].join(", ") },
            fix(fixer) {
              const nodeStart = node.range[0];
              const tokenBefore = sourceCode.getTokenBefore(node, {
                filter: (token) => token.type === "Keyword", // "export" keyword
              });
              const isSameLine = tokenBefore && tokenBefore.loc.end.line === node.loc.start.line;
              const insertPosition = tokenBefore && isSameLine ? tokenBefore.range[0] : nodeStart;

              // Calculate indentation
              const line = sourceCode.lines[node.loc.start.line - 1];
              const indentation = line.match(/^\s*/)?.[0];

              const jsDoc = `/**\n${indentation} * @throws {${[...throwTypes].join(", ")}}\n${indentation} */\n${indentation}`;

              return fixer.insertTextBeforeRange([insertPosition, nodeStart], jsDoc);
            },
          });
        }
      }
    }

    return {
      ArrowFunctionExpression: checkFunctionForThrowsTag,
      FunctionDeclaration: checkFunctionForThrowsTag,
      FunctionExpression: checkFunctionForThrowsTag,
      // ExportDefaultDeclaration(node) {
      //   if (["FunctionDeclaration", "ArrowFunctionExpression"].includes(node.declaration.type)) {
      //     checkFunctionForThrowsTag(node.declaration);
      //   }
      // },
    };
  },
};
