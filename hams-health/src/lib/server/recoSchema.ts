// src/lib/server/recoSchema.ts

export const recommendationOutputJsonSchema = {
  name: "RecommendationOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,

    // 최상위도 strict 규칙: properties의 모든 키를 required에 포함하는 편이 안전
    // (선택 필드 만들려면 키 자체를 없애거나, 항상 빈값으로 내려오게 해야 함)
    required: ["generated_subtypes", "top_picks", "alternatives", "meta"],

    properties: {
      /** LLM이 생성한 subtype 메타(없으면 빈 배열) */
      generated_subtypes: {
        type: "array",
        minItems: 0,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "name",
            "profile_tags",
            "contra_tags",
            "goals",
            "intensity_range",
            "equipment",
            "space",
            "noise_level",
            "session_templates",
            "step_pool",
          ],
          properties: {
            id: { type: "string" },
            name: { type: "string" },

            profile_tags: { type: "array", items: { type: "string" }, minItems: 0 },
            contra_tags: { type: "array", items: { type: "string" }, minItems: 0 },
            goals: { type: "array", items: { type: "string" }, minItems: 0 },

            intensity_range: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "number", minimum: 1, maximum: 5 },
            },

            equipment: { type: "array", items: { type: "string" }, minItems: 0 },
            space: { type: "string" },
            noise_level: { type: "string" },

            /** 빠른 세션 템플릿(없으면 빈 배열) */
            session_templates: {
              type: "array",
              minItems: 0,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "duration_min", "level", "steps"],
                properties: {
                  id: { type: "string" },
                  duration_min: { type: "number", minimum: 5, maximum: 120 },
                  level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },

                  steps: {
                    type: "array",
                    minItems: 2,
                    maxItems: 20,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      // ✅ strict 규칙: properties에 있는 key 전부 required에 포함
                      required: ["id", "seconds", "phase", "title", "imgSrc"],
                      properties: {
                        id: { type: "string" },
                        seconds: { type: "number", minimum: 5, maximum: 3600 },
                        phase: {
                          type: "string",
                          enum: ["warmup", "main", "finisher", "cooldown"],
                        },
                        title: { type: "string" },
                        imgSrc: { type: "string" },
                      },
                    },
                  },
                },
              },
            },

            /** 스텝 후보 풀(없으면 빈 배열) */
            step_pool: {
              type: "array",
              minItems: 0,
              maxItems: 60,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "title", "imgSrc", "phase", "seconds_hint"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  imgSrc: { type: "string" },
                  phase: {
                    type: "string",
                    enum: ["warmup", "main", "finisher", "cooldown"],
                  },
                  seconds_hint: { type: "number", minimum: 5, maximum: 3600 },
                },
              },
            },
          },
        },
      },

      /** 최상위 추천 */
      top_picks: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "subtype_id",
            "subtype_name",
            "score",
            "confidence",
            "reasons",
            "warnings",
            "routine",
            "copy",
          ],
          properties: {
            subtype_id: { type: "string" },
            subtype_name: { type: "string" },
            score: { type: "number" },
            confidence: { type: "number", minimum: 0, maximum: 1 },

            reasons: {
              type: "array",
              minItems: 0,
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["tag", "why"],
                properties: {
                  tag: { type: "string" },
                  why: { type: "string" },
                },
              },
            },

            warnings: {
              type: "array",
              minItems: 0,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["tag", "text"],
                properties: {
                  tag: { type: "string" },
                  text: { type: "string" },
                },
              },
            },

            routine: {
              type: "object",
              additionalProperties: false,
              required: ["duration_min", "level", "steps"],
              properties: {
                duration_min: { type: "number", minimum: 5, maximum: 120 },
                level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },

                steps: {
                  type: "array",
                  minItems: 2,
                  maxItems: 20,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    // ✅ 여기도 동일하게 phase를 required에 포함
                    required: ["id", "seconds", "phase", "title", "imgSrc"],
                    properties: {
                      id: { type: "string" },
                      seconds: { type: "number", minimum: 5, maximum: 3600 },
                      phase: {
                        type: "string",
                        enum: ["warmup", "main", "finisher", "cooldown"],
                      },
                      title: { type: "string" },
                      imgSrc: { type: "string" },
                    },
                  },
                },
              },
            },

            copy: {
              type: "object",
              additionalProperties: false,
              required: ["title", "summary", "reason_lines"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                reason_lines: { type: "array", minItems: 0, maxItems: 6, items: { type: "string" } },
              },
            },
          },
        },
      },

      /** 대안(없으면 빈 배열) */
      alternatives: {
        type: "array",
        minItems: 0,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["subtype_id", "subtype_name", "score", "why_short", "routine"],
          properties: {
            subtype_id: { type: "string" },
            subtype_name: { type: "string" },
            score: { type: "number" },
            why_short: { type: "string" },

            routine: {
              type: "object",
              additionalProperties: false,
              required: ["duration_min", "level", "steps"],
              properties: {
                duration_min: { type: "number", minimum: 5, maximum: 120 },
                level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },

                steps: {
                  type: "array",
                  minItems: 2,
                  maxItems: 20,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    // ✅ 여기도 동일하게 phase를 required에 포함
                    required: ["id", "seconds", "phase", "title", "imgSrc"],
                    properties: {
                      id: { type: "string" },
                      seconds: { type: "number", minimum: 5, maximum: 3600 },
                      phase: {
                        type: "string",
                        enum: ["warmup", "main", "finisher", "cooldown"],
                      },
                      title: { type: "string" },
                      imgSrc: { type: "string" },
                    },
                  },
                },
              },
            },
            
          },
        },
      },

      /** 메타 */
      meta: {
        type: "object",
        additionalProperties: false,
        required: ["computed_tags_top", "explain"],
        properties: {
          computed_tags_top: {
            type: "array",
            minItems: 0,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["tag", "desc", "score"],
              properties: {
                tag: { type: "string" },
                desc: { type: "string" },
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
