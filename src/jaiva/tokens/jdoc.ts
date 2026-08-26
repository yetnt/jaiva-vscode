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

import { hasPropertyOf } from "./types";

export function toMarkdown(doc: JDoc): string {
    if (hasPropertyOf<ParameterDoc>(doc, "var")) {
        return (
            " - **" +
            doc.var +
            (doc.optional ? "?" : "") +
            "** <- _" +
            doc.type +
            "_ : " +
            doc.description
        );
    } else if (hasPropertyOf<ExampleDoc>(doc, "codeblock")) {
        return "```jaiva\n" + doc.codeblock.join("\n") + "\n```";
    } else if (hasPropertyOf<DependsOnDoc>(doc, "symbols")) {
        return "> This function depends on: " + doc.symbols.join(", ") + ".";
    } else if (doc.tagType === "devnote") {
        const devn = doc as DevNoteDoc;
        return "> **_Developer Note_** : _" + devn.description + "_";
    } else if (doc.tagType === "return") {
        const ret = doc as ReturnDoc;
        return "**`Returns`** - " + ret.description;
    } else if (hasPropertyOf<FromDoc>(doc, "version")) {
        return "**`" + doc.version + "`**";
    } else if (doc.tagType === "GENERIC") {
        return (doc as GenericDoc).description;
    }
    return "Jaiva Construct";
    // if (hasPropertyOf<GenericDoc>(doc, ""))
}
