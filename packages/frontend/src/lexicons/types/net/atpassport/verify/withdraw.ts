import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _inputSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.atpassport.verify.withdraw#input"),
  ),
  domain: /*#__PURE__*/ v.string(),
});
const _mainSchema = /*#__PURE__*/ v.procedure(
  "net.atpassport.verify.withdraw",
  {
    params: null,
    input: {
      type: "lex",
      get schema() {
        return inputSchema;
      },
    },
    output: {
      type: "lex",
      get schema() {
        return outputSchema;
      },
    },
  },
);
const _outputSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.atpassport.verify.withdraw#output"),
  ),
  error: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
  success: /*#__PURE__*/ v.boolean(),
});

type input$schematype = typeof _inputSchema;
type main$schematype = typeof _mainSchema;
type output$schematype = typeof _outputSchema;

export interface inputSchema extends input$schematype {}
export interface mainSchema extends main$schematype {}
export interface outputSchema extends output$schematype {}

export const inputSchema = _inputSchema as inputSchema;
export const mainSchema = _mainSchema as mainSchema;
export const outputSchema = _outputSchema as outputSchema;

export interface Input extends v.InferInput<typeof inputSchema> {}
export interface Output extends v.InferInput<typeof outputSchema> {}

export interface $params {}
export type $input = v.InferXRPCBodyInput<mainSchema["input"]>;
export type $output = v.InferXRPCBodyInput<mainSchema["output"]>;

declare module "@atcute/lexicons/ambient" {
  interface XRPCProcedures {
    "net.atpassport.verify.withdraw": mainSchema;
  }
}
