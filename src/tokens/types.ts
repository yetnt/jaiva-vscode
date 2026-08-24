import { JDoc } from "./jdoc";

export type TokenType =
    | "TFuncCall"
    | "TVarRef"
    | "TFunction"
    | "TUnknownScalar";

export type TokenDefault = {
    type: TokenType;
    name: string;
    lineNumber: number;
    toolTip: string;
};

export type ScopedToken = {
    lineEnd: number;
} & TokenDefault;

export type SymbolToken = {
    tooltip: string | JDoc[];
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

export function isDoc(value: unknown): value is JDoc {
    return hasPropertyOf<JDoc>(value, "tagType");
}

export function hasPropertyOf<T>(value: unknown, property: string): value is T {
    return typeof value === "object" && value !== null && property in value;
}
