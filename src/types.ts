// export type lib = {
//     isLib: true;
//     hoverText: string;
// };

// export type funcParameter = {
//     name: string;
//     description: string;
//     type: string;
//     optional: boolean;
// };

// export type libFunction = lib & {
//     type: 0;
//     signature: string;
//     name: string;
//     parameters: funcParameter[];
//     returnType: string;
// };

export type TokenType =
    | "TVoidValue"
    | "TCodeblock"
    | "TUnknownVar"
    | "TVarReassign"
    | "TStringVar"
    | "TNumberVar"
    | "TBooleanVar"
    | "TArrayVar"
    | "TFuncReturn"
    | "TFunction"
    | "TForLoop"
    | "TWhileLoop"
    | "TIfStatement"
    | "TTryCatchStatement"
    | "TThrowError"
    | "TFuncCall"
    | "TVarRef"
    | "TLoopControl"
    | "TStatement"
    | "TImport";

export type Primitives = number | string | GenericBool | TVoidValue;
export type Atomic = TStatement | TVarRef | TFuncCall | TVoidValue;
export type GenericBool = boolean | Atomic | TVoidValue;

export type Block = TokenDefault & {
    body: TCodeblock;
};

export type TokenDefault = {
    type: TokenType;
    name: string;
    lineNumber: number;
    toolTip: "Jaiva Construct" | string;
    exportSymbol: boolean | string;
};

export type Token<T extends TokenDefault | null> = {
    value: T;
};

export type TVoidValue = TokenDefault & {};
export type TCodeblock = TokenDefault & {
    lines: TokenDefault[];
    lineEnd: number;
};
export type TUnknownVar = TokenDefault & {
    value: Primitives;
};
export type TVarReassign = TokenDefault & {
    value: Primitives;
};
export type TStringVar = TUnknownVar;
export type TNumberVar = TUnknownVar;
export type TBooleanVar = TUnknownVar;
export type TArrayVar = TokenDefault & {
    value: Primitives[];
};
export type TFuncReturn = TokenDefault & {
    value: Primitives;
};

export type TFunction = Block & {
    args: string[];
    isArgOptional: (boolean | string)[];
};

export type TForLoop = Block & {
    variable: TokenDefault;
    arrayVariable: TVarRef;
    condition: GenericBool;
    increment: "+" | "-" | null;
};

export type TWhileLoop = Block & {
    condition: GenericBool;
};

export type TIfStatement = Block & {
    condition: GenericBool;
    elseIfs: TIfStatement[];
    elseBody: TCodeblock;
};

/**
 * TTryCatch does not have a body block. Keep that in mind.
 */
export type TTryCatchStatement = Block & {
    try: TCodeblock;
    catch: TCodeblock;
};

export type TThrowError = TokenDefault & {
    errorMessage: string;
};

export type TFuncCall = TokenDefault & {
    functionName: Atomic | string;
    getLenght: boolean;
    args: Primitives[];
};

export type TVarRef = TokenDefault & {
    varName: Atomic | string;
    getLength: boolean;
    index: Atomic | number;
    // type: null;
};

export type TLoopControl = TokenDefault & {
    loopType: "CONTINUE" | "BREAK";
};

export type TStatement = TokenDefault & {
    lhs: GenericBool;
    op: string;
    rhs: GenericBool;
    statementType: 1 | 0;
    statement: string;
};

export type TImport = TokenDefault & {
    symbols: string[];
    filePath: string;
    fileName: string;
};
