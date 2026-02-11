"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoAuditResultSchema = void 0;
const zod_1 = require("zod");
exports.SeoAuditResultSchema = zod_1.z.object({
    strengths: zod_1.z.array(zod_1.z.string()),
    weaknesses: zod_1.z.array(zod_1.z.string()),
    quickWins: zod_1.z.array(zod_1.z.string()),
    titleRewrites: zod_1.z.array(zod_1.z.string()).length(3),
    tags: zod_1.z.array(zod_1.z.string()).length(13),
    descriptionOutline: zod_1.z.string(),
});
