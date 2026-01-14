// src/lib/server/recoSchema.ts
export const recommendationOutputJsonSchema = {
  name: "RecommendationOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["top_picks", "alternatives", "meta"],
    properties: {
      top_picks: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["subtype_id","subtype_name","score","confidence","reasons","warnings","routine","copy"],
          properties: {
            subtype_id: { type: "string" },
            subtype_name: { type: "string" },
            score: { type: "number" },
            confidence: { type: "number", minimum: 0, maximum: 1 },

            reasons: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["tag","why"],
                properties: {
                  tag: { type: "string" },
                  why: { type: "string" },
                },
              },
            },

            warnings: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["tag","text"],
                properties: {
                  tag: { type: "string" },
                  text: { type: "string" },
                },
              },
            },

            routine: {
              type: "object",
              additionalProperties: false,
              required: ["duration_min","level","steps"],
              properties: {
                duration_min: { type: "number", minimum: 5, maximum: 120 },
                level: { type: "string", enum: ["beginner","intermediate","advanced"] },
                steps: {
                  type: "array",
                  minItems: 2,
                  maxItems: 20,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name","min"],
                    properties: {
                      name: { type: "string" },
                      min: { type: "number", minimum: 1, maximum: 60 },
                    },
                  },
                },
              },
            },

            copy: {
              type: "object",
              additionalProperties: false,
              required: ["title","summary","reason_lines"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                reason_lines: {
                  type: "array",
                  minItems: 1,
                  maxItems: 6,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },

      alternatives: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["subtype_id","subtype_name","score","why_short"],
          properties: {
            subtype_id: { type: "string" },
            subtype_name: { type: "string" },
            score: { type: "number" },
            why_short: { type: "string" },
          },
        },
      },

      meta: {
        type: "object",
        additionalProperties: false,
        required: ["computed_tags_top","explain"],
        properties: {
          computed_tags_top: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["tag","score"],
              properties: {
                tag: { type: "string" },
                score: { type: "number" },
              },
            },
          },
          explain: { type: "string" },
        },
      },
    },
  },
} as const;
