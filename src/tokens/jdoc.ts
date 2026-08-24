export type JDoc = {
    tagType: string;
};

type HasDescription = {
    description: string;
};

export type GenericDoc = {
    tagType: "GENERIC";
} & JDoc &
    HasDescription;

export type ParameterDoc = {
    tagType: "parameter";
    var: string;
    type: string;
    optional: boolean;
} & JDoc &
    HasDescription;

export type ReturnDoc = {
    tagType: "return";
} & JDoc &
    HasDescription;

export type FromDoc = {
    tagType: "from";
    version: string;
} & JDoc;

export type DevNoteDoc = {
    tagType: "devnote";
} & JDoc &
    HasDescription;

export type ExampleDoc = {
    tagType: "example";
    codeblock: string[];
} & JDoc;

export type DependsOnDoc = {
    tagType: "depends";
    symbols: string[];
};
