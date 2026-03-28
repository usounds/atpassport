import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _domainSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.atpassport.verify.list#domain"),
  ),
  domain: /*#__PURE__*/ v.actorIdentifierString(),
  handle: /*#__PURE__*/ v.actorIdentifierString(),
  isPublic: /*#__PURE__*/ v.boolean(),
  method: /*#__PURE__*/ v.string<"file" | "oauth" | (string & {})>(),
  status: /*#__PURE__*/ v.string<
    "approved" | "pending" | "rejected" | (string & {})
  >(),
  verifiedAt: /*#__PURE__*/ v.datetimeString(),
});
const _mainSchema = /*#__PURE__*/ v.query("net.atpassport.verify.list", {
  params: /*#__PURE__*/ v.object({}),
  output: {
    type: "lex",
    get schema() {
      return outputSchema;
    },
  },
});
const _outputSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.atpassport.verify.list#output"),
  ),
  get domains() {
    return /*#__PURE__*/ v.array(domainSchema);
  },
  error: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
  success: /*#__PURE__*/ v.boolean(),
});

type domain$schematype = typeof _domainSchema;
type main$schematype = typeof _mainSchema;
type output$schematype = typeof _outputSchema;

export interface domainSchema extends domain$schematype {}
export interface mainSchema extends main$schematype {}
export interface outputSchema extends output$schematype {}

export const domainSchema = _domainSchema as domainSchema;
export const mainSchema = _mainSchema as mainSchema;
export const outputSchema = _outputSchema as outputSchema;

export interface Domain extends v.InferInput<typeof domainSchema> {}
export interface Output extends v.InferInput<typeof outputSchema> {}

export interface $params extends v.InferInput<mainSchema["params"]> {}
export type $output = v.InferXRPCBodyInput<mainSchema["output"]>;

declare module "@atcute/lexicons/ambient" {
  interface XRPCQueries {
    "net.atpassport.verify.list": mainSchema;
  }
}
