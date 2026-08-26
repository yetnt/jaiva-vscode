import { JDoc, toMarkdown } from "./jdoc";

export type TokenType =
    | "TFuncCall"
    | "TVarRef"
    | "TFunction"
    | "TUnknownScalar";

const needed = [
    "TFuncCall",
    "TVarRef",
    "TFunction",
    "TUnknownScalar",
    "TBooleanVar",
    "TArrayVar",
    "TStringVar",
    "TNumberVar",
    "TImport",
];

export type LineRange = [number, number] | -1;

export type TokenDefault = {
    type: string | TokenType;
    name: string;
    lineNumber: number;
    toolTip: string | JDoc[];
    within: LineRange;
};

export type ImportToken = {
    filePath: string;
    fileName: string;
    isLib: boolean;
    symbols: string[];
} & TokenDefault;

export type ScopedToken = {
    lineEnd: number;
} & TokenDefault;

export type SymbolToken = {
    exportSymbol: boolean;
} & TokenDefault;

type JSONObject = Record<string, unknown>;

// an actual scoped token has a "body" propery
// and that "lines" property has the metadata we want.

export function toScopedToken(
    value: unknown,
): [ScopedToken, JSONObject[]] | null {
    if (typeof value !== "object" || value === null || !("body" in value)) {
        return null;
    }

    const { body, ...simplified } = value;

    if (typeof body !== "object" || body === null || !("lines" in body)) {
        return null;
    }

    // at this poinr it definitely has the rest.

    type Body = {
        lines: JSONObject[];
        lineEnd: number;
    };

    const b = body as Body;

    // if it has body it absolutely has lines
    // if it doesnt. life.

    return [
        {
            ...simplified,
            lineEnd: b.lineEnd,
        } as ScopedToken,
        b.lines,
    ];
}

export type TFunction = {
    args: string[];
    isArgOptional: boolean[];
    varArgs: boolean;
} & SymbolToken &
    ScopedToken;

export type TVarRef = {
    type: "TVarRef";
    varName: string;
    getLength: boolean;
    spreadArr: boolean;
} & TokenDefault;

export type SpecialToken = {
    sortText: "0_" | "1_" | "2_";
} & TokenDefault;

export type FunctionArgument = {
    argumentType: "V~" | "F~";
} & SpecialToken;

export type TFuncCall = {
    type: "TFuncCall";
    functionName: string;
    getLength: boolean;
    spreadArr: boolean;
} & TokenDefault;

export type TForLoop = {
    arrayVariable: TokenDefault | null;
    variable: TokenDefault | null;
} & ScopedToken;

export function isDoc(value: unknown): value is JDoc {
    return hasPropertyOf<JDoc>(value, "tagType");
}

export function hasPropertyOf<T>(value: unknown, property: string): value is T {
    return typeof value === "object" && value !== null && property in value;
}

export function isTheTokensWeNeed(token: TokenDefault): boolean {
    return needed.includes(token.type);
}

export function docsToMarkdown(token: TokenDefault): string {
    const out: string[] = [];

    if (hasPropertyOf<SymbolToken>(token, "toolTip")) {
        if (typeof token.toolTip === "string") return token.toolTip as string;

        const doc = token.toolTip as JDoc[];
        for (const d of doc) {
            out.push(toMarkdown(d));
        }
    }

    return out.join("\n");
}
